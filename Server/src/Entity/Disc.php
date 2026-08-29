<?php

namespace App\Entity;

use App\Repository\DiscRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: DiscRepository::class)]
class Disc
{
    // Characters that are easily confused when read off a physical disc (0/O, 1/I/l) are excluded.
    private const string PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    private const int PASSWORD_LENGTH = 12;

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36, unique: true)]
    private string $id;

    #[ORM\Column(length: 255)]
    private ?string $name = 'Disc';

    #[ORM\Column(length: 255)]
    private string $password;

    // Deleting a disc must never take its owner's account down with it, and
    // deleting a user must orphan their discs (so they can be re-claimed)
    // rather than fail outright — hence no remove cascade and SET NULL.
    #[ORM\OneToOne(cascade: ['persist'])]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?User $owner = null;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'discs')]
    private Collection $sharedPeople;

    public function __construct()
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->password = self::generatePassword();
        $this->sharedPeople = new ArrayCollection();
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    private static function generatePassword(): string
    {
        $max = strlen(self::PASSWORD_ALPHABET) - 1;
        $password = '';
        for ($i = 0; $i < self::PASSWORD_LENGTH; $i++) {
            $password .= self::PASSWORD_ALPHABET[random_int(0, $max)];
        }

        return $password;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getSharedPeople(): Collection
    {
        return $this->sharedPeople;
    }

    public function addSharedPerson(User $sharedPerson): static
    {
        if (!$this->sharedPeople->contains($sharedPerson)) {
            $this->sharedPeople->add($sharedPerson);
        }

        return $this;
    }

    public function removeSharedPerson(User $sharedPerson): static
    {
        $this->sharedPeople->removeElement($sharedPerson);

        return $this;
    }
}
