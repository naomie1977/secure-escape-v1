using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            await SeedRiskZonesAsync(context);

            if (await context.BankIntegrations.AnyAsync())
            {
                return;
            }

            static string Hash(string value) =>
                BCrypt.Net.BCrypt.HashPassword(value);

            // BANK INTEGRATIONS
            var zenithBank = new BankIntegration
            {
                Id = Guid.Parse("a1000000-0000-0000-0000-000000000001"),
                BankName = "Zenith Bank Africa",
                BankCode = "ZBA001",
                Status = BankIntegrationStatus.Active,
                WebhookUrl = "https://webhooks.zenithbankafrica.co.za/secure-escape",
                CreatedAt = DateTime.UtcNow
            };

            var savannaBank = new BankIntegration
            {
                Id = Guid.Parse("a2000000-0000-0000-0000-000000000002"),
                BankName = "Savanna Bank",
                BankCode = "SVB001",
                Status = BankIntegrationStatus.Active,
                WebhookUrl = "https://webhooks.savannabank.co.za/secure-escape",
                CreatedAt = DateTime.UtcNow
            };

            await context.BankIntegrations.AddRangeAsync(zenithBank, savannaBank);

            // API CLIENTS
            var zenithApiClient = new ApiClient
            {
                Id = Guid.Parse("b1000000-0000-0000-0000-000000000001"),
                BankIntegrationId = zenithBank.Id,
                ClientId = "zenith-mobile-app",
                ClientSecretHash = Hash(Guid.NewGuid().ToString("N")),
                Scopes = "banking:read banking:write escape:trigger",
                Status = ApiClientStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var savannaApiClient = new ApiClient
            {
                Id = Guid.Parse("b2000000-0000-0000-0000-000000000002"),
                BankIntegrationId = savannaBank.Id,
                ClientId = "savanna-mobile-app",
                ClientSecretHash = Hash(Guid.NewGuid().ToString("N")),
                Scopes = "banking:read banking:write escape:trigger",
                Status = ApiClientStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            await context.ApiClients.AddRangeAsync(
                zenithApiClient,
                savannaApiClient
            );

            // USERS
            var user1 = new User
            {
                Id = Guid.Parse("c1000000-0000-0000-0000-000000000001"),
                BankIntegrationId = zenithBank.Id,
                BankCustomerId = "ZBA-CUST-0001",
                FullName = "Thabo Nkosi",
                Email = "thabo.nkosi@email.co.za",
                PhoneNumber = "0821234567",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var user2 = new User
            {
                Id = Guid.Parse("c2000000-0000-0000-0000-000000000002"),
                BankIntegrationId = zenithBank.Id,
                BankCustomerId = "ZBA-CUST-0002",
                FullName = "Amara Dlamini",
                Email = "amara.dlamini@email.co.za",
                PhoneNumber = "0837654321",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var user3 = new User
            {
                Id = Guid.Parse("c3000000-0000-0000-0000-000000000003"),
                BankIntegrationId = zenithBank.Id,
                BankCustomerId = "ZBA-CUST-0003",
                FullName = "Lerato Mokoena",
                Email = "lerato.mokoena@email.co.za",
                PhoneNumber = "0611112222",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var user4 = new User
            {
                Id = Guid.Parse("c4000000-0000-0000-0000-000000000004"),
                BankIntegrationId = savannaBank.Id,
                BankCustomerId = "SVB-CUST-0001",
                FullName = "Sipho Zulu",
                Email = "sipho.zulu@email.co.za",
                PhoneNumber = "0729998888",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var user5 = new User
            {
                Id = Guid.Parse("c5000000-0000-0000-0000-000000000005"),
                BankIntegrationId = savannaBank.Id,
                BankCustomerId = "SVB-CUST-0002",
                FullName = "Naledi Khumalo",
                Email = "naledi.khumalo@email.co.za",
                PhoneNumber = "0845556666",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            await context.Users.AddRangeAsync(
                user1,
                user2,
                user3,
                user4,
                user5
            );

            // AUTH CREDENTIALS
            await context.AuthCredentials.AddRangeAsync(
                new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = user1.Id,
                    PasswordHash = Hash("Password@123"),
                    NormalPinHash = Hash("1234"),
                    DuressPinHash = Hash("9999"),
                    CreatedAt = DateTime.UtcNow
                },
                new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = user2.Id,
                    PasswordHash = Hash("Password@123"),
                    NormalPinHash = Hash("2222"),
                    DuressPinHash = Hash("8888"),
                    CreatedAt = DateTime.UtcNow
                },
                new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = user3.Id,
                    PasswordHash = Hash("Password@123"),
                    NormalPinHash = Hash("3333"),
                    DuressPinHash = Hash("7777"),
                    CreatedAt = DateTime.UtcNow
                },
                new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = user4.Id,
                    PasswordHash = Hash("Password@123"),
                    NormalPinHash = Hash("4444"),
                    DuressPinHash = Hash("6666"),
                    CreatedAt = DateTime.UtcNow
                },
                new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = user5.Id,
                    PasswordHash = Hash("Password@123"),
                    NormalPinHash = Hash("5555"),
                    DuressPinHash = Hash("0000"),
                    CreatedAt = DateTime.UtcNow
                }
            );

            // BANK ACCOUNTS
            await context.BankAccounts.AddRangeAsync(
                new BankAccount
                {
                    Id = Guid.Parse("d1000000-0000-0000-0000-000000000001"),
                    UserId = user1.Id,
                    AccountNumber = "4001001001",
                    AccountName = "Thabo Nkosi Savings",
                    AccountType = AccountType.Savings,
                    AvailableBalance = 18500.00m,
                    CurrentBalance = 18500.00m,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new BankAccount
                {
                    Id = Guid.Parse("d2000000-0000-0000-0000-000000000002"),
                    UserId = user2.Id,
                    AccountNumber = "4002002002",
                    AccountName = "Amara Dlamini Cheque",
                    AccountType = AccountType.Cheque,
                    AvailableBalance = 32000.00m,
                    CurrentBalance = 32000.00m,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new BankAccount
                {
                    Id = Guid.Parse("d3000000-0000-0000-0000-000000000003"),
                    UserId = user3.Id,
                    AccountNumber = "4003003003",
                    AccountName = "Lerato Mokoena Savings",
                    AccountType = AccountType.Savings,
                    AvailableBalance = 9750.00m,
                    CurrentBalance = 9750.00m,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new BankAccount
                {
                    Id = Guid.Parse("d4000000-0000-0000-0000-000000000004"),
                    UserId = user4.Id,
                    AccountNumber = "4004004004",
                    AccountName = "Sipho Zulu Cheque",
                    AccountType = AccountType.Cheque,
                    AvailableBalance = 54200.00m,
                    CurrentBalance = 54200.00m,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new BankAccount
                {
                    Id = Guid.Parse("d5000000-0000-0000-0000-000000000005"),
                    UserId = user5.Id,
                    AccountNumber = "4005005005",
                    AccountName = "Naledi Khumalo Savings",
                    AccountType = AccountType.Savings,
                    AvailableBalance = 12300.00m,
                    CurrentBalance = 12300.00m,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                }
            );

            // BENEFICIARIES
            await context.Beneficiaries.AddRangeAsync(
                new Beneficiary
                {
                    Id = Guid.NewGuid(),
                    UserId = user1.Id,
                    Name = "Mama Nkosi",
                    BankName = "Zenith Bank Africa",
                    AccountNumber = "5001001001",
                    Reference = "Grocery Money",
                    Status = BeneficiaryStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new Beneficiary
                {
                    Id = Guid.NewGuid(),
                    UserId = user2.Id,
                    Name = "City Power JHB",
                    BankName = "Savanna Bank",
                    AccountNumber = "5002002002",
                    Reference = "Electricity",
                    Status = BeneficiaryStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new Beneficiary
                {
                    Id = Guid.NewGuid(),
                    UserId = user3.Id,
                    Name = "Kagiso Sithole",
                    BankName = "Savanna Bank",
                    AccountNumber = "5003003003",
                    Reference = "Rent",
                    Status = BeneficiaryStatus.Active,
                    CreatedAt = DateTime.UtcNow
                }
            );

            // ADMIN USERS
            await context.AdminUsers.AddRangeAsync(
                new AdminUser
                {
                    Id = Guid.NewGuid(),
                    BankIntegrationId = zenithBank.Id,
                    FullName = "Kagiso Moyo",
                    Email = "kagiso.moyo@zenithbank.co.za",
                    PasswordHash = Hash("Admin@123"),
                    AdminRole = AdminRole.FraudManager,
                    ActivityStatus = AdminUserStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    Id = Guid.NewGuid(),
                    BankIntegrationId = savannaBank.Id,
                    FullName = "Zanele Dube",
                    Email = "zanele.dube@savannabank.co.za",
                    PasswordHash = Hash("Admin@123"),
                    AdminRole = AdminRole.FraudAnalyst,
                    ActivityStatus = AdminUserStatus.Active,
                    CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();
        }

        private static async Task SeedRiskZonesAsync(AppDbContext context)
        {
            if (await context.RiskZones.AnyAsync())
            {
                return;
            }

            var createdAt = DateTime.UtcNow;

            var zones = new List<RiskZone>
            {
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000001"),
                    Name = "Alexandra",
                    RiskLevel = RiskLevel.High,
                    Latitude = -26.1025m,
                    Longitude = 28.1005m,
                    RadiusMeters = 2600,
                    RiskScore = 88m,
                    IncidentCount = 14,
                    DuressEventCount = 9,
                    Description = "Area currently configured as a higher-risk zone for Secure Escape safety awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000002"),
                    Name = "Hillbrow",
                    RiskLevel = RiskLevel.High,
                    Latitude = -26.1906m,
                    Longitude = 28.0467m,
                    RadiusMeters = 2200,
                    RiskScore = 82m,
                    IncidentCount = 11,
                    DuressEventCount = 7,
                    Description = "Area currently configured as a higher-risk zone for Secure Escape safety awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000003"),
                    Name = "Rosettenville",
                    RiskLevel = RiskLevel.High,
                    Latitude = -26.2607m,
                    Longitude = 28.0357m,
                    RadiusMeters = 2400,
                    RiskScore = 78m,
                    IncidentCount = 10,
                    DuressEventCount = 6,
                    Description = "Area currently configured as a higher-risk zone for Secure Escape safety awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000004"),
                    Name = "Jeppestown",
                    RiskLevel = RiskLevel.High,
                    Latitude = -26.1952m,
                    Longitude = 28.0648m,
                    RadiusMeters = 1900,
                    RiskScore = 74m,
                    IncidentCount = 8,
                    DuressEventCount = 5,
                    Description = "Area currently configured as a higher-risk zone for Secure Escape safety awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000005"),
                    Name = "Soweto",
                    RiskLevel = RiskLevel.High,
                    Latitude = -26.2485m,
                    Longitude = 27.8546m,
                    RadiusMeters = 3000,
                    RiskScore = 76m,
                    IncidentCount = 12,
                    DuressEventCount = 7,
                    Description = "Area currently configured as a higher-risk zone for Secure Escape safety awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000006"),
                    Name = "Braamfontein",
                    RiskLevel = RiskLevel.Medium,
                    Latitude = -26.1929m,
                    Longitude = 28.0311m,
                    RadiusMeters = 1800,
                    RiskScore = 58m,
                    IncidentCount = 7,
                    DuressEventCount = 3,
                    Description = "Area currently configured for elevated-risk awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000007"),
                    Name = "Berea",
                    RiskLevel = RiskLevel.Medium,
                    Latitude = -26.1851m,
                    Longitude = 28.0507m,
                    RadiusMeters = 1700,
                    RiskScore = 54m,
                    IncidentCount = 6,
                    DuressEventCount = 3,
                    Description = "Area currently configured for elevated-risk awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000008"),
                    Name = "Johannesburg CBD",
                    RiskLevel = RiskLevel.Medium,
                    Latitude = -26.2041m,
                    Longitude = 28.0473m,
                    RadiusMeters = 2000,
                    RiskScore = 49m,
                    IncidentCount = 5,
                    DuressEventCount = 2,
                    Description = "Area currently configured for elevated-risk awareness.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000009"),
                    Name = "Sandton",
                    RiskLevel = RiskLevel.Low,
                    Latitude = -26.1076m,
                    Longitude = 28.0567m,
                    RadiusMeters = 2300,
                    RiskScore = 22m,
                    IncidentCount = 2,
                    DuressEventCount = 1,
                    Description = "Area currently configured as a lower-risk zone in Secure Escape.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000010"),
                    Name = "Rosebank",
                    RiskLevel = RiskLevel.Low,
                    Latitude = -26.1466m,
                    Longitude = 28.0368m,
                    RadiusMeters = 1800,
                    RiskScore = 19m,
                    IncidentCount = 2,
                    DuressEventCount = 1,
                    Description = "Area currently configured as a lower-risk zone in Secure Escape.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000011"),
                    Name = "Fourways",
                    RiskLevel = RiskLevel.Low,
                    Latitude = -26.0196m,
                    Longitude = 28.0126m,
                    RadiusMeters = 2400,
                    RiskScore = 14m,
                    IncidentCount = 1,
                    DuressEventCount = 0,
                    Description = "Area currently configured as a lower-risk zone in Secure Escape.",
                    IsActive = true,
                    CreatedAt = createdAt
                },
                new()
                {
                    Id = Guid.Parse("e1000000-0000-0000-0000-000000000012"),
                    Name = "Melrose",
                    RiskLevel = RiskLevel.Low,
                    Latitude = -26.1299m,
                    Longitude = 28.0829m,
                    RadiusMeters = 1600,
                    RiskScore = 12m,
                    IncidentCount = 1,
                    DuressEventCount = 0,
                    Description = "Area currently configured as a lower-risk zone in Secure Escape.",
                    IsActive = true,
                    CreatedAt = createdAt
                }
            };

            await context.RiskZones.AddRangeAsync(zones);
            await context.SaveChangesAsync();
        }
    }
}