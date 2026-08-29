<?php

namespace App\Repository;

use App\Entity\Disc;
use App\Entity\DiscThrow;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DiscThrow>
 */
class DiscThrowRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DiscThrow::class);
    }

    /** @return DiscThrow[] newest first */
    public function findByDiscOrdered(Disc $disc): array
    {
        return $this->findBy(['disc' => $disc], ['recordedAt' => 'DESC']);
    }
}
