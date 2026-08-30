<?php

namespace App\Security\Voter;

use App\Entity\User;
use App\Repository\DiscInvitationRepository;
use App\Repository\DiscRepository;
use App\Repository\FriendshipRepository;
use App\Repository\UserRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;

/**
 * The single place that decides whether one user may see another's profile
 * picture. Everything that serves or links an avatar asks this — the rule is
 * never restated at a call site.
 *
 * Avatars are not self-only: the point of the feature is that you can see who
 * you are about to add as a friend, and who you already have contact with. The
 * clauses below are, in order, the six ways "we have contact" can be true.
 *
 * Callers must translate a denial into 404, never 403. A 403 would confirm that
 * the requested user id exists, turning this endpoint into a way to enumerate
 * accounts the caller has no other way to see.
 */
final class AvatarVoter extends Voter
{
    public const string VIEW = 'VIEW_AVATAR';

    public function __construct(
        private readonly FriendshipRepository $friendshipRepository,
        private readonly UserRepository $userRepository,
        private readonly DiscRepository $discRepository,
        private readonly DiscInvitationRepository $discInvitationRepository,
    ) {
    }

    public function supportsAttribute(string $attribute): bool
    {
        return self::VIEW === $attribute;
    }

    public function supportsType(string $subjectType): bool
    {
        return User::class === $subjectType || 'object' === $subjectType;
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::VIEW === $attribute && $subject instanceof User;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $viewer = $token->getUser();

        if (!$viewer instanceof User || !$subject instanceof User) {
            return false;
        }

        // 1. Yourself.
        if ($viewer->getId() === $subject->getId()) {
            $vote?->addReason('The avatar belongs to the current user.');

            return true;
        }

        // 2 & 3. An accepted friendship, or a friend request still awaiting an
        // answer, in either direction. findActiveBetween() covers both statuses
        // and both directions in one query.
        if (null !== $this->friendshipRepository->findActiveBetween($viewer, $subject)) {
            $vote?->addReason('The users are friends or have a pending friend request.');

            return true;
        }

        // 4. Anyone the viewer could turn up through friend search. See
        // UserRepository::isDiscoverableInFriendSearch() — today that endpoint
        // is deliberately open, so this clause is by far the broadest one.
        if ($this->userRepository->isDiscoverableInFriendSearch($viewer, $subject)) {
            $vote?->addReason('The user is discoverable through friend search.');

            return true;
        }

        // 5. They appear together on a disc: either owns one shared with the
        // other, or both are among the same disc's shared people.
        if ($this->discRepository->usersCoOccurOnAnyDisc($viewer, $subject)) {
            $vote?->addReason('The users share access to a disc.');

            return true;
        }

        // 6. A disc invitation is outstanding between them, either direction.
        if ($this->discInvitationRepository->hasPendingBetween($viewer, $subject)) {
            $vote?->addReason('A disc invitation is pending between the users.');

            return true;
        }

        return false;
    }
}
