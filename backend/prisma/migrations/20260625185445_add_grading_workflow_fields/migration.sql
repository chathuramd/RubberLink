-- AlterTable
ALTER TABLE `factorytransaction` ADD COLUMN `gradingChecklist` JSON NULL,
    ADD COLUMN `gradingDecisionSource` VARCHAR(191) NOT NULL DEFAULT 'MANUAL_REVIEW',
    ADD COLUMN `inspectorNotes` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `productionrecord` ADD COLUMN `ownerAssessedGrade` ENUM('Q1', 'Q2', 'Q3') NULL,
    ADD COLUMN `ownerGradeNotes` VARCHAR(191) NULL,
    ADD COLUMN `tapperExpectedGrade` ENUM('Q1', 'Q2', 'Q3') NULL;
