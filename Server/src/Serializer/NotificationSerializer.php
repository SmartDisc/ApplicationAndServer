<?php

namespace App\Serializer;

use App\Entity\Notification;

/**
 * Shapes notifications into the array structure returned by the notification
 * listing endpoint.
 */
class NotificationSerializer
{
    public function notification(Notification $notification): array
    {
        return [
            'id' => $notification->getId(),
            'type' => $notification->getType(),
            'read' => null !== $notification->getReadAt(),
            'createdAt' => $notification->getCreatedAt()->format(DATE_ATOM),
            'data' => $notification->getData(),
        ];
    }
}
