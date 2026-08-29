<?php

namespace App\Entity;

use App\Repository\DiscThrowRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: DiscThrowRepository::class)]
#[ORM\Table(name: 'disc_throw')]
#[ORM\Index(name: 'idx_27ae3780d74808f5', columns: ['recorded_at'])]
class DiscThrow
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36, unique: true)]
    private string $id;

    #[ORM\ManyToOne(targetEntity: Disc::class)]
    #[ORM\JoinColumn(name: 'disc_id', nullable: false, onDelete: 'CASCADE')]
    private Disc $disc;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'recorded_by_id', nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(length: 60)]
    private string $name;

    #[ORM\Column]
    private bool $isAutoNamed;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $recordedAt;

    #[ORM\Column]
    private int $durationMs;

    #[ORM\Column(nullable: true)]
    private ?float $maxRpm = null;

    #[ORM\Column(nullable: true)]
    private ?float $maxAltM = null;

    #[ORM\Column(nullable: true)]
    private ?float $maxAccelMagnitude = null;

    #[ORM\Column(nullable: true)]
    private ?float $avgTempC = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $series = null;

    #[ORM\Column]
    private int $sampleCount;

    #[ORM\Column]
    private bool $isFavorite;

    public function __construct(Disc $disc, string $name, bool $isAutoNamed, \DateTimeImmutable $recordedAt, int $durationMs)
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->disc = $disc;
        $this->name = $name;
        $this->isAutoNamed = $isAutoNamed;
        $this->recordedAt = $recordedAt;
        $this->durationMs = $durationMs;
        $this->sampleCount = 0;
        $this->isFavorite = false;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getDisc(): Disc
    {
        return $this->disc;
    }

    public function getRecordedBy(): ?User
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?User $recordedBy): static
    {
        $this->recordedBy = $recordedBy;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function isAutoNamed(): bool
    {
        return $this->isAutoNamed;
    }

    public function setIsAutoNamed(bool $isAutoNamed): static
    {
        $this->isAutoNamed = $isAutoNamed;

        return $this;
    }

    public function getRecordedAt(): \DateTimeImmutable
    {
        return $this->recordedAt;
    }

    public function getDurationMs(): int
    {
        return $this->durationMs;
    }

    public function getMaxRpm(): ?float
    {
        return $this->maxRpm;
    }

    public function setMaxRpm(?float $maxRpm): static
    {
        $this->maxRpm = $maxRpm;

        return $this;
    }

    public function getMaxAltM(): ?float
    {
        return $this->maxAltM;
    }

    public function setMaxAltM(?float $maxAltM): static
    {
        $this->maxAltM = $maxAltM;

        return $this;
    }

    public function getMaxAccelMagnitude(): ?float
    {
        return $this->maxAccelMagnitude;
    }

    public function setMaxAccelMagnitude(?float $maxAccelMagnitude): static
    {
        $this->maxAccelMagnitude = $maxAccelMagnitude;

        return $this;
    }

    public function getAvgTempC(): ?float
    {
        return $this->avgTempC;
    }

    public function setAvgTempC(?float $avgTempC): static
    {
        $this->avgTempC = $avgTempC;

        return $this;
    }

    public function getSeries(): ?array
    {
        return $this->series;
    }

    public function setSeries(?array $series): static
    {
        $this->series = $series;

        return $this;
    }

    public function getSampleCount(): int
    {
        return $this->sampleCount;
    }

    public function setSampleCount(int $sampleCount): static
    {
        $this->sampleCount = $sampleCount;

        return $this;
    }

    public function isFavorite(): bool
    {
        return $this->isFavorite;
    }

    public function setFavorite(bool $isFavorite): static
    {
        $this->isFavorite = $isFavorite;

        return $this;
    }
}
