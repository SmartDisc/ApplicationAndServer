<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserAvatar;
use App\Repository\UserAvatarRepository;
use App\Repository\UserRepository;
use App\Security\Voter\AvatarVoter;
use App\Serializer\UserAvatarPresenter;
use App\Service\CropMode;
use App\Service\ImageProcessingException;
use App\Service\ImageProcessor;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use function in_array;

/**
 * Profile pictures: upload and remove your own, read anyone's you are allowed
 * to see.
 *
 * The bytes served here are user-supplied and are shown to *other* users, so
 * they are treated as hostile throughout: the type is sniffed from the content
 * rather than taken from the filename or the Content-Type the client sent,
 * every upload is re-encoded rather than stored as received, and the GET serves
 * only the type the server itself produced, with nosniff so a browser cannot
 * decide otherwise.
 */
#[Route('/api')]
class UserAvatarController extends AbstractController
{
    // Avatars render at 34-52px in lists and occasionally larger; 512 square
    // covers every call site including a retina settings page.
    private const int MAX_EDGE = 512;
    private const int TARGET_QUALITY = 80;
    private const int MAX_STORED_BYTES = 80 * 1024;

    // The only types this endpoint will ever put in a Content-Type header.
    // ImageProcessor only ever produces WebP; the allowlist is here so that a
    // mime_type somehow corrupted in the database still cannot be turned into
    // an active content type in a victim's browser.
    private const array SERVABLE_MIME_TYPES = ['image/webp', 'image/jpeg'];

    #[Route('/me/avatar', name: 'app_me_avatar_upload', methods: ['POST'])]
    public function upload(
        Request $request,
        #[CurrentUser] User $user,
        ImageProcessor $imageProcessor,
        UserAvatarRepository $userAvatarRepository,
        UserAvatarPresenter $userAvatarPresenter,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        // Multipart, so the file comes from the upload bag — not from the JSON
        // body helper the other endpoints use.
        $file = $request->files->get('image');

        if (!$file instanceof UploadedFile) {
            // PHP discards the whole multipart body when it exceeds
            // post_max_size, leaving no file at all. Report that as the 413 it
            // really is rather than as a missing field.
            if ((int) $request->server->get('CONTENT_LENGTH', 0) > ImageProcessor::MAX_UPLOAD_BYTES) {
                return $this->json([
                    'error' => 'The image must be at most 15 MB.',
                    'code' => 'image_too_large',
                ], Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
            }

            return $this->json(['error' => 'An image file is required in the "image" field.', 'code' => 'missing_image_file'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $imageProcessor->assertUploadAcceptable($file);
            $processed = $imageProcessor->process(
                $file->getPathname(),
                self::MAX_EDGE,
                self::MAX_EDGE,
                // Avatars are masked into a circle, so letterboxing would show
                // bars through the mask — crop to the centre instead. Disc
                // photos use the same processor with CropMode::Contain.
                CropMode::CenterCrop,
                self::TARGET_QUALITY,
                self::MAX_STORED_BYTES,
            );
        } catch (ImageProcessingException $e) {
            return $this->json(['error' => $e->getMessage(), 'code' => $e->getErrorCode()], $e->getStatusCode());
        }

        $avatar = $userAvatarRepository->findOneForUser($user) ?? (new UserAvatar())->setUser($user);
        $updatedAt = new DateTimeImmutable();

        // updated_at is stored at second precision and drives the ?v= cache
        // buster, so two uploads inside the same second would otherwise produce
        // the same URL and the client would keep showing the old image.
        if (null !== $avatar->getId() && $updatedAt->getTimestamp() <= $avatar->getUpdatedAt()->getTimestamp()) {
            $updatedAt = $avatar->getUpdatedAt()->modify('+1 second');
        }

        $avatar->setData($processed->data)
            ->setMimeType($processed->mimeType)
            ->setByteSize($processed->byteSize())
            ->setWidth($processed->width)
            ->setHeight($processed->height)
            ->setUpdatedAt($updatedAt);

        $entityManager->persist($avatar);
        $entityManager->flush();

        // Drop anything the presenter memoised for this user earlier in the
        // request, so the response advertises the new timestamp.
        $userAvatarPresenter->forget((int) $user->getId());

        return $this->json([
            ...$userAvatarPresenter->fields($user),
            'avatarUpdatedAt' => $updatedAt->format(DATE_ATOM),
        ]);
    }

    #[Route('/me/avatar', name: 'app_me_avatar_delete', methods: ['DELETE'])]
    public function delete(
        #[CurrentUser] User $user,
        UserAvatarRepository $userAvatarRepository,
        UserAvatarPresenter $userAvatarPresenter,
        EntityManagerInterface $entityManager,
    ): Response {
        $avatar = $userAvatarRepository->findOneForUser($user);

        // Deleting an avatar that is already gone is a success, not a 404 —
        // the caller's intent is satisfied either way.
        if ($avatar instanceof UserAvatar) {
            $entityManager->remove($avatar);
            $entityManager->flush();
        }

        $userAvatarPresenter->forget((int) $user->getId());

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/users/{id}/avatar', name: 'app_users_avatar_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(
        int $id,
        Request $request,
        #[CurrentUser] User $user,
        UserRepository $userRepository,
        UserAvatarRepository $userAvatarRepository,
    ): Response {
        $target = $userRepository->find($id);

        // Authorisation runs before anything reads image bytes, and every
        // failure below returns the exact same 404 — "no such user", "you may
        // not see that user" and "that user has no avatar" are deliberately
        // indistinguishable. A 403 here would confirm which account ids exist
        // and let this endpoint be used to enumerate users.
        if (!$target instanceof User || !$this->isGranted(AvatarVoter::VIEW, $target)) {
            return $this->avatarNotFound();
        }

        // Metadata only: enough to answer a conditional request without ever
        // pulling the BYTEA column.
        $metadata = $userAvatarRepository->findMetadataForUser($target);

        if (null === $metadata) {
            return $this->avatarNotFound();
        }

        $response = new Response();
        $response->headers->set('Cache-Control', 'private, max-age=31536000, immutable');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->setEtag(dechex($metadata['updatedAt']->getTimestamp()));

        if ($response->isNotModified($request)) {
            return $response;
        }

        $avatar = $userAvatarRepository->find($metadata['id']);

        if (!$avatar instanceof UserAvatar) {
            return $this->avatarNotFound();
        }

        $mimeType = in_array($avatar->getMimeType(), self::SERVABLE_MIME_TYPES, true)
            ? $avatar->getMimeType()
            : 'application/octet-stream';

        $response->headers->set('Content-Type', $mimeType);
        $response->setContent($avatar->getData());

        return $response;
    }

    private function avatarNotFound(): JsonResponse
    {
        return $this->json(['error' => 'Avatar not found.', 'code' => 'avatar_not_found'], Response::HTTP_NOT_FOUND);
    }
}
