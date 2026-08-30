<?php

namespace App\Serializer;

use App\Entity\Disc;
use App\Entity\DiscInvitation;
use App\Entity\User;
use App\Repository\DiscImageRepository;

/**
 * Shapes disc-related entities into the array structures returned by the disc
 * endpoints (disc CRUD, owner-side invitation management and disc membership).
 */
class DiscSerializer
{
    public function __construct(
        private readonly DiscImageRepository $discImageRepository,
        private readonly UserAvatarPresenter $avatarPresenter,
    ) {
    }

    /**
     * The URL the client points an <img> at. The `?v=` cache buster is what
     * makes a replaced image show up immediately behind the year-long,
     * immutable Cache-Control the GET endpoint sends.
     */
    public static function imageUrl(string $discId, \DateTimeImmutable $updatedAt): string
    {
        return sprintf('/api/discs/%s/image?v=%d', $discId, $updatedAt->getTimestamp());
    }

    public function person(User $person): array
    {
        return [
            'id' => $person->getId(),
            'name' => $person->getName(),
            'email' => $person->getEmail(),
            ...$this->avatarPresenter->fields($person),
        ];
    }

    /**
     * @param array<string, \DateTimeImmutable>|null $imageUpdatedAt Prefetched disc id => image timestamp
     *                                                              map; see prefetchImageUpdatedAt()
     */
    public function disc(Disc $disc, ?array $imageUpdatedAt = null): array
    {
        return [
            'id' => $disc->getId(),
            'name' => $disc->getName(),
            'sharedCount' => $disc->getSharedPeople()->count(),
            ...$this->imageFields($disc, $imageUpdatedAt),
        ];
    }

    /**
     * @param array<string, \DateTimeImmutable>|null $imageUpdatedAt Prefetched disc id => image timestamp
     *                                                              map; see prefetchImageUpdatedAt()
     */
    public function sharedDisc(Disc $disc, ?array $imageUpdatedAt = null): array
    {
        $owner = $disc->getOwner();

        return [
            'id' => $disc->getId(),
            'name' => $disc->getName(),
            'ownerName' => $owner?->getName(),
            'ownerEmail' => $owner?->getEmail(),
            ...$this->avatarPresenter->fields($owner, 'owner'),
            'sharedCount' => $disc->getSharedPeople()->count(),
            ...$this->imageFields($disc, $imageUpdatedAt),
        ];
    }

    /**
     * Loads image presence for a whole list in one query. The list endpoints
     * call this once and hand the result to every disc()/sharedDisc() call;
     * without it each disc would cost its own image lookup.
     *
     * @param Disc[] $discs
     *
     * @return array<string, \DateTimeImmutable>
     */
    public function prefetchImageUpdatedAt(array $discs): array
    {
        return $this->discImageRepository->findUpdatedAtByDiscIds(array_map(static fn (Disc $disc) => $disc->getId(), $discs));
    }

    public function invitation(DiscInvitation $invitation): array
    {
        $toUser = $invitation->getToUser();

        return [
            'id' => $invitation->getId(),
            'toUserId' => $toUser?->getId(),
            'toName' => $toUser?->getName(),
            'toEmail' => $toUser?->getEmail(),
            ...$this->avatarPresenter->fields($toUser, 'to'),
            'createdAt' => $invitation->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    /**
     * @param array<string, \DateTimeImmutable>|null $prefetched null means "not part of a list" — a single
     *                                                          disc is looked up on its own, still without
     *                                                          reading the image bytes
     *
     * @return array{hasImage: bool, imageUrl: string|null}
     */
    private function imageFields(Disc $disc, ?array $prefetched): array
    {
        $id = $disc->getId();
        $updatedAt = null === $prefetched
            ? $this->discImageRepository->findUpdatedAtByDiscId($id)
            : ($prefetched[$id] ?? null);

        return [
            'hasImage' => null !== $updatedAt,
            'imageUrl' => null === $updatedAt ? null : self::imageUrl($id, $updatedAt),
        ];
    }
}
