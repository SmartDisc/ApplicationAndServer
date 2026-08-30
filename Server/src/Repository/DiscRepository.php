<?php

namespace App\Repository;

use App\Entity\Disc;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Query\Expr\Join;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Disc>
 */
class DiscRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Disc::class);
    }

    /**
     * Every disc shared *with* $user (the inverse side of Disc::$sharedPeople),
     * with the owner already joined in.
     *
     * Reading $disc->getOwner()->getName() off a lazily loaded owner costs one
     * query per disc; the fetch join collapses the list into a single query.
     *
     * @return list<Disc>
     */
    public function findSharedWith(User $user): array
    {
        return $this->createQueryBuilder('d')
            ->addSelect('o')
            ->leftJoin('d.owner', 'o')
            ->innerJoin('d.sharedPeople', 'p')
            ->andWhere('p = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    /**
     * Whether two users both appear on the same disc — as its owner or among
     * its shared people, in any combination. This is the "we have had contact
     * through a disc" half of avatar visibility.
     */
    public function usersCoOccurOnAnyDisc(User $a, User $b): bool
    {
        $rows = $this->createQueryBuilder('d')
            ->select('d.id')
            ->leftJoin('d.sharedPeople', 'pa', Join::WITH, 'pa = :a')
            ->leftJoin('d.sharedPeople', 'pb', Join::WITH, 'pb = :b')
            ->andWhere('d.owner = :a OR pa IS NOT NULL')
            ->andWhere('d.owner = :b OR pb IS NOT NULL')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->setMaxResults(1)
            ->getQuery()
            ->getScalarResult();

        return [] !== $rows;
    }

    //    /**
    //     * @return Disc[] Returns an array of Disc objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('d')
    //            ->andWhere('d.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('d.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Disc
    //    {
    //        return $this->createQueryBuilder('d')
    //            ->andWhere('d.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
