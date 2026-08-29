<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ChangePasswordRequest
{
    #[Assert\NotBlank(message: 'New password is required.')]
    #[Assert\Length(
        min: 8,
        max: 4096,
        minMessage: 'Password must be at least {{ limit }} characters long.',
        maxMessage: 'Password cannot be longer than {{ limit }} characters.',
    )]
    #[Assert\Regex(
        pattern: '/[A-Z]/',
        message: 'Add an uppercase letter (A–Z).',
    )]
    #[Assert\Regex(
        pattern: '/[a-z]/',
        message: 'Add a lowercase letter (a–z).',
    )]
    #[Assert\Regex(
        pattern: '/[^A-Za-z0-9]/',
        message: 'Add a special character (!@#…).',
    )]
    public string $newPassword = '';
}
