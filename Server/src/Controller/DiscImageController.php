<?php

namespace App\Controller;

use App\Entity\Disc;
use App\Entity\DiscImage;
use App\Entity\User;
use App\Repository\DiscImageRepository;
use App\Repository\DiscRepository;
use App\Serializer\DiscSerializer;
use App\Service\CropMode;
use App\Service\ImageProcessingException;
use App\Service\ImageProcessor;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * The disc image endpoints. Uploads are multipart rather than JSON, so
 * JsonBodyTrait does not apply here — the single field is read off
 * $request->files instead.
 */
#[Route('/api/discs')]
class DiscImageController extends AbstractController
{
    // Disc photos are shown large enough to read a stamp off, so they get more
    // room than an avatar does.
    private const int MAX_IMAGE_DIMENSION = 800;
    private const int TARGET_QUALITY = 80;
    private const int MAX_STORED_BYTES = 200 * 1024;

    #[Route('/{id}/image', name: 'app_disc_image_upload', methods: ['POST'])]
    public function upload(
        string $id,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscImageRepository $discImageRepository,
        ImageProcessor $processor,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $disc = $this->resolveOwnedDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $file = $request->files->get('image');
        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'A multipart image field is required.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $processor->assertUploadAcceptable($file);
            // Contain-fit rather than cropped: a disc photo cropped to a square
            // would cut the disc. Avatars use the same processor with
            // CropMode::CenterCrop — see UserAvatarController.
            $processed = $processor->process(
                $file->getPathname(),
                self::MAX_IMAGE_DIMENSION,
                self::MAX_IMAGE_DIMENSION,
                CropMode::Contain,
                self::TARGET_QUALITY,
                self::MAX_STORED_BYTES,
            );
        } catch (ImageProcessingException $exception) {
            return $this->json(['errors' => ['image' => $exception->getMessage()], 'code' => $exception->getErrorCode()], $exception->getStatusCode());
        }

        $image = $discImageRepository->findOneByDisc($disc);
        if ($image instanceof DiscImage) {
            $image->replace($processed->data, $processed->mimeType, $processed->width, $processed->height);
        } else {
            $image = new DiscImage($disc, $processed->data, $processed->mimeType, $processed->width, $processed->height);
            $entityManager->persist($image);
        }

        $entityManager->flush();

        $updatedAt = $image->getUpdatedAt();

        return $this->json([
            'hasImage' => true,
            'imageUrl' => DiscSerializer::imageUrl($disc->getId(), $updatedAt),
            'imageUpdatedAt' => $updatedAt->format(DATE_ATOM),
        ]);
    }

    #[Route('/{id}/image', name: 'app_disc_image_delete', methods: ['DELETE'])]
    public function delete(
        string $id,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscImageRepository $discImageRepository,
        EntityManagerInterface $entityManager,
    ): Response {
        $disc = $this->resolveOwnedDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $image = $discImageRepository->findOneByDisc($disc);
        if ($image instanceof DiscImage) {
            $entityManager->remove($image);
            $entityManager->flush();
        }

        // Idempotent: deleting an image that isn't there is still a 204.
        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/{id}/image', name: 'app_disc_image_show', methods: ['GET'])]
    public function show(
        string $id,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscImageRepository $discImageRepository,
    ): Response {
        // Authorisation happens before anything reads the image row. A disc id
        // is a UUID, which is unguessable but is not an access control.
        $disc = $this->resolveAccessibleDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $metadata = $discImageRepository->findMetadataByDiscId($disc->getId());
        if (null === $metadata) {
            return $this->json(['error' => 'Disc image not found.', 'code' => 'disc_image_not_found'], Response::HTTP_NOT_FOUND);
        }

        $response = new Response();
        $response->setPrivate();
        $response->setMaxAge(31_536_000);
        $response->setImmutable();
        $response->setEtag(self::etag($metadata['updatedAt'], $metadata['byteSize']));

        // Resolve If-None-Match off the metadata alone, so a conditional hit
        // never pulls the BYTEA payload out of PostgreSQL.
        if ($response->isNotModified($request)) {
            return $response;
        }

        $image = $discImageRepository->findOneByDisc($disc);
        if (!$image instanceof DiscImage) {
            return $this->json(['error' => 'Disc image not found.', 'code' => 'disc_image_not_found'], Response::HTTP_NOT_FOUND);
        }

        // The stored mime type is the one the processor produced at re-encode
        // time; nothing the client sent ever reaches this header. nosniff stops
        // a browser from second-guessing it and running the bytes as something
        // else.
        $response->headers->set('Content-Type', $image->getMimeType());
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Disposition', 'inline');
        $response->setContent($image->getData());

        return $response;
    }

    private static function etag(\DateTimeImmutable $updatedAt, int $byteSize): string
    {
        return $updatedAt->getTimestamp().'-'.$byteSize;
    }

    // 404 (rather than 403) whether the disc doesn't exist or belongs to
    // someone else, so these endpoints can't be used to probe disc ownership —
    // mirrors DiscController::rename().
    private function resolveOwnedDisc(string $id, User $user, DiscRepository $discRepository): ?Disc
    {
        $disc = $discRepository->find($id);

        return $disc instanceof Disc && $disc->getOwner()?->getId() === $user->getId() ? $disc : null;
    }

    // Read access is wider than write access: the owner plus everyone the disc
    // is shared with — mirrors DiscThrowController::resolveAccessibleDisc().
    private function resolveAccessibleDisc(string $id, User $user, DiscRepository $discRepository): ?Disc
    {
        $disc = $discRepository->find($id);
        if (!$disc instanceof Disc) {
            return null;
        }

        $isOwner = $disc->getOwner()?->getId() === $user->getId();
        $isShared = $disc->getSharedPeople()->contains($user);

        return ($isOwner || $isShared) ? $disc : null;
    }

    private function discNotFound(): JsonResponse
    {
        return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
    }
}
