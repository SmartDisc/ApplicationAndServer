<?php

namespace App\Controller;

use App\Entity\DiscInvitation;
use App\Entity\User;
use App\Repository\DiscInvitationRepository;
use App\Repository\NotificationRepository;
use App\Serializer\UserAvatarPresenter;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/disc-invitations')]
class DiscInvitationController extends AbstractController
{
    #[Route(name: 'app_disc_invitations_list', methods: ['GET'])]
    public function list(
        #[CurrentUser] User $user,
        DiscInvitationRepository $discInvitationRepository,
        UserAvatarPresenter $userAvatarPresenter,
    ): JsonResponse {
        $invitations = $discInvitationRepository->findPendingFor($user);

        // One avatar-metadata query for the whole list rather than one per row.
        $userAvatarPresenter->preload(array_map(
            static fn (DiscInvitation $invitation) => $invitation->getFromUser(),
            $invitations,
        ));

        return $this->json(array_map(
            fn (DiscInvitation $invitation) => $this->serializeInvitation($invitation, $userAvatarPresenter),
            $invitations,
        ));
    }

    #[Route('/{id}/accept', name: 'app_disc_invitations_accept', methods: ['POST'])]
    public function accept(
        int $id,
        #[CurrentUser] User $user,
        DiscInvitationRepository $discInvitationRepository,
        NotificationRepository $notificationRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $invitation = $discInvitationRepository->find($id);

        if (!$this->isPendingInvitationFor($invitation, $user)) {
            return $this->json(['error' => 'Invitation not found.', 'code' => 'invitation_not_found'], Response::HTTP_NOT_FOUND);
        }

        $disc = $invitation->getDisc();
        $disc->addSharedPerson($user);

        $invitation->setStatus('accepted');
        $invitation->setRespondedAt(new DateTimeImmutable());

        $owner = $disc->getOwner();
        if (null !== $owner) {
            $notificationRepository->createFor($owner, 'disc_invitation_accepted', [
                'invitationId' => $invitation->getId(),
                'discId' => $disc->getId(),
                'discName' => $disc->getName(),
                'byUserId' => $user->getId(),
                'byName' => $user->getName(),
            ]);
        }

        $entityManager->flush();

        return $this->json(['id' => $invitation->getId(), 'status' => $invitation->getStatus()]);
    }

    #[Route('/{id}/decline', name: 'app_disc_invitations_decline', methods: ['POST'])]
    public function decline(
        int $id,
        #[CurrentUser] User $user,
        DiscInvitationRepository $discInvitationRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $invitation = $discInvitationRepository->find($id);

        if (!$this->isPendingInvitationFor($invitation, $user)) {
            return $this->json(['error' => 'Invitation not found.', 'code' => 'invitation_not_found'], Response::HTTP_NOT_FOUND);
        }

        $invitation->setStatus('declined');
        $invitation->setRespondedAt(new DateTimeImmutable());
        $entityManager->flush();

        return $this->json(['id' => $invitation->getId(), 'status' => $invitation->getStatus()]);
    }

    private function isPendingInvitationFor(?DiscInvitation $invitation, User $user): bool
    {
        return $invitation instanceof DiscInvitation
            && $invitation->getToUser()?->getId() === $user->getId()
            && 'pending' === $invitation->getStatus();
    }

    private function serializeInvitation(DiscInvitation $invitation, UserAvatarPresenter $userAvatarPresenter): array
    {
        $disc = $invitation->getDisc();
        $from = $invitation->getFromUser();

        return [
            'id' => $invitation->getId(),
            'discId' => $disc?->getId(),
            'discName' => $disc?->getName(),
            'fromName' => $from?->getName(),
            'fromEmail' => $from?->getEmail(),
            // Prefixed to match the fromName/fromEmail keys beside them.
            ...$userAvatarPresenter->fields($from, 'from'),
            'createdAt' => $invitation->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
