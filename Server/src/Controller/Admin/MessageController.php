<?php

namespace App\Controller\Admin;

use App\Entity\AdminMessage;
use App\Entity\User;
use App\Repository\AdminMessageRepository;
use App\Repository\NotificationRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/messages')]
#[IsGranted('ROLE_ADMIN')]
final class MessageController extends AbstractController
{
    #[Route(name: 'app_admin_message_index', methods: ['GET'])]
    public function index(AdminMessageRepository $adminMessageRepository): Response
    {
        return $this->render('admin/message/index.html.twig', [
            'messages' => $adminMessageRepository->findAllNewestFirst(),
        ]);
    }

    #[Route(name: 'app_admin_message_create', methods: ['POST'])]
    public function create(
        Request $request,
        UserRepository $userRepository,
        NotificationRepository $notificationRepository,
        EntityManagerInterface $entityManager,
    ): Response {
        if (!$this->isCsrfTokenValid('send_message', $request->getPayload()->getString('_token'))) {
            throw $this->createAccessDeniedException('Invalid CSRF token.');
        }

        $title = trim($request->getPayload()->getString('title'));
        $body = trim($request->getPayload()->getString('body'));

        if ('' === $title || '' === $body) {
            $this->addFlash('error', 'Enter both a title and a message.');

            return $this->redirectToRoute('app_admin_message_index');
        }

        /** @var User $admin */
        $admin = $this->getUser();
        $users = $userRepository->findAll();

        $message = new AdminMessage();
        $message->setTitle($title);
        $message->setBody($body);
        $message->setSentBy($admin);
        $message->setRecipientCount(count($users));

        $entityManager->persist($message);
        // Flush first so the message's auto-generated id is available for the
        // per-recipient notification payload below.
        $entityManager->flush();

        foreach ($users as $user) {
            $notificationRepository->createFor($user, 'admin_message', [
                'title' => $title,
                'body' => $body,
                'adminMessageId' => $message->getId(),
            ]);
        }
        $entityManager->flush();

        $this->addFlash('success', sprintf('Sent to %d user%s.', count($users), 1 === count($users) ? '' : 's'));

        return $this->redirectToRoute('app_admin_message_index');
    }
}
