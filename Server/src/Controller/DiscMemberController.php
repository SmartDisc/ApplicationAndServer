<?php

namespace App\Controller;

use App\Entity\Disc;
use App\Entity\User;
use App\Repository\DiscRepository;
use App\Repository\UserRepository;
use App\Serializer\DiscSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Manages the people a disc owner has shared their disc with (list / remove).
 */
#[Route('/api/discs')]
class DiscMemberController extends AbstractController
{
    #[Route('/{id}/people', name: 'app_discs_people_list', methods: ['GET'])]
    public function peopleList(
        string $id,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscSerializer $discSerializer,
    ): JsonResponse {
        $disc = $discRepository->find($id);

        // 404 (rather than 403) whether the disc doesn't exist or belongs to
        // someone else, so this endpoint can't be used to probe disc ownership.
        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json(array_map($discSerializer->person(...), $disc->getSharedPeople()->toArray()));
    }

    #[Route('/{id}/people/{userId}', name: 'app_discs_people_remove', methods: ['DELETE'])]
    public function peopleRemove(
        string $id,
        int $userId,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $disc = $discRepository->find($id);

        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        $person = $userRepository->find($userId);

        if (!$person instanceof User || !$disc->getSharedPeople()->contains($person)) {
            return $this->json(['error' => 'That person does not have access to this disc.', 'code' => 'person_no_disc_access'], Response::HTTP_NOT_FOUND);
        }

        $disc->removeSharedPerson($person);
        $entityManager->flush();

        return $this->json(['message' => 'Access removed.']);
    }
}
