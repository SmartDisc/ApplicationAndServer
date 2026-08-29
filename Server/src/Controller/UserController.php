<?php

namespace App\Controller;

use App\Dto\ChangePasswordRequest;
use App\Dto\RegistrationRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use LogicException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use function count;
use function is_string;

#[Route('/api')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/signup', name: 'app_signup', methods: ['POST'])]
    public function signup(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager,
    ): JsonResponse {
        try {
            $data = $request->toArray();
        } catch (JsonException) {
            return $this->json(['error' => 'Request body must be valid JSON.', 'code' => 'invalid_json_body'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_string($data['email'] ?? null) || !is_string($data['password'] ?? null) || !is_string($data['name'] ?? null)) {
            return $this->json(['error' => 'email, password and name are required strings.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        $registration = new RegistrationRequest();
        $registration->email = mb_strtolower(trim($data['email']));
        $registration->password = $data['password'];
        $registration->name = trim($data['name']);

        $violations = $this->validator->validate($registration);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(['errors' => $errors, 'code' => 'validation_failed'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (null !== $userRepository->findOneBy(['email' => $registration->email])) {
            return $this->json(['errors' => ['email' => 'An account with this email already exists.'], 'code' => 'email_already_exists'], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setEmail($registration->email);
        $user->setName($registration->name);
        $user->setPassword($passwordHasher->hashPassword($user, $registration->password));

        $entityManager->persist($user);

        try {
            $entityManager->flush();
        } catch (UniqueConstraintViolationException) {
            // Two concurrent signups raced past the findOneBy check above; the DB's unique
            // constraint is the actual source of truth for email uniqueness.
            return $this->json(['errors' => ['email' => 'An account with this email already exists.'], 'code' => 'email_already_exists'], Response::HTTP_CONFLICT);
        }

        return $this->json(['token' => $jwtManager->create($user)], Response::HTTP_CREATED);
    }

    #[Route('/login', name: 'app_login', methods: ['POST'])]
    public function login(): never
    {
        // Intercepted by the "login" firewall's json_login listener before this
        // is ever reached.
        throw new LogicException('This should never be reached.');
    }

    #[Route('/me', name: 'app_me', methods: ['GET'])]
    public function me(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'roles' => $user->getRoles(),
        ]);
    }

    #[Route('/change-password', name: 'app_change_password', methods: ['POST'])]
    public function changePassword(
        Request $request,
        #[CurrentUser] User $user,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        try {
            $data = $request->toArray();
        } catch (JsonException) {
            return $this->json(['error' => 'Request body must be valid JSON.', 'code' => 'invalid_json_body'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_string($data['currentPassword'] ?? null) || !is_string($data['newPassword'] ?? null)) {
            return $this->json(['error' => 'currentPassword and newPassword are required strings.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        if (!$passwordHasher->isPasswordValid($user, $data['currentPassword'])) {
            return $this->json(['errors' => ['currentPassword' => 'Current password is incorrect.'], 'code' => 'current_password_incorrect'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $changeRequest = new ChangePasswordRequest();
        $changeRequest->newPassword = $data['newPassword'];

        $violations = $this->validator->validate($changeRequest);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(['errors' => $errors, 'code' => 'validation_failed'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($passwordHasher->isPasswordValid($user, $changeRequest->newPassword)) {
            return $this->json(['errors' => ['newPassword' => 'New password must be different from the current password.'], 'code' => 'new_password_must_differ'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $changeRequest->newPassword));
        $entityManager->flush();

        return $this->json(['message' => 'Password updated successfully.']);
    }

    #[Route('/delete-account', name: 'app_delete_account', methods: ['DELETE'])]
    public function deleteAccount(
        Request $request,
        #[CurrentUser] User $user,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        try {
            $data = $request->toArray();
        } catch (JsonException) {
            return $this->json(['error' => 'Request body must be valid JSON.', 'code' => 'invalid_json_body'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_string($data['currentPassword'] ?? null)) {
            return $this->json(['error' => 'currentPassword is required.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        if (!$passwordHasher->isPasswordValid($user, $data['currentPassword'])) {
            return $this->json(['errors' => ['currentPassword' => 'Current password is incorrect.'], 'code' => 'current_password_incorrect'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $entityManager->remove($user);
        $entityManager->flush();

        return $this->json(['message' => 'Account deleted successfully.']);
    }
}
