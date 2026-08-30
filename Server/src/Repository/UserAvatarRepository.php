<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserAvatar;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use function is_string;

/**
 * @extends ServiceEntityRepository<UserAvatar>
 */
class UserAvatarRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserAvatar::class);
    }

    /**
     * The full row, image bytes included. Only the endpoint that actually
     * serves the bytes, and the upload/delete endpoints, should call this.
     */
    public function findOneForUser(User $user): ?UserAvatar
    {
        return $this->findOneBy(['user' => $user]);
    }

    /**
     * Everything the GET needs to answer a conditional request — the id to load
     * bytes by, the type to serve them as, and the timestamp the ETag is built
     * from — without touching the BYTEA column. Lets an If-None-Match hit
     * return 304 without ever reading the image.
     *
     * @return array{id: int, mimeType: string, updatedAt: DateTimeImmutable}|null
     */
    public function findMetadataForUser(User $user): ?array
    {
        /** @var array<string, mixed>|null $row */
        $row = $this->createQueryBuilder('a')
            ->select('a.id', 'a.mimeType', 'a.updatedAt')
            ->andWhere('a.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();

        if (null === $row) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'mimeType' => (string) $row['mimeType'],
            'updatedAt' => $this->toDateTime($row['updatedAt']),
        ];
    }

    /**
     * Avatar timestamps for a whole list of users in one query, so a friend or
     * member list can be serialised without a query per row. Users with no
     * avatar are simply absent from the result.
     *
     * @param list<int> $userIds
     *
     * @return array<int, DateTimeImmutable> keyed by user id
     */
    public function findUpdatedAtByUserIds(array $userIds): array
    {
        if ([] === $userIds) {
            return [];
        }

        $rows = $this->createQueryBuilder('a')
            ->select('IDENTITY(a.user) AS userId', 'a.updatedAt')
            ->andWhere('a.user IN (:userIds)')
            ->setParameter('userIds', $userIds)
            ->getQuery()
            ->getArrayResult();

        $byUserId = [];
        foreach ($rows as $row) {
            $byUserId[(int) $row['userId']] = $this->toDateTime($row['updatedAt']);
        }

        return $byUserId;
    }

    /**
     * Scalar hydration normally hands back a DateTimeImmutable already, but the
     * driver can return the raw string depending on the platform's date type,
     * so normalise rather than assume.
     */
    private function toDateTime(mixed $value): DateTimeImmutable
    {
        if ($value instanceof DateTimeImmutable) {
            return $value;
        }

        if ($value instanceof DateTimeInterface) {
            return DateTimeImmutable::createFromInterface($value);
        }

        return new DateTimeImmutable(is_string($value) ? $value : 'now');
    }
}
