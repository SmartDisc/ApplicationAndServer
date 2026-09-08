<?php

namespace App\Entity;

use App\Repository\AdminMessageRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

/**
 * A broadcast sent by an admin to every user via the admin dashboard's
 * Messages tab. Fanned out to a Notification (type "admin_message") per
 * recipient at send time — this row is the record of the broadcast itself,
 * kept for the admin's own history view.
 */
#[ORM\Entity(repositoryClass: AdminMessageRepository::class)]
class AdminMessage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $title;

    #[ORM\Column(type: 'text')]
    private string $body;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $sentBy = null;

    #[ORM\Column]
    private int $recipientCount = 0;

    #[ORM\Column]
    private DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function setBody(string $body): static
    {
        $this->body = $body;

        return $this;
    }

    public function getSentBy(): ?User
    {
        return $this->sentBy;
    }

    public function setSentBy(User $sentBy): static
    {
        $this->sentBy = $sentBy;

        return $this;
    }

    public function getRecipientCount(): int
    {
        return $this->recipientCount;
    }

    public function setRecipientCount(int $recipientCount): static
    {
        $this->recipientCount = $recipientCount;

        return $this;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }
}
