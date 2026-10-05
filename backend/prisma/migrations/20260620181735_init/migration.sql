-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'TAPPER', 'ESTATE_OWNER', 'FACTORY_MANAGER') NOT NULL,
    `phone` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estateName` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TapperEstateAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tapperId` INTEGER NOT NULL,
    `estateId` INTEGER NOT NULL,
    `tapperSharePercentage` DECIMAL(5, 2) NOT NULL,
    `ownerSharePercentage` DECIMAL(5, 2) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TapperEstateAssignment_tapperId_estateId_key`(`tapperId`, `estateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Factory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factoryName` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `managerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyPrice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factoryId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `q1Price` DECIMAL(10, 2) NOT NULL,
    `q2Price` DECIMAL(10, 2) NOT NULL,
    `q3Price` DECIMAL(10, 2) NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyPrice_factoryId_date_key`(`factoryId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tapperId` INTEGER NOT NULL,
    `estateId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `sheetCount` INTEGER NOT NULL,
    `weightKg` DECIMAL(10, 2) NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `remarks` VARCHAR(191) NULL,
    `status` ENUM('PENDING_OWNER_APPROVAL', 'OWNER_REJECTED', 'OWNER_APPROVED', 'PENDING_FACTORY_GRADING', 'FACTORY_GRADED', 'TRANSACTION_COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL',
    `ownerApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `ownerApprovedBy` INTEGER NULL,
    `ownerApprovedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MLPrediction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productionRecordId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `predictedGrade` ENUM('Q1', 'Q2', 'Q3') NOT NULL,
    `confidenceScore` DECIMAL(5, 2) NOT NULL,
    `modelVersion` VARCHAR(191) NOT NULL,
    `predictionType` ENUM('ESTATE_PRE_GRADING', 'FACTORY_FINAL_GRADING') NOT NULL,
    `isLowConfidence` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FactoryTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productionRecordId` INTEGER NOT NULL,
    `factoryId` INTEGER NOT NULL,
    `factoryManagerId` INTEGER NOT NULL,
    `finalWeightKg` DECIMAL(10, 2) NOT NULL,
    `mlSuggestedGrade` ENUM('Q1', 'Q2', 'Q3') NULL,
    `mlConfidenceScore` DECIMAL(5, 2) NULL,
    `finalGrade` ENUM('Q1', 'Q2', 'Q3') NOT NULL,
    `pricePerKg` DECIMAL(10, 2) NOT NULL,
    `totalPayment` DECIMAL(12, 2) NOT NULL,
    `tapperSharePercentage` DECIMAL(5, 2) NOT NULL,
    `ownerSharePercentage` DECIMAL(5, 2) NOT NULL,
    `tapperShareAmount` DECIMAL(12, 2) NOT NULL,
    `ownerShareAmount` DECIMAL(12, 2) NOT NULL,
    `gradeOverridden` BOOLEAN NOT NULL DEFAULT false,
    `overrideReason` VARCHAR(191) NULL,
    `transactionStatus` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FactoryTransaction_productionRecordId_key`(`productionRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `type` ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL DEFAULT 'INFO',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factoryId` INTEGER NOT NULL,
    `grade` ENUM('Q1', 'Q2', 'Q3') NOT NULL,
    `totalWeightKg` DECIMAL(12, 2) NOT NULL,
    `lastUpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Inventory_factoryId_grade_key`(`factoryId`, `grade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Estate` ADD CONSTRAINT `Estate_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TapperEstateAssignment` ADD CONSTRAINT `TapperEstateAssignment_tapperId_fkey` FOREIGN KEY (`tapperId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TapperEstateAssignment` ADD CONSTRAINT `TapperEstateAssignment_estateId_fkey` FOREIGN KEY (`estateId`) REFERENCES `Estate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factory` ADD CONSTRAINT `Factory_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyPrice` ADD CONSTRAINT `DailyPrice_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `Factory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyPrice` ADD CONSTRAINT `DailyPrice_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionRecord` ADD CONSTRAINT `ProductionRecord_tapperId_fkey` FOREIGN KEY (`tapperId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionRecord` ADD CONSTRAINT `ProductionRecord_estateId_fkey` FOREIGN KEY (`estateId`) REFERENCES `Estate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionRecord` ADD CONSTRAINT `ProductionRecord_ownerApprovedBy_fkey` FOREIGN KEY (`ownerApprovedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MLPrediction` ADD CONSTRAINT `MLPrediction_productionRecordId_fkey` FOREIGN KEY (`productionRecordId`) REFERENCES `ProductionRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryTransaction` ADD CONSTRAINT `FactoryTransaction_productionRecordId_fkey` FOREIGN KEY (`productionRecordId`) REFERENCES `ProductionRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryTransaction` ADD CONSTRAINT `FactoryTransaction_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `Factory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryTransaction` ADD CONSTRAINT `FactoryTransaction_factoryManagerId_fkey` FOREIGN KEY (`factoryManagerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `Factory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
