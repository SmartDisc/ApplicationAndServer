<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/users')]
#[IsGranted('ROLE_ADMIN')]
final class UserCrudController extends AbstractController
{
    #[Route(name: 'app_admin_user_crud_index', methods: ['GET'])]
    public function index(UserRepository $userRepository): Response
    {
        $admins = array_values(array_filter(
            $userRepository->findBy([], ['id' => 'ASC']),
            static fn (User $user) => in_array('ROLE_ADMIN', $user->getRoles(), true),
        ));

        return $this->render('admin/user_crud/index.html.twig', [
            'admins' => $admins,
        ]);
    }

    #[Route('/promote', name: 'app_admin_user_crud_promote', methods: ['POST'])]
    public function promote(Request $request, UserRepository $userRepository, EntityManagerInterface $entityManager): Response
    {
        if (!$this->isCsrfTokenValid('promote_by_email', $request->getPayload()->getString('_token'))) {
            throw $this->createAccessDeniedException('Invalid CSRF token.');
        }

        $email = mb_strtolower(trim($request->getPayload()->getString('email')));
        if ('' === $email) {
            $this->addFlash('error', 'Enter an email address.');

            return $this->redirectToRoute('app_admin_user_crud_index');
        }

        $user = $userRepository->findOneBy(['email' => $email]);
        if (!$user instanceof User) {
            $this->addFlash('error', sprintf('No user found with email "%s".', $email));

            return $this->redirectToRoute('app_admin_user_crud_index');
        }

        $roles = $user->getRoles();
        if (in_array('ROLE_ADMIN', $roles, true)) {
            $this->addFlash('error', sprintf('"%s" already has ROLE_ADMIN.', $user->getEmail()));

            return $this->redirectToRoute('app_admin_user_crud_index');
        }

        $roles[] = 'ROLE_ADMIN';
        $user->setRoles($roles);
        $entityManager->flush();

        $this->addFlash('success', sprintf('"%s" is now an admin.', $user->getEmail()));

        return $this->redirectToRoute('app_admin_user_crud_index');
    }

    #[Route('/{id}/demote', name: 'app_admin_user_crud_demote', methods: ['POST'])]
    public function demote(Request $request, User $user, EntityManagerInterface $entityManager): Response
    {
        if (!$this->isCsrfTokenValid('demote'.$user->getId(), $request->getPayload()->getString('_token'))) {
            throw $this->createAccessDeniedException('Invalid CSRF token.');
        }

        /** @var User $currentUser */
        $currentUser = $this->getUser();
        if ($user->getId() === $currentUser->getId()) {
            $this->addFlash('error', "You can't remove your own admin access.");

            return $this->redirectToRoute('app_admin_user_crud_index');
        }

        $roles = array_values(array_diff($user->getRoles(), ['ROLE_ADMIN']));
        $user->setRoles($roles);
        $entityManager->flush();

        $this->addFlash('success', sprintf('"%s" is no longer an admin.', $user->getEmail()));

        return $this->redirectToRoute('app_admin_user_crud_index');
    }
}
