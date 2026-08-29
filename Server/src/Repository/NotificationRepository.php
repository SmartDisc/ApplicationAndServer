<?php

namespace App\Repository;

use App\Entity\Notification;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Notification>
 */
class NotificationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notification::class);
    }

    /**
     * Creates and persists (but does not flush) a notification for the given recipient.
     * Callers are expected to flush once, alongside whatever other changes they're making.
     *
     * @param array<string, mixed> $data
     */
    public function createFor(User $recipient, string $type, array $data): Notification
    {
        $notification = new Notification();
        $notification->setRecipient($recipient);
        $notification->setType($type);
        $notification->setData($data);

        $this->getEntityManager()->persist($notification);

        return $notification;
    }

    /**
     * @return list<Notification>
     */
    public function findAllFor(User $recipient): array
    {
        return $this->createQueryBuilder('n')
            ->andWhere('n.recipient = :recipient')
            ->setParameter('recipient', $recipient)
            ->orderBy('n.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function countUnreadFor(User $recipient): int
    {
        return (int) $this->createQueryBuilder('n')
            ->select('COUNT(n.id)')
            ->andWhere('n.recipient = :recipient')
            ->andWhere('n.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function markAllReadFor(User $recipient): void
    {
        $this->createQueryBuilder('n')
            ->update()
            ->set('n.readAt', ':now')
            ->andWhere('n.recipient = :recipient')
            ->andWhere('n.readAt IS NULL')
            ->setParameter('now', new DateTimeImmutable())
            ->setParameter('recipient', $recipient)
            ->getQuery()
            ->execute();
    }
}
