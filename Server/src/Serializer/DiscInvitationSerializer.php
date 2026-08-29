<?php

namespace App\Serializer;

use App\Entity\DiscInvitation;

/**
 * Shapes disc invitations into the array structure returned by the invitee-side
 * disc-invitation endpoints (a different shape from the owner-side listing in
 * {@see DiscSerializer::invitation()}).
 */
class DiscInvitationSerializer
{
    public function invitation(DiscInvitation $invitation): array
    {
        $disc = $invitation->getDisc();
        $from = $invitation->getFromUser();

        return [
            'id' => $invitation->getId(),
            'discId' => $disc?->getId(),
            'discName' => $disc?->getName(),
            'fromName' => $from?->getName(),
            'fromEmail' => $from?->getEmail(),
            'createdAt' => $invitation->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
