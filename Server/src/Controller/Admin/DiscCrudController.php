<?php

namespace App\Controller\Admin;

use App\Entity\Disc;
use App\Repository\DiscRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/discs')]
#[IsGranted('ROLE_ADMIN')]
final class DiscCrudController extends AbstractController
{
    private const string REVEAL_SESSION_KEY = 'admin_disc_reveal';

    #[Route(name: 'app_admin_disc_crud_index', methods: ['GET'])]
    public function index(DiscRepository $discRepository): Response
    {
        return $this->render('admin/disc_crud/index.html.twig', [
            'discs' => $discRepository->findBy([], ['id' => 'ASC']),
        ]);
    }

    #[Route(name: 'app_admin_disc_crud_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $entityManager): Response
    {
        if (!$this->isCsrfTokenValid('create_disc', $request->getPayload()->getString('_token'))) {
            throw $this->createAccessDeniedException('Invalid CSRF token.');
        }

        $disc = new Disc();
        $plainPassword = $disc->getPassword();
        $disc->setPassword(password_hash($plainPassword, PASSWORD_BCRYPT));

        $entityManager->persist($disc);
        $entityManager->flush();

        // Stashed in the session so it survives the redirect but can only ever
        // be read back once — the plaintext password is never persisted.
        $request->getSession()->set(self::REVEAL_SESSION_KEY, [
            'id' => $disc->getId(),
            'password' => $plainPassword,
        ]);

        return $this->redirectToRoute('app_admin_disc_crud_created', ['id' => $disc->getId()]);
    }

    #[Route('/{id}/created', name: 'app_admin_disc_crud_created', methods: ['GET'])]
    public function created(string $id, Request $request): Response
    {
        $session = $request->getSession();
        $reveal = $session->get(self::REVEAL_SESSION_KEY);
        $session->remove(self::REVEAL_SESSION_KEY);

        if (!\is_array($reveal) || $reveal['id'] !== $id) {
            // Either already shown once or this is a stale/guessed URL — there is
            // nothing left to reveal, so just send the admin back to the list.
            return $this->redirectToRoute('app_admin_disc_crud_index');
        }

        return $this->render('admin/disc_crud/created.html.twig', [
            'id' => $reveal['id'],
            'password' => $reveal['password'],
        ]);
    }

    #[Route('/{id}/delete', name: 'app_admin_disc_crud_delete', methods: ['POST'])]
    public function delete(Request $request, Disc $disc, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete'.$disc->getId(), $request->getPayload()->getString('_token'))) {
            $entityManager->remove($disc);
            $entityManager->flush();
        }

        return $this->redirectToRoute('app_admin_disc_crud_index');
    }
}
