<?php

namespace App\Service;

enum CropMode
{
    // Shrink to fit inside the target box, preserving aspect ratio. Used for
    // disc photos, where cropping would cut the disc.
    case Contain;

    // Take the largest centred square (or target-ratio rectangle) and scale
    // that to the target. Used for avatars, which render inside a circle —
    // letterboxing them would show bars through the mask.
    case CenterCrop;
}
