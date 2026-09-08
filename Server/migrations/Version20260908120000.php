<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260908120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add max_speed_kmh to disc_throw (linear speed estimated from accelerometer data).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE disc_throw ADD max_speed_kmh DOUBLE PRECISION DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE disc_throw DROP max_speed_kmh');
    }
}
