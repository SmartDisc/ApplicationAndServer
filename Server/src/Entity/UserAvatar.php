<?php

namespace App\Entity;

use App\Repository\UserAvatarRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use function is_resource;

/**
 * A user's profile picture, kept in its own table rather than as a column on
 * User. User is hydrated on every authenticated request by the JWT user
 * provider and once per row on every friend and member list; a BYTEA column on
 * it would drag the image bytes into all of those.
 *
 * The association is deliberately unidirectional — UserAvatar points at User,
 * User has no $avatar property. Doctrine cannot lazily load the *inverse* side
 * of a one-to-one (it has to query to know whether the row is null), so adding
 * one would issue an extra SELECT per hydrated User and undo the whole point of
 * the side table. Avatar metadata is read in bulk through
 * UserAvatarRepository instead.
 */
#[ORM\Entity(repositoryClass: UserAvatarRepository::class)]
class UserAvatar
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'CASCADE')]
    private ?User $user = null;

    /**
     * Doctrine's BLOB type hands back a stream resource on read but takes a
     * string on write, so this one property is untyped and normalised by its
     * accessors.
     */
    #[ORM\Column(type: Types::BLOB)]
    private mixed $data = null;

    // The type the server encoded to, not anything the uploader sent. This is
    // what the GET serves as Content-Type.
    #[ORM\Column(length: 60)]
    private string $mimeType = 'image/webp';

    #[ORM\Column]
    private int $byteSize = 0;

    #[ORM\Column]
    private int $width = 0;

    #[ORM\Column]
    private int $height = 0;

    #[ORM\Column]
    private DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getData(): string
    {
        if (is_resource($this->data)) {
            // Rewind so a second call to this getter does not return ''.
            rewind($this->data);

            return (string) stream_get_contents($this->data);
        }

        return (string) $this->data;
    }

    public function setData(string $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function setMimeType(string $mimeType): static
    {
        $this->mimeType = $mimeType;

        return $this;
    }

    public function getByteSize(): int
    {
        return $this->byteSize;
    }

    public function setByteSize(int $byteSize): static
    {
        $this->byteSize = $byteSize;

        return $this;
    }

    public function getWidth(): int
    {
        return $this->width;
    }

    public function setWidth(int $width): static
    {
        $this->width = $width;

        return $this;
    }

    public function getHeight(): int
    {
        return $this->height;
    }

    public function setHeight(int $height): static
    {
        $this->height = $height;

        return $this;
    }

    public function getUpdatedAt(): DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }
}
