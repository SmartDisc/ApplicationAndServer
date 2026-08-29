<?php

namespace App\Controller;

use App\Entity\Disc;
use App\Entity\User;
use App\Repository\DiscRepository;
use App\Serializer\DiscSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use function is_string;

#[Route('/api/discs')]
class DiscController extends AbstractController
{
    use JsonBodyTrait;

    // A hash of a password nobody can ever type, used to keep password_verify()'s
    // timing the same whether the disc exists or not — otherwise a missing disc
    // would return faster than a wrong password and leak which UUIDs are real.
    private const string DUMMY_HASH = '$2y$12$FRK4Ndm4rlS9zBSNRifxNuP/Y1FlD7C2za3ivzPV2X4/lGDK/wWvG';

    #[Route(name: 'app_discs_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user, DiscRepository $discRepository, DiscSerializer $discSerializer): JsonResponse
    {
        $discs = $discRepository->findBy(['owner' => $user]);

        return $this->json(array_map($discSerializer->disc(...), $discs));
    }

    #[Route('/shared', name: 'app_discs_shared', methods: ['GET'])]
    public function shared(#[CurrentUser] User $user, DiscSerializer $discSerializer): JsonResponse
    {
        // The inverse side of Disc::$sharedPeople — every disc someone else
        // owns but has shared access with this user.
        $discs = $user->getDiscs()->toArray();

        return $this->json(array_map($discSerializer->sharedDisc(...), $discs));
    }

    #[Route('/{id}', name: 'app_discs_rename', methods: ['PATCH'])]
    public function rename(
        string $id,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        EntityManagerInterface $entityManager,
        DiscSerializer $discSerializer,
    ): JsonResponse {
        $data = $this->decodeJsonBody($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!is_string($data['name'] ?? null)) {
            return $this->json(['error' => 'name is a required string.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        $name = trim($data['name']);
        if ('' === $name || mb_strlen($name) > 60) {
            return $this->json(['errors' => ['name' => 'Name must be between 1 and 60 characters.'], 'code' => 'invalid_disc_name'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $disc = $discRepository->find($id);

        // 404 (rather than 403) whether the disc doesn't exist or belongs to
        // someone else, so this endpoint can't be used to probe disc ownership.
        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        $disc->setName($name);
        $entityManager->flush();

        return $this->json($discSerializer->disc($disc));
    }

    #[Route('/claim', name: 'app_discs_claim', methods: ['POST'])]
    public function claim(
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        EntityManagerInterface $entityManager,
        DiscSerializer $discSerializer,
    ): JsonResponse {
        $data = $this->decodeJsonBody($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!is_string($data['id'] ?? null) || !is_string($data['password'] ?? null)) {
            return $this->json(['error' => 'id and password are required strings.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        $disc = $discRepository->find(trim($data['id']));
        $passwordValid = password_verify($data['password'], $disc?->getPassword() ?? self::DUMMY_HASH);

        if (!$disc instanceof Disc || !$passwordValid) {
            return $this->json(['errors' => ['password' => 'Invalid disc UUID or password.'], 'code' => 'invalid_disc_credentials'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (null !== $disc->getOwner()) {
            return $this->json(['errors' => ['id' => 'This disc has already been claimed.'], 'code' => 'disc_already_claimed'], Response::HTTP_CONFLICT);
        }

        $disc->setOwner($user);
        $entityManager->flush();

        return $this->json($discSerializer->disc($disc), Response::HTTP_CREATED);
    }
}
