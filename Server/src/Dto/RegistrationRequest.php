<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class RegistrationRequest
{
    #[Assert\NotBlank(message: 'Email is required.')]
    #[Assert\Email(message: 'Please provide a valid email address.', mode: Assert\Email::VALIDATION_MODE_STRICT)]
    #[Assert\Length(max: 180, maxMessage: 'Email cannot be longer than {{ limit }} characters.')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Password is required.')]
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
    public string $password = '';

    #[Assert\NotBlank(message: 'Name is required.')]
    #[Assert\Length(
        min: 2,
        max: 50,
        minMessage: 'Name must be at least {{ limit }} characters long.',
        maxMessage: 'Name cannot be longer than {{ limit }} characters.',
    )]
    #[Assert\Regex(
        pattern: '/^[\p{L}\p{M} .\'-]+$/u',
        message: 'Name may only contain letters, spaces, apostrophes and hyphens.',
    )]
    public string $name = '';
}
