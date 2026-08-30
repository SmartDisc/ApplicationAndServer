<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260830160904 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow a user to own more than one disc: drop the unique index on disc.owner_id.';
    }

    public function up(Schema $schema): void
    {
        // The unique index dated from an earlier one-disc-per-account design and
        // made a user's second claim fail with a 23505 violation. The plain index
        // replaces it because DiscController::list() filters on owner_id.
        $this->addSql('DROP INDEX uniq_2af55307e3c61f9');
        $this->addSql('CREATE INDEX IDX_2AF55307E3C61F9 ON disc (owner_id)');
    }

    public function down(Schema $schema): void
    {
        // Reverting only succeeds while no user owns more than one disc.
        $this->addSql('DROP INDEX IDX_2AF55307E3C61F9');
        $this->addSql('CREATE UNIQUE INDEX uniq_2af55307e3c61f9 ON disc (owner_id)');
    }
}
