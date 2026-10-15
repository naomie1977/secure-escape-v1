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
                await SeedAdditionalUsersAsync(context);
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
            await SeedAdditionalUsersAsync(context);
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

        private static async Task SeedAdditionalUsersAsync(AppDbContext context)
        {
            if (await context.Users.AnyAsync(u => u.Email == "tebogo.moremi@email.co.za"))
            {
                return;
            }

            var zenithId = Guid.Parse("a1000000-0000-0000-0000-000000000001");
            var savannaId = Guid.Parse("a2000000-0000-0000-0000-000000000002");

            static string Hash(string value) => BCrypt.Net.BCrypt.HashPassword(value);

            var usersData = new (string Name, string Email, string Pwd, decimal Balance, string Phone, string AccNum, string CustId, bool IsZenith)[]
            {
                // 10 Standard Accounts (R25,000 - R85,000)
                ("Tebogo Moremi", "tebogo.moremi@email.co.za", "1001", 42500.00m, "0821001001", "4010011001", "ZBA-CUST-1001", true),
                ("Khanyisile Sithole", "khanyisile.sithole@email.co.za", "1002", 38200.00m, "0821001002", "4010011002", "ZBA-CUST-1002", true),
                ("Jabulani Dlamini", "jabulani.dlamini@email.co.za", "1003", 56000.00m, "0821001003", "4010011003", "ZBA-CUST-1003", true),
                ("Lerato Khanyile", "lerato.khanyile@email.co.za", "1004", 29400.00m, "0821001004", "4010011004", "ZBA-CUST-1004", true),
                ("Simphiwe Buthelezi", "simphiwe.buthelezi@email.co.za", "1005", 67800.00m, "0821001005", "4010011005", "ZBA-CUST-1005", true),
                ("Boitumelo Phiri", "boitumelo.phiri@email.co.za", "1006", 33150.00m, "0821001006", "4010011006", "SVB-CUST-1006", false),
                ("Nhlanhla Mabena", "nhlanhla.mabena@email.co.za", "1007", 74500.00m, "0821001007", "4010011007", "SVB-CUST-1007", false),
                ("Dineo Motsepe", "dineo.motsepe@email.co.za", "1008", 48900.00m, "0821001008", "4010011008", "SVB-CUST-1008", false),
                ("Katlego Chauke", "katlego.chauke@email.co.za", "1009", 61300.00m, "0821001009", "4010011009", "SVB-CUST-1009", false),
                ("Sinenhlanhla Zulu", "sinenhlanhla.zulu@email.co.za", "1010", 82000.00m, "0821001010", "4010011010", "SVB-CUST-1010", false),

                // 5 Student Accounts (R1,950 - R4,200)
                ("Thato Moloi", "thato.moloi@email.co.za", "1011", 2150.00m, "0821001011", "4010011011", "ZBA-CUST-1011", true),
                ("Lesego Tau", "lesego.tau@email.co.za", "1012", 3800.00m, "0821001012", "4010011012", "ZBA-CUST-1012", true),
                ("Ntando Gumede", "ntando.gumede@email.co.za", "1013", 2450.00m, "0821001013", "4010011013", "SVB-CUST-1013", false),
                ("Kagiso Matlala", "kagiso.matlala@email.co.za", "1014", 4200.00m, "0821001014", "4010011014", "SVB-CUST-1014", false),
                ("Anele Mtshali", "anele.mtshali@email.co.za", "1015", 1950.00m, "0821001015", "4010011015", "SVB-CUST-1015", false),

                // 10 Extremely Rich Accounts (R5,000,000+)
                ("Patrice Radebe", "patrice.radebe@email.co.za", "2001", 5450000.00m, "0822002001", "4020012001", "ZBA-CUST-2001", true),
                ("Khulubuse Mthembu", "khulubuse.mthembu@email.co.za", "2002", 7800000.00m, "0822002002", "4020012002", "ZBA-CUST-2002", true),
                ("Bridgette Mabandla", "bridgette.mabandla@email.co.za", "2003", 12500000.00m, "0822002003", "4020012003", "ZBA-CUST-2003", true),
                ("Johann Van Der Merwe", "johann.vandermerwe@email.co.za", "2004", 18250000.00m, "0822002004", "4020012004", "ZBA-CUST-2004", true),
                ("Nonkululeko Nyembezi", "nonkululeko.nyembezi@email.co.za", "2005", 9600000.00m, "0822002005", "4020012005", "ZBA-CUST-2005", true),
                ("Tokyo Sexwale", "tokyo.sexwale@email.co.za", "2006", 25400000.00m, "0822002006", "4020012006", "SVB-CUST-2006", false),
                ("Phuthuma Nhleko", "phuthuma.nhleko@email.co.za", "2007", 15750000.00m, "0822002007", "4020012007", "SVB-CUST-2007", false),
                ("Wendy Luhabe", "wendy.luhabe@email.co.za", "2008", 8900000.00m, "0822002008", "4020012008", "SVB-CUST-2008", false),
                ("Sipho Pityana", "sipho.pityana@email.co.za", "2009", 6300000.00m, "0822002009", "4020012009", "SVB-CUST-2009", false),
                ("Irene Charnley", "irene.charnley@email.co.za", "2010", 21000000.00m, "0822002010", "4020012010", "SVB-CUST-2010", false)
            };

            foreach (var item in usersData)
            {
                var userId = Guid.NewGuid();
                var bankId = item.IsZenith ? zenithId : savannaId;

                var user = new User
                {
                    Id = userId,
                    BankIntegrationId = bankId,
                    BankCustomerId = item.CustId,
                    FullName = item.Name,
                    Email = item.Email,
                    PhoneNumber = item.Phone,
                    Status = UserStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                var cred = new AuthCredential
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    PasswordHash = Hash(item.Pwd),
                    NormalPinHash = Hash(item.Pwd),
                    DuressPinHash = string.Empty,
                    CreatedAt = DateTime.UtcNow
                };

                var account = new BankAccount
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    AccountNumber = item.AccNum,
                    AccountName = $"{item.Name} Cheque",
                    AccountType = AccountType.Cheque,
                    AvailableBalance = item.Balance,
                    CurrentBalance = item.Balance,
                    Currency = "ZAR",
                    Status = AccountStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                var ben1 = new Beneficiary
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Name = "Mama Nkosi",
                    BankName = "Zenith Bank Africa",
                    AccountNumber = "5001001001",
                    Reference = "Family Support",
                    Status = BeneficiaryStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                var ben2 = new Beneficiary
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Name = "City Power JHB",
                    BankName = "Savanna Bank",
                    AccountNumber = "5002002002",
                    Reference = "Electricity",
                    Status = BeneficiaryStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                await context.Users.AddAsync(user);
                await context.AuthCredentials.AddAsync(cred);
                await context.BankAccounts.AddAsync(account);
                await context.Beneficiaries.AddRangeAsync(ben1, ben2);
            }

            await context.SaveChangesAsync();
        }
    }
}