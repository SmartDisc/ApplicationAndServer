<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared helper for decoding a JSON request body. Returns the decoded array, or
 * a ready-to-return 400 JsonResponse when the body is not valid JSON — mirroring
 * the identical try/catch that previously appeared in each controller.
 */
trait JsonBodyTrait
{
    private function decodeJsonBody(Request $request): array|JsonResponse
    {
        try {
            return $request->toArray();
        } catch (JsonException) {
            return $this->json(['error' => 'Request body must be valid JSON.', 'code' => 'invalid_json_body'], Response::HTTP_BAD_REQUEST);
        }
    }
}
