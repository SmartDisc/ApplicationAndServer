<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260718120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add disc_throw table.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE disc_throw (id VARCHAR(36) NOT NULL, disc_id VARCHAR(36) NOT NULL, recorded_by_id INT DEFAULT NULL, name VARCHAR(60) NOT NULL, is_auto_named BOOLEAN NOT NULL, recorded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, duration_ms INT NOT NULL, max_rpm DOUBLE PRECISION DEFAULT NULL, max_alt_m DOUBLE PRECISION DEFAULT NULL, max_accel_magnitude DOUBLE PRECISION DEFAULT NULL, avg_temp_c DOUBLE PRECISION DEFAULT NULL, sample_count INT NOT NULL, is_favorite BOOLEAN NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_27AE3780C38F37CA ON disc_throw (disc_id)');
        $this->addSql('CREATE INDEX IDX_27AE3780D05A957B ON disc_throw (recorded_by_id)');
        $this->addSql('CREATE INDEX IDX_27AE3780D74808F5 ON disc_throw (recorded_at)');
        $this->addSql('ALTER TABLE disc_throw ADD CONSTRAINT FK_27AE3780C38F37CA FOREIGN KEY (disc_id) REFERENCES disc (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE disc_throw ADD CONSTRAINT FK_27AE3780D05A957B FOREIGN KEY (recorded_by_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE disc_throw DROP CONSTRAINT FK_27AE3780C38F37CA');
        $this->addSql('ALTER TABLE disc_throw DROP CONSTRAINT FK_27AE3780D05A957B');
        $this->addSql('DROP TABLE disc_throw');
    }
}
