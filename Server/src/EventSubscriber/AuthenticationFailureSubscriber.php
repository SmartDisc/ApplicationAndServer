<?php

namespace App\EventSubscriber;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Attaches a stable, machine-readable `code` to the JSON bodies Lexik emits for
 * authentication problems, mirroring the `code` field the API's own controllers
 * now return. Without this, login/JWT failures would ship only Lexik's numeric
 * `code` (401) plus an English `message`, which the frontend can't localize.
 */
class AuthenticationFailureSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            // Bad email/password on POST /api/login (json_login).
            Events::AUTHENTICATION_FAILURE => 'onAuthenticationFailure',
            // Missing / malformed / expired Bearer token on any ^/api endpoint.
            Events::JWT_NOT_FOUND => 'onUnauthenticated',
            Events::JWT_INVALID => 'onUnauthenticated',
            Events::JWT_EXPIRED => 'onUnauthenticated',
        ];
    }

    public function onAuthenticationFailure(AuthenticationFailureEvent $event): void
    {
        $this->attachCode($event, 'invalid_credentials', 'Invalid credentials.');
    }

    public function onUnauthenticated(AuthenticationFailureEvent $event): void
    {
        $this->attachCode($event, 'unauthenticated', 'Authentication required.');
    }

    private function attachCode(AuthenticationFailureEvent $event, string $code, string $fallbackMessage): void
    {
        $response = $event->getResponse();
        $data = [];
        if (null !== $response) {
            $decoded = json_decode((string) $response->getContent(), true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        $status = $response?->getStatusCode() ?? Response::HTTP_UNAUTHORIZED;
        $message = isset($data['message']) && is_string($data['message']) ? $data['message'] : $fallbackMessage;

        // Rebuild as a plain JSON body so the string `code` isn't clobbered by
        // Lexik's response class, which re-injects `code => <numeric status>`.
        $event->setResponse(new JsonResponse([
            'error' => $message,
            'message' => $message,
            'code' => $code,
        ], $status));
    }
}
