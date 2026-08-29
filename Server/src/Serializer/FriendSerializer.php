<?php

namespace App\Serializer;

use App\Entity\Friendship;
use App\Entity\User;

/**
 * Shapes friendships into the array structures returned by the friend endpoints
 * (accepted friends, incoming requests and sent requests).
 */
class FriendSerializer
{
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
            'createdAt' => $friendship->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
