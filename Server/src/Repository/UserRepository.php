<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /**
     * Case-insensitive partial match on email or name, excluding the given user ids.
     *
     * @param list<int> $excludeIds
     *
     * @return list<User>
     */
    public function searchByEmailOrName(string $query, array $excludeIds, int $maxResults = 10): array
    {
        $qb = $this->createQueryBuilder('u')
            ->andWhere('LOWER(u.email) LIKE :query OR LOWER(u.name) LIKE :query')
            ->setParameter('query', '%'.mb_strtolower($query).'%')
            ->orderBy('u.name', 'ASC')
            ->setMaxResults($maxResults);

        if ([] !== $excludeIds) {
            $qb->andWhere('u.id NOT IN (:excludeIds)')
                ->setParameter('excludeIds', $excludeIds);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Whether $target can be turned up by $viewer through friend search — i.e.
     * whether some query string exists that searchByEmailOrName() would return
     * $target for.
     *
     * Read searchByEmailOrName() directly above and FriendController::search()
     * before changing this. That endpoint applies NO relationship restriction:
     * it substring-matches any account's name or email on a caller-supplied
     * query of two or more characters, and its exclusion list only *removes*
     * people the viewer is already related to. So the honest answer here is
     * "yes, for every account whose name or email is at least two characters
     * long", which is every real account — searching is how you find a stranger
     * to send a friend request to, so it is meant to be open.
     *
     * That makes this the broadest clause of AvatarVoter by a wide margin. It
     * lives here, as its own predicate rather than as a bare `return true` in
     * the voter, so that if friend search is ever narrowed (to friends-of-
     * friends, or to exact email matches) avatar visibility narrows with it in
     * the same edit.
     */
    public function isDiscoverableInFriendSearch(User $viewer, User $target): bool
    {
        if ($viewer->getId() === $target->getId()) {
            return false;
        }

        $minimumQueryLength = 2;

        return mb_strlen((string) $target->getName()) >= $minimumQueryLength
            || mb_strlen((string) $target->getEmail()) >= $minimumQueryLength;
    }

    //    /**
    //     * @return User[] Returns an array of User objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('u.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?User
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
