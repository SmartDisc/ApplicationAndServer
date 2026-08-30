<?php

namespace App\Repository;

use App\Entity\Disc;
use App\Entity\DiscInvitation;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DiscInvitation>
 */
class DiscInvitationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DiscInvitation::class);
    }

    /**
     * @return list<DiscInvitation>
     */
    public function findPendingForDisc(Disc $disc): array
    {
        // The serialised shape reads the invitee's name, email and avatar, so
        // join them in rather than lazily loading one user per row.
        return $this->createQueryBuilder('i')
            ->addSelect('toUser')
            ->join('i.toUser', 'toUser')
            ->andWhere('i.disc = :disc')
            ->andWhere('i.status = :status')
            ->setParameter('disc', $disc)
            ->setParameter('status', 'pending')
            ->orderBy('i.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<DiscInvitation>
     */
    public function findPendingFor(User $toUser): array
    {
        // The serialised shape reads the disc's name and the inviter's name,
        // email and avatar, so join both in rather than lazily loading them one
        // row at a time.
        return $this->createQueryBuilder('i')
            ->addSelect('disc', 'fromUser')
            ->join('i.disc', 'disc')
            ->join('i.fromUser', 'fromUser')
            ->andWhere('i.toUser = :toUser')
            ->andWhere('i.status = :status')
            ->setParameter('toUser', $toUser)
            ->setParameter('status', 'pending')
            ->orderBy('i.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Whether a disc invitation is outstanding between two users, in either
     * direction and for any disc.
     */
    public function hasPendingBetween(User $a, User $b): bool
    {
        $rows = $this->createQueryBuilder('i')
            ->select('i.id')
            ->andWhere('i.status = :status')
            ->andWhere('(i.fromUser = :a AND i.toUser = :b) OR (i.fromUser = :b AND i.toUser = :a)')
            ->setParameter('status', 'pending')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->setMaxResults(1)
            ->getQuery()
            ->getScalarResult();

        return [] !== $rows;
    }

    public function findPendingForDiscAndUser(Disc $disc, User $toUser): ?DiscInvitation
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.disc = :disc')
            ->andWhere('i.toUser = :toUser')
            ->andWhere('i.status = :status')
            ->setParameter('disc', $disc)
            ->setParameter('toUser', $toUser)
            ->setParameter('status', 'pending')
            ->getQuery()
            ->getOneOrNullResult();
    }
}
