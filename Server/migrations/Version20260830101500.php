<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260830101500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add disc_image table.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE disc_image (id VARCHAR(36) NOT NULL, disc_id VARCHAR(36) NOT NULL, data BYTEA NOT NULL, mime_type VARCHAR(64) NOT NULL, byte_size INT NOT NULL, width INT NOT NULL, height INT NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_AD0072E8C38F37CA ON disc_image (disc_id)');
        $this->addSql('ALTER TABLE disc_image ADD CONSTRAINT FK_AD0072E8C38F37CA FOREIGN KEY (disc_id) REFERENCES disc (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE disc_image DROP CONSTRAINT FK_AD0072E8C38F37CA');
        $this->addSql('DROP TABLE disc_image');
    }
}
