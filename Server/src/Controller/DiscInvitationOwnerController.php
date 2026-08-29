<?php

namespace App\Controller;

use App\Entity\Disc;
use App\Entity\DiscInvitation;
use App\Entity\User;
use App\Repository\DiscInvitationRepository;
use App\Repository\DiscRepository;
use App\Repository\FriendshipRepository;
use App\Repository\NotificationRepository;
use App\Repository\UserRepository;
use App\Serializer\DiscSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use function is_int;

/**
 * Owner-side management of the invitations for a disc the current user owns
 * (list / create / cancel). The invitee's side of the same invitations lives in
 * {@see DiscInvitationController} at the /api/disc-invitations prefix.
 */
#[Route('/api/discs')]
class DiscInvitationOwnerController extends AbstractController
{
    use JsonBodyTrait;

    #[Route('/{id}/invitations', name: 'app_discs_invitations_list', methods: ['GET'])]
    public function invitationsList(
        string $id,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscInvitationRepository $discInvitationRepository,
        DiscSerializer $discSerializer,
    ): JsonResponse {
        $disc = $discRepository->find($id);

        // 404 (rather than 403) whether the disc doesn't exist or belongs to
        // someone else, so this endpoint can't be used to probe disc ownership.
        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        $invitations = $discInvitationRepository->findPendingForDisc($disc);

        return $this->json(array_map($discSerializer->invitation(...), $invitations));
    }

    #[Route('/{id}/invitations', name: 'app_discs_invitations_create', methods: ['POST'])]
    public function invitationsCreate(
        string $id,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        UserRepository $userRepository,
        FriendshipRepository $friendshipRepository,
        DiscInvitationRepository $discInvitationRepository,
        NotificationRepository $notificationRepository,
        EntityManagerInterface $entityManager,
        DiscSerializer $discSerializer,
    ): JsonResponse {
        $disc = $discRepository->find($id);

        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        $data = $this->decodeJsonBody($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!is_int($data['friendId'] ?? null)) {
            return $this->json(['error' => 'friendId is a required integer.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        $friend = $userRepository->find($data['friendId']);

        if (!$friend instanceof User || !$friendshipRepository->isAcceptedFriend($user, $friend)) {
            return $this->json(['error' => 'That user is not one of your friends.', 'code' => 'not_your_friend'], Response::HTTP_NOT_FOUND);
        }

        if ($disc->getSharedPeople()->contains($friend) || null !== $discInvitationRepository->findPendingForDiscAndUser($disc, $friend)) {
            return $this->json(['error' => 'That user already has access to or a pending invitation for this disc.', 'code' => 'already_shared_or_invited'], Response::HTTP_CONFLICT);
        }

        $invitation = new DiscInvitation();
        $invitation->setDisc($disc);
        $invitation->setFromUser($user);
        $invitation->setToUser($friend);
        $invitation->setStatus('pending');

        $entityManager->persist($invitation);
        // Flush first so the invitation's auto-generated id is available for the
        // notification payload below.
        $entityManager->flush();

        $notificationRepository->createFor($friend, 'disc_invitation', [
            'invitationId' => $invitation->getId(),
            'discId' => $disc->getId(),
            'discName' => $disc->getName(),
            'fromUserId' => $user->getId(),
            'fromName' => $user->getName(),
        ]);

        $entityManager->flush();

        // Returns the same shape as the GET list endpoint (not just id/status):
        // the frontend appends this response directly into its pending-invites
        // list without refetching, so it needs toName/toEmail etc. up front —
        // otherwise the new row briefly renders with a blank name and a "?" avatar.
        return $this->json($discSerializer->invitation($invitation), Response::HTTP_CREATED);
    }

    #[Route('/{id}/invitations/{invitationId}', name: 'app_discs_invitations_cancel', methods: ['DELETE'])]
    public function invitationsCancel(
        string $id,
        int $invitationId,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscInvitationRepository $discInvitationRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $disc = $discRepository->find($id);

        if (!$disc instanceof Disc || $disc->getOwner()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
        }

        $invitation = $discInvitationRepository->find($invitationId);

        if (!$invitation instanceof DiscInvitation || $invitation->getDisc()?->getId() !== $disc->getId()) {
            return $this->json(['error' => 'Invitation not found.', 'code' => 'invitation_not_found'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($invitation);
        $entityManager->flush();

        return $this->json(['message' => 'Invitation cancelled.']);
    }
}
