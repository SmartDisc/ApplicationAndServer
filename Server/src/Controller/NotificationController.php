<?php

namespace App\Controller;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/notifications')]
class NotificationController extends AbstractController
{
    #[Route(name: 'app_notifications_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user, NotificationRepository $notificationRepository): JsonResponse
    {
        $notifications = $notificationRepository->findAllFor($user);

        return $this->json(array_map($this->serializeNotification(...), $notifications));
    }

    #[Route('/unread-count', name: 'app_notifications_unread_count', methods: ['GET'])]
    public function unreadCount(#[CurrentUser] User $user, NotificationRepository $notificationRepository): JsonResponse
    {
        return $this->json(['count' => $notificationRepository->countUnreadFor($user)]);
    }

    #[Route('/{id}/read', name: 'app_notifications_read', methods: ['POST'])]
    public function read(
        int $id,
        #[CurrentUser] User $user,
        NotificationRepository $notificationRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $notification = $notificationRepository->find($id);

        if (!$notification instanceof Notification || $notification->getRecipient()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Notification not found.', 'code' => 'notification_not_found'], Response::HTTP_NOT_FOUND);
        }

        if (null === $notification->getReadAt()) {
            $notification->setReadAt(new DateTimeImmutable());
            $entityManager->flush();
        }

        return $this->json(['id' => $notification->getId(), 'read' => true]);
    }

    #[Route('/read-all', name: 'app_notifications_read_all', methods: ['POST'])]
    public function readAll(#[CurrentUser] User $user, NotificationRepository $notificationRepository): JsonResponse
    {
        $notificationRepository->markAllReadFor($user);

        return $this->json(['message' => 'All notifications marked as read.']);
    }

    private function serializeNotification(Notification $notification): array
    {
        return [
            'id' => $notification->getId(),
            'type' => $notification->getType(),
            'read' => null !== $notification->getReadAt(),
            'createdAt' => $notification->getCreatedAt()->format(DATE_ATOM),
            'data' => $notification->getData(),
        ];
    }
}
