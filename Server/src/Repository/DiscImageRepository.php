<?php

namespace App\Repository;

use App\Entity\Disc;
use App\Entity\DiscImage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Query;
use Doctrine\Persistence\ManagerRegistry;
use function is_string;

/**
 * @extends ServiceEntityRepository<DiscImage>
 *
 * Every read here except findOneByDisc() selects scalar columns only, so the
 * BYTEA payload is never pulled out of PostgreSQL just to answer "does this
 * disc have an image, and when did it change?".
 */
class DiscImageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DiscImage::class);
    }

    /**
     * Presence + timestamp for a whole page of discs in one query. This is what
     * keeps DiscSerializer from doing an image lookup per disc on the list
     * endpoints.
     *
     * @param list<string> $discIds
     *
     * @return array<string, \DateTimeImmutable> disc id => image updated_at, missing key = no image
     */
    public function findUpdatedAtByDiscIds(array $discIds): array
    {
        if ([] === $discIds) {
            return [];
        }

        $rows = $this->createQueryBuilder('i')
            ->select('IDENTITY(i.disc) AS discId', 'i.updatedAt AS updatedAt')
            ->andWhere('i.disc IN (:discIds)')
            ->setParameter('discIds', $discIds)
            ->getQuery()
            ->getScalarResult()
        ;

        $updatedAtByDiscId = [];
        foreach ($rows as $row) {
            $updatedAt = self::asDateTimeImmutable($row['updatedAt']);
            if (null !== $updatedAt) {
                $updatedAtByDiscId[(string) $row['discId']] = $updatedAt;
            }
        }

        return $updatedAtByDiscId;
    }

    public function findUpdatedAtByDiscId(string $discId): ?\DateTimeImmutable
    {
        return $this->findUpdatedAtByDiscIds([$discId])[$discId] ?? null;
    }

    /**
     * Everything the GET endpoint needs to answer a conditional request, without
     * reading the bytes — a 304 then costs one narrow query and no payload.
     *
     * @return array{mimeType: string, byteSize: int, updatedAt: \DateTimeImmutable}|null
     */
    public function findMetadataByDiscId(string $discId): ?array
    {
        $row = $this->createQueryBuilder('i')
            ->select('i.mimeType AS mimeType', 'i.byteSize AS byteSize', 'i.updatedAt AS updatedAt')
            ->andWhere('i.disc = :discId')
            ->setParameter('discId', $discId)
            ->getQuery()
            ->getOneOrNullResult(Query::HYDRATE_SCALAR)
        ;

        if (null === $row) {
            return null;
        }

        $updatedAt = self::asDateTimeImmutable($row['updatedAt']);
        if (null === $updatedAt) {
            return null;
        }

        return [
            'mimeType' => (string) $row['mimeType'],
            'byteSize' => (int) $row['byteSize'],
            'updatedAt' => $updatedAt,
        ];
    }

    public function findOneByDisc(Disc $disc): ?DiscImage
    {
        return $this->findOneBy(['disc' => $disc]);
    }

    // HYDRATE_SCALAR deliberately skips the DBAL type conversion for scalar
    // select expressions (AbstractHydrator::gatherScalarRowData, kept for BC
    // since 2.0), so a datetime column arrives here as the raw driver string.
    private static function asDateTimeImmutable(mixed $value): ?\DateTimeImmutable
    {
        if ($value instanceof \DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($value);
        }

        return is_string($value) ? new \DateTimeImmutable($value) : null;
    }
}
