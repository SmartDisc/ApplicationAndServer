<?php

namespace App\Service;

use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * A rejected upload. Carries the HTTP status and the machine-readable `code`
 * the API already uses elsewhere, so a controller can turn it straight into the
 * same error envelope every other endpoint returns.
 */
class ImageProcessingException extends RuntimeException
{
    public function __construct(
        private readonly int $statusCode,
        private readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public static function encodingUnavailable(): self
    {
        return new self(
            Response::HTTP_INTERNAL_SERVER_ERROR,
            'image_encoding_unavailable',
            'The server has no image extension able to re-encode this upload.',
        );
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}
