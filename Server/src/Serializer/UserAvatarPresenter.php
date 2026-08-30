<?php

namespace App\Serializer;

use App\Entity\User;
use App\Repository\UserAvatarRepository;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Contracts\Service\ResetInterface;
use function array_key_exists;

/**
 * Adds the two avatar keys to any payload that already shows a user's name or
 * email.
 *
 * The keys carry whatever prefix their sibling name/email keys carry in the
 * same payload: plain `hasAvatar`/`avatarUrl` next to `name`/`email`,
 * `fromHasAvatar`/`fromAvatarUrl` next to `fromName`/`fromEmail`, and so on.
 *
 * Avoiding N+1: list endpoints call preload() once with every user they are
 * about to serialise, which fetches all their avatar timestamps in a single
 * query that never touches the image bytes. fields() then answers from that
 * map. A user who was not preloaded still resolves correctly — it just costs a
 * query — so forgetting preload() is a performance bug, never a correctness
 * one.
 */
class UserAvatarPresenter implements ResetInterface
{
    /**
     * user id => unix timestamp of the avatar's updated_at, or null when that
     * user is known to have no avatar.
     *
     * @var array<int, int|null>
     */
    private array $timestamps = [];

    public function __construct(
        private readonly UserAvatarRepository $userAvatarRepository,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    /**
     * @param iterable<User|null> $users
     */
    public function preload(iterable $users): void
    {
        $missing = [];

        foreach ($users as $user) {
            $id = $user?->getId();

            if (null !== $id && !array_key_exists($id, $this->timestamps)) {
                $missing[$id] = $id;
            }
        }

        if ([] === $missing) {
            return;
        }

        $found = $this->userAvatarRepository->findUpdatedAtByUserIds(array_values($missing));

        foreach ($missing as $id) {
            // A user with no avatar is absent from the result rather than
            // present-and-null, so the key has to be defaulted before ?-> —
            // which only guards a null value, not a missing key.
            $this->timestamps[$id] = ($found[$id] ?? null)?->getTimestamp();
        }
    }

    /**
     * @return array{hasAvatar: bool, avatarUrl: string|null}|array<string, bool|string|null>
     */
    public function fields(?User $user, string $prefix = ''): array
    {
        $hasKey = '' === $prefix ? 'hasAvatar' : $prefix.'HasAvatar';
        $urlKey = '' === $prefix ? 'avatarUrl' : $prefix.'AvatarUrl';

        $id = $user?->getId();
        $timestamp = null === $id ? null : $this->timestampFor($id);

        return [
            $hasKey => null !== $timestamp,
            $urlKey => null === $timestamp ? null : $this->urlFor($id, $timestamp),
        ];
    }

    public function reset(): void
    {
        // Under a worker runtime the container is reused between requests, so
        // without this a replaced avatar would keep being advertised under its
        // old ?v= timestamp and clients would never refetch it.
        $this->timestamps = [];
    }

    /**
     * Called after an upload or delete so the very response that reports the
     * change carries the new timestamp rather than a preloaded stale one.
     */
    public function forget(int $userId): void
    {
        unset($this->timestamps[$userId]);
    }

    private function timestampFor(int $userId): ?int
    {
        if (!array_key_exists($userId, $this->timestamps)) {
            $found = $this->userAvatarRepository->findUpdatedAtByUserIds([$userId]);
            $this->timestamps[$userId] = ($found[$userId] ?? null)?->getTimestamp();
        }

        return $this->timestamps[$userId];
    }

    /**
     * The ?v= cache-buster is what makes a replaced avatar appear immediately:
     * the client caches blobs by URL, so the URL has to change when the image
     * does.
     */
    private function urlFor(int $userId, int $timestamp): string
    {
        return $this->urlGenerator->generate('app_users_avatar_get', [
            'id' => $userId,
            'v' => $timestamp,
        ]);
    }
}
