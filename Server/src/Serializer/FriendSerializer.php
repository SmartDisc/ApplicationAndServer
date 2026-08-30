<?php

namespace App\Serializer;

use App\Entity\Friendship;
use App\Entity\User;

/**
 * Shapes friendships into the array structures returned by the friend endpoints
 * (accepted friends, incoming requests and sent requests).
 *
 * The avatar keys take the same prefix as the name/email keys beside them, so
 * they read as part of the same person: plain in friend() and searchResult(),
 * `from*` in request(), `to*` in sentRequest(). Callers that serialise a list
 * must preload the presenter first — see FriendController.
 */
class FriendSerializer
{
    public function __construct(
        private readonly UserAvatarPresenter $avatarPresenter,
    ) {
    }

    public function friend(Friendship $friendship, User $viewer): array
    {
        $other = $friendship->getRequester()?->getId() === $viewer->getId()
            ? $friendship->getAddressee()
            : $friendship->getRequester();

        return [
            'friendshipId' => $friendship->getId(),
            'id' => $other?->getId(),
            'name' => $other?->getName(),
            'email' => $other?->getEmail(),
            ...$this->avatarPresenter->fields($other),
        ];
    }

    public function request(Friendship $friendship): array
    {
        $from = $friendship->getRequester();

        return [
            'id' => $friendship->getId(),
            'fromUserId' => $from?->getId(),
            'fromName' => $from?->getName(),
            'fromEmail' => $from?->getEmail(),
            ...$this->avatarPresenter->fields($from, 'from'),
            'createdAt' => $friendship->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    public function sentRequest(Friendship $friendship): array
    {
        $to = $friendship->getAddressee();

        return [
            'id' => $friendship->getId(),
            'toUserId' => $to?->getId(),
            'toName' => $to?->getName(),
            'toEmail' => $to?->getEmail(),
            ...$this->avatarPresenter->fields($to, 'to'),
            'createdAt' => $friendship->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    /**
     * A candidate returned by friend search. Kept here rather than inline in
     * the controller so the search shape stays beside the shapes it is meant to
     * match.
     */
    public function searchResult(User $found): array
    {
        return [
            'id' => $found->getId(),
            'name' => $found->getName(),
            'email' => $found->getEmail(),
            ...$this->avatarPresenter->fields($found),
        ];
    }
}
