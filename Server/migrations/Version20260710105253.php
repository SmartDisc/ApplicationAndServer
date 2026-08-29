<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260710105253 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE disc (id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, owner_id INT DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_2AF55307E3C61F9 ON disc (owner_id)');
        $this->addSql('CREATE TABLE disc_user (disc_id VARCHAR(36) NOT NULL, user_id INT NOT NULL, PRIMARY KEY (disc_id, user_id))');
        $this->addSql('CREATE INDEX IDX_6D56999BC38F37CA ON disc_user (disc_id)');
        $this->addSql('CREATE INDEX IDX_6D56999BA76ED395 ON disc_user (user_id)');
        $this->addSql('ALTER TABLE disc ADD CONSTRAINT FK_2AF55307E3C61F9 FOREIGN KEY (owner_id) REFERENCES "user" (id)');
        $this->addSql('ALTER TABLE disc_user ADD CONSTRAINT FK_6D56999BC38F37CA FOREIGN KEY (disc_id) REFERENCES disc (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE disc_user ADD CONSTRAINT FK_6D56999BA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE disc DROP CONSTRAINT FK_2AF55307E3C61F9');
        $this->addSql('ALTER TABLE disc_user DROP CONSTRAINT FK_6D56999BC38F37CA');
        $this->addSql('ALTER TABLE disc_user DROP CONSTRAINT FK_6D56999BA76ED395');
        $this->addSql('DROP TABLE disc');
        $this->addSql('DROP TABLE disc_user');
    }
}
