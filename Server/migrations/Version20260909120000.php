<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260909120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop avg_temp_c from disc_throw (temperature was never surfaced by real hardware and is no longer displayed).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE disc_throw DROP avg_temp_c');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE disc_throw ADD avg_temp_c DOUBLE PRECISION DEFAULT NULL');
    }
}
