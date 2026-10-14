using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecureEscape.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDuressBudgetsAndTiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                                   WHERE TABLE_SCHEMA = DATABASE() 
                                   AND TABLE_NAME = 'Beneficiaries' 
                                   AND COLUMN_NAME = 'CreatedUnderDuress');
                SET @sql = IF(@col_exists = 0, 'ALTER TABLE Beneficiaries ADD CreatedUnderDuress tinyint(1) NOT NULL DEFAULT FALSE;', 'SELECT 1;');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `DuressBudgets` (
                    `UserSessionId` char(36) COLLATE ascii_general_ci NOT NULL,
                    `BankAccountId` char(36) COLLATE ascii_general_ci NULL,
                    `OriginalBalance` decimal(18,2) NOT NULL,
                    `RemainingBalance` decimal(18,2) NOT NULL,
                    `OriginalSpendingLimit` decimal(18,2) NOT NULL,
                    `RemainingSpendingLimit` decimal(18,2) NOT NULL,
                    `PendingThresholdRate` decimal(5,4) NOT NULL,
                    `ExistingBeneficiaryIdsJson` longtext CHARACTER SET utf8mb4 NOT NULL,
                    CONSTRAINT `PK_DuressBudgets` PRIMARY KEY (`UserSessionId`),
                    CONSTRAINT `FK_DuressBudgets_BankAccounts_BankAccountId` FOREIGN KEY (`BankAccountId`) REFERENCES `BankAccounts` (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_DuressBudgets_UserSessions_UserSessionId` FOREIGN KEY (`UserSessionId`) REFERENCES `UserSessions` (`Id`) ON DELETE CASCADE
                ) CHARACTER SET=utf8mb4;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DuressBudgets");

            migrationBuilder.DropColumn(
                name: "CreatedUnderDuress",
                table: "Beneficiaries");
        }
    }
}
