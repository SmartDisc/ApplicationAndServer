<?php

namespace App\Serializer;

use App\Entity\DiscThrow;

/**
 * Shapes DiscThrow entities into the array structure returned by the disc
 * throw endpoints.
 */
class DiscThrowSerializer
{
    public function discThrow(DiscThrow $throw): array
    {
        $recordedBy = $throw->getRecordedBy();

        return [
            'id' => $throw->getId(),
            'discId' => $throw->getDisc()->getId(),
            'name' => $throw->getName(),
            'isAutoNamed' => $throw->isAutoNamed(),
            'recordedAt' => $throw->getRecordedAt()->format(DATE_ATOM),
            'durationMs' => $throw->getDurationMs(),
            'maxRpm' => $throw->getMaxRpm(),
            'maxAltM' => $throw->getMaxAltM(),
            'maxAccelMagnitude' => $throw->getMaxAccelMagnitude(),
            'maxSpeedKmh' => $throw->getMaxSpeedKmh(),
            'series' => $throw->getSeries(),
            'sampleCount' => $throw->getSampleCount(),
            'isFavorite' => $throw->isFavorite(),
            'recordedById' => $recordedBy?->getId(),
            'recordedByName' => $recordedBy?->getName(),
        ];
    }
}
