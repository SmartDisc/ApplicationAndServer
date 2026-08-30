<?php

namespace App\Service;

use GdImage;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;
use function function_exists;
use function in_array;
use function is_array;
use function strlen;

/**
 * The single image pipeline for the whole application: sniff, decode, orient,
 * crop/scale, strip metadata, re-encode, and squeeze under a byte budget.
 *
 * Every upload is fully decoded and re-encoded, never passed through. That is
 * the security boundary: a polyglot file, or a payload smuggled in a metadata
 * segment, does not survive a round trip through GD's rasteriser, and the type
 * we hand back is the type we produced, not anything the client claimed. There
 * is deliberately no "already the right format" fast path, because that path
 * would be the way around this.
 *
 * Target size, crop mode, quality and byte budget are parameters rather than
 * constants, so the two callers share one implementation:
 *   - disc photos: 800x800, CropMode::Contain, q80, 200KB
 *   - avatars:     512x512, CropMode::CenterCrop, q80, 80KB
 */
final class ImageProcessor
{
    // GD with WebP is a hard requirement of this image (see Dockerfile), so the
    // output type is not conditional.
    public const string OUTPUT_MIME_TYPE = 'image/webp';

    // Refused before a single byte is decoded.
    public const int MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

    // Walked top-down from the caller's starting quality until the encoded
    // result fits the byte budget. In practice it fits at the first rung and
    // the rest is never touched.
    private const int MIN_QUALITY = 30;
    private const int QUALITY_STEP = 10;

    // Last resort when even the bottom of the ladder overshoots: shrink and
    // walk it again. Bounded so a pathological image can't loop for long.
    private const int MAX_SHRINK_PASSES = 3;
    private const float SHRINK_FACTOR = 0.75;
    private const int MIN_OUTPUT_DIMENSION = 64;

    // GD holds a truecolor image at 4 bytes per pixel, so 20 MP is ~80 MB of
    // peak memory, which still fits a default 128M memory_limit. A decompression
    // bomb is a tiny file declaring enormous dimensions, so this is enforced
    // from the header before anything is decoded.
    private const int MAX_SOURCE_PIXELS = 20_000_000;
    private const int MAX_SOURCE_DIMENSION = 10_000;

    // What GD in this image can actually decode. HEIC is deliberately absent:
    // the contract accepts it only "if the runtime supports it", and a GD build
    // has no HEIC decoder.
    private const array DECODABLE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private const array HEIF_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

    /**
     * Upload-level checks that need the UploadedFile itself rather than its
     * bytes: whether PHP completed the upload at all, and the raw size ceiling.
     *
     * @throws ImageProcessingException when the upload is rejected (the message
     *                                  and status are safe to return to the client)
     */
    public function assertUploadAcceptable(UploadedFile $file): void
    {
        $error = $file->getError();

        if (UPLOAD_ERR_INI_SIZE === $error || UPLOAD_ERR_FORM_SIZE === $error) {
            throw new ImageProcessingException(Response::HTTP_REQUEST_ENTITY_TOO_LARGE, 'image_too_large', 'The image must be at most 15 MB.');
        }

        if (UPLOAD_ERR_OK !== $error) {
            throw new ImageProcessingException(Response::HTTP_BAD_REQUEST, 'image_upload_failed', 'The image upload did not complete.');
        }

        $size = $file->getSize();
        if (false === $size || $size <= 0) {
            throw new ImageProcessingException(Response::HTTP_BAD_REQUEST, 'image_upload_failed', 'The image upload did not complete.');
        }

        if ($size > self::MAX_UPLOAD_BYTES) {
            throw new ImageProcessingException(Response::HTTP_REQUEST_ENTITY_TOO_LARGE, 'image_too_large', 'The image must be at most 15 MB.');
        }
    }

    /**
     * Re-encodes the image at $path into WebP that fits both
     * $maxWidth x $maxHeight and $maxBytes.
     *
     * Takes a path rather than bytes so the decoders stream from disk and
     * exif_read_data() can read the real file, which is more reliable than
     * feeding it a data:// URI.
     *
     * @throws ImageProcessingException when the input is not an accepted type,
     *                                  cannot be decoded, or is absurdly large
     */
    public function process(
        string $path,
        int $maxWidth,
        int $maxHeight,
        CropMode $cropMode,
        int $quality = 80,
        int $maxBytes = 200 * 1024,
    ): ProcessedImage {
        if (!function_exists('imagewebp') || !function_exists('imagecreatefromwebp')) {
            throw ImageProcessingException::encodingUnavailable();
        }

        $mimeType = $this->sniffMimeType($path);
        $source = $this->decode($path, $mimeType);

        if ('image/jpeg' === $mimeType) {
            // Only JPEG carries an orientation flag, and it has to be honoured
            // before the re-encode drops all metadata — otherwise every photo
            // taken in portrait lands sideways.
            $source = $this->applyExifOrientation($source, $path);
        }

        $canvas = $this->resample($source, $maxWidth, $maxHeight, $cropMode);
        imagedestroy($source);

        try {
            return $this->encodeWithinBudget($canvas, $quality, $maxBytes);
        } finally {
            imagedestroy($canvas);
        }
    }

    /**
     * Decides the type from the bytes only. The upload's filename and its
     * Content-Type header are attacker-controlled and are never consulted; the
     * dimension ceiling is applied here too, off the header, before any decode.
     */
    private function sniffMimeType(string $path): string
    {
        // libmagic directly rather than UploadedFile::getMimeType(), which
        // needs symfony/mime — not a dependency of this project — and throws
        // a LogicException without it.
        $guessed = self::sniffWithFinfo($path);

        if (null !== $guessed && in_array($guessed, self::HEIF_MIME_TYPES, true)) {
            throw new ImageProcessingException(Response::HTTP_UNSUPPORTED_MEDIA_TYPE, 'unsupported_image_type', 'HEIC images are not supported by this server. Upload a JPEG, PNG or WebP.');
        }

        $info = @getimagesize($path);
        if (!is_array($info)) {
            throw new ImageProcessingException(Response::HTTP_UNSUPPORTED_MEDIA_TYPE, 'unsupported_image_type', 'The file is not a JPEG, PNG or WebP image.');
        }

        $sniffed = image_type_to_mime_type($info[2]);
        if (!in_array($sniffed, self::DECODABLE_MIME_TYPES, true)) {
            throw new ImageProcessingException(Response::HTTP_UNSUPPORTED_MEDIA_TYPE, 'unsupported_image_type', 'The file is not a JPEG, PNG or WebP image.');
        }

        // Two independent sniffers have to agree; a file that reads as one
        // format to libmagic and another to GD is exactly the polyglot shape
        // we do not want to touch.
        if (null !== $guessed && $guessed !== $sniffed) {
            throw new ImageProcessingException(Response::HTTP_UNSUPPORTED_MEDIA_TYPE, 'unsupported_image_type', 'The file is not a JPEG, PNG or WebP image.');
        }

        $this->assertSaneDimensions((int) $info[0], (int) $info[1]);

        return $sniffed;
    }

    /**
     * @return string|null null when ext-fileinfo is unavailable; getimagesize()
     *                     is still a real content sniff on its own
     */
    private static function sniffWithFinfo(string $path): ?string
    {
        if (!function_exists('finfo_open')) {
            return null;
        }

        $finfo = @finfo_open(FILEINFO_MIME_TYPE);
        if (false === $finfo) {
            return null;
        }

        // No finfo_close(): deprecated in PHP 8.5, the handle frees itself.
        $mimeType = @finfo_file($finfo, $path);

        return false === $mimeType ? null : $mimeType;
    }

    private function assertSaneDimensions(int $width, int $height): void
    {
        if ($width < 1 || $height < 1) {
            throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image_dimensions', 'The image has no usable dimensions.');
        }

        if ($width > self::MAX_SOURCE_DIMENSION || $height > self::MAX_SOURCE_DIMENSION || $width * $height > self::MAX_SOURCE_PIXELS) {
            throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image_dimensions', 'The image is too large to process. Use one under 20 megapixels.');
        }
    }

    private function decode(string $path, string $mimeType): GdImage
    {
        $image = match ($mimeType) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if (!$image instanceof GdImage) {
            throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image', 'The image could not be decoded.');
        }

        // Palette images have to become truecolor before they can be resampled
        // or given an alpha channel.
        @imagepalettetotruecolor($image);

        return $image;
    }

    private function applyExifOrientation(GdImage $image, string $path): GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        // Rotation first, then the mirror, matching the EXIF flag definitions:
        // 1 = as-is, 2 = mirror, 3 = 180, 4 = mirror vertically, 5 = 90 CW +
        // mirror, 6 = 90 CW, 7 = 270 CW + mirror, 8 = 270 CW. imagerotate()
        // turns counter-clockwise, so "90 CW" is -90 here.
        $rotated = match ($orientation) {
            3 => @imagerotate($image, 180, 0),
            5, 6 => @imagerotate($image, -90, 0),
            7, 8 => @imagerotate($image, 90, 0),
            default => $image,
        };

        if ($rotated instanceof GdImage && $rotated !== $image) {
            imagedestroy($image);
            $image = $rotated;
        }

        if (in_array($orientation, [2, 5, 7], true)) {
            @imageflip($image, IMG_FLIP_HORIZONTAL);
        } elseif (4 === $orientation) {
            @imageflip($image, IMG_FLIP_VERTICAL);
        }

        return $image;
    }

    /**
     * Draws the source into a new canvas at the target size.
     *
     * CropMode::Contain fits the whole image inside the box, preserving aspect
     * ratio. CropMode::CenterCrop takes the largest centred rectangle of the
     * box's aspect ratio and scales that up to fill it — avatars are masked
     * into a circle, so letterboxing them would show bars through the mask.
     *
     * Neither mode ever upscales: a 40x40 upload stays 40x40 rather than being
     * blown up into a blurry 512x512.
     */
    private function resample(GdImage $source, int $maxWidth, int $maxHeight, CropMode $cropMode): GdImage
    {
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);

        $cropX = 0;
        $cropY = 0;
        $cropWidth = $sourceWidth;
        $cropHeight = $sourceHeight;

        if (CropMode::CenterCrop === $cropMode) {
            $targetRatio = $maxWidth / $maxHeight;

            if ($sourceWidth / $sourceHeight > $targetRatio) {
                $cropWidth = max(1, (int) round($sourceHeight * $targetRatio));
            } else {
                $cropHeight = max(1, (int) round($sourceWidth / $targetRatio));
            }

            $cropX = intdiv($sourceWidth - $cropWidth, 2);
            $cropY = intdiv($sourceHeight - $cropHeight, 2);
        }

        $ratio = min($maxWidth / $cropWidth, $maxHeight / $cropHeight, 1.0);
        $width = max(1, (int) round($cropWidth * $ratio));
        $height = max(1, (int) round($cropHeight * $ratio));

        $canvas = imagecreatetruecolor($width, $height);
        if (!$canvas instanceof GdImage) {
            throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image', 'The image could not be resized.');
        }

        // Blending off + save-alpha on is what carries PNG/WebP transparency
        // through the resample instead of compositing it onto black.
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);

        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        if (false !== $transparent) {
            imagefilledrectangle($canvas, 0, 0, $width - 1, $height - 1, $transparent);
        }

        imagecopyresampled($canvas, $source, 0, 0, $cropX, $cropY, $width, $height, $cropWidth, $cropHeight);

        return $canvas;
    }

    private function encodeWithinBudget(GdImage $image, int $quality, int $maxBytes): ProcessedImage
    {
        $encoded = null;
        // Canvases the shrink passes create; process() owns the one passed in.
        $intermediates = [];

        try {
            for ($pass = 0; $pass < self::MAX_SHRINK_PASSES; ++$pass) {
                for ($q = $quality; $q >= self::MIN_QUALITY; $q -= self::QUALITY_STEP) {
                    $data = self::toWebp($image, $q);

                    if (null === $encoded || strlen($data) < strlen($encoded->data)) {
                        $encoded = new ProcessedImage($data, self::OUTPUT_MIME_TYPE, imagesx($image), imagesy($image));
                    }

                    if (strlen($data) <= $maxBytes) {
                        return $encoded;
                    }
                }

                $shrunkTo = (int) round(max(imagesx($image), imagesy($image)) * self::SHRINK_FACTOR);
                if ($shrunkTo < self::MIN_OUTPUT_DIMENSION) {
                    break;
                }

                // Already cropped to the target aspect by resample(), so the
                // shrink passes only ever need to contain-fit.
                $image = $this->resample($image, $shrunkTo, $shrunkTo, CropMode::Contain);
                $intermediates[] = $image;
            }
        } finally {
            foreach ($intermediates as $intermediate) {
                imagedestroy($intermediate);
            }
        }

        // Over budget even at the bottom of the ladder and the smallest size we
        // are willing to go to. Store the smallest attempt rather than losing
        // the upload.
        return $encoded ?? throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image', 'The image could not be encoded.');
    }

    private static function toWebp(GdImage $image, int $quality): string
    {
        ob_start();
        $ok = imagewebp($image, null, $quality);
        $data = (string) ob_get_clean();

        if (!$ok || '' === $data) {
            throw new ImageProcessingException(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid_image', 'The image could not be encoded.');
        }

        return $data;
    }
}
