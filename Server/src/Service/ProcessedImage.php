<?php

namespace App\Service;

use function strlen;

/**
 * The result of re-encoding an upload: bytes the server produced itself, plus
 * the type it produced them as. Nothing here is client-supplied — in particular
 * the mime type is the one we encoded to, never the one the browser sent.
 */
final class ProcessedImage
{
    public function __construct(
        public readonly string $data,
        public readonly string $mimeType,
        public readonly int $width,
        public readonly int $height,
    ) {
    }

    public function byteSize(): int
    {
        return strlen($this->data);
    }
}
