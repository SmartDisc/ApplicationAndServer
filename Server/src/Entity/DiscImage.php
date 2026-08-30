<?php

namespace App\Entity;

use App\Repository\DiscImageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use function is_resource;

/**
 * The image bytes for a Disc, deliberately kept in their own table.
 *
 * The OneToOne is mapped *only* from this side. A Disc is hydrated by every
 * list and detail query in the app, and Doctrine cannot lazy-load the inverse
 * side of a to-one association (UnitOfWork::createEntity: "Inverse side of
 * x-to-one can never be lazy") — a $image property on Disc would therefore fire
 * an extra SELECT, dragging this BYTEA column along, for every disc ever
 * loaded. Presence and metadata are read through DiscImageRepository instead.
 */
#[ORM\Entity(repositoryClass: DiscImageRepository::class)]
#[ORM\Table(name: 'disc_image')]
class DiscImage
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36, unique: true)]
    private string $id;

    #[ORM\OneToOne(targetEntity: Disc::class)]
    #[ORM\JoinColumn(name: 'disc_id', nullable: false, unique: true, onDelete: 'CASCADE')]
    private Disc $disc;

    // Doctrine's `blob` type maps to BYTEA on PostgreSQL and hydrates to a
    // stream resource rather than a string, so the property is untyped-ish and
    // getData() normalises both shapes.
    #[ORM\Column(type: 'blob')]
    private mixed $data;

    #[ORM\Column(length: 64)]
    private string $mimeType;

    #[ORM\Column]
    private int $byteSize;

    #[ORM\Column]
    private int $width;

    #[ORM\Column]
    private int $height;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(Disc $disc, string $data, string $mimeType, int $width, int $height)
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->disc = $disc;
        $this->replace($data, $mimeType, $width, $height);
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getDisc(): Disc
    {
        return $this->disc;
    }

    /**
     * Swaps in a freshly re-encoded payload and bumps updated_at, which is what
     * the `?v=` cache buster and the ETag are derived from.
     */
    public function replace(string $data, string $mimeType, int $width, int $height): static
    {
        $this->data = $data;
        $this->mimeType = $mimeType;
        $this->byteSize = strlen($data);
        $this->width = $width;
        $this->height = $height;
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getData(): string
    {
        if (is_resource($this->data)) {
            return stream_get_contents($this->data, -1, 0);
        }

        return (string) $this->data;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function getByteSize(): int
    {
        return $this->byteSize;
    }

    public function getWidth(): int
    {
        return $this->width;
    }

    public function getHeight(): int
    {
        return $this->height;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
