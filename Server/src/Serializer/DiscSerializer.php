<?php

namespace App\Serializer;

use App\Entity\Disc;
use App\Entity\DiscInvitation;
use App\Entity\User;

/**
 * Shapes disc-related entities into the array structures returned by the disc
 * endpoints (disc CRUD, owner-side invitation management and disc membership).
 */
class DiscSerializer
{
    public function person(User $person): array
    {
        return [
            'id' => $person->getId(),
            'name' => $person->getName(),
            'email' => $person->getEmail(),
        ];
    }

    public function disc(Disc $disc): array
    {
        return [
            'id' => $disc->getId(),
            'name' => $disc->getName(),
            'sharedCount' => $disc->getSharedPeople()->count(),
        ];
    }

    public function sharedDisc(Disc $disc): array
    {
        $owner = $disc->getOwner();

        return [
            'id' => $disc->getId(),
            'name' => $disc->getName(),
            'ownerName' => $owner?->getName(),
            'ownerEmail' => $owner?->getEmail(),
            'sharedCount' => $disc->getSharedPeople()->count(),
        ];
    }

    public function invitation(DiscInvitation $invitation): array
    {
        $toUser = $invitation->getToUser();

        return [
            'id' => $invitation->getId(),
            'toUserId' => $toUser?->getId(),
            'toName' => $toUser?->getName(),
            'toEmail' => $toUser?->getEmail(),
            'createdAt' => $invitation->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
