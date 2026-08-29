<?php

namespace App\Repository;

use App\Entity\Friendship;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Friendship>
 */
class FriendshipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Friendship::class);
    }

    /**
     * The Friendship row (in either direction) between two users that is either
     * accepted, or still pending a response, regardless of who requested it.
     */
    public function findActiveBetween(User $a, User $b): ?Friendship
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.status IN (:statuses)')
            ->andWhere('(f.requester = :a AND f.addressee = :b) OR (f.requester = :b AND f.addressee = :a)')
            ->setParameter('statuses', ['pending', 'accepted'])
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return list<Friendship>
     */
    public function findAcceptedFor(User $user): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.status = :status')
            ->andWhere('f.requester = :user OR f.addressee = :user')
            ->setParameter('status', 'accepted')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<Friendship>
     */
    public function findPendingFor(User $addressee): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.addressee = :addressee')
            ->andWhere('f.status = :status')
            ->setParameter('addressee', $addressee)
            ->setParameter('status', 'pending')
            ->orderBy('f.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<Friendship>
     */
    public function findSentPendingFor(User $requester): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.requester = :requester')
            ->andWhere('f.status = :status')
            ->setParameter('requester', $requester)
            ->setParameter('status', 'pending')
            ->orderBy('f.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function isAcceptedFriend(User $a, User $b): bool
    {
        $friendship = $this->createQueryBuilder('f')
            ->andWhere('f.status = :status')
            ->andWhere('(f.requester = :a AND f.addressee = :b) OR (f.requester = :b AND f.addressee = :a)')
            ->setParameter('status', 'accepted')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->getQuery()
            ->getOneOrNullResult();

        return null !== $friendship;
    }

    /**
     * IDs of every user who is either already an accepted friend of $user, or has a
     * pending Friendship with $user in either direction (including $user's own id).
     * Used to exclude "not worth showing" people from friend search results.
     *
     * @return list<int>
     */
    public function findRelatedUserIds(User $user): array
    {
        $rows = $this->createQueryBuilder('f')
            ->select('IDENTITY(f.requester) as requesterId', 'IDENTITY(f.addressee) as addresseeId')
            ->andWhere('f.status IN (:statuses)')
            ->andWhere('f.requester = :user OR f.addressee = :user')
            ->setParameter('statuses', ['accepted', 'pending'])
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $ids = [$user->getId()];
        foreach ($rows as $row) {
            $ids[] = (int) $row['requesterId'];
            $ids[] = (int) $row['addresseeId'];
        }

        return array_values(array_unique($ids));
    }
}
