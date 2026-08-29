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
        return $this->createQueryBuilder('i')
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
        return $this->createQueryBuilder('i')
            ->andWhere('i.toUser = :toUser')
            ->andWhere('i.status = :status')
            ->setParameter('toUser', $toUser)
            ->setParameter('status', 'pending')
            ->orderBy('i.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
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
