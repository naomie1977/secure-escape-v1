using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Data;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class DuressBudgetService(AppDbContext db)
{
    public const string VerificationMessage = "For your security, this payment requires an additional banking verification. The request has been placed on hold while the verification is completed. No funds have been released.";
    private const decimal LowProfileRate = 0.07m;
    private const decimal RealisticDecoyRate = 0.20m;
    private const decimal LowProfilePendingRate = 0.50m;
    private const decimal RealisticDecoyPendingRate = 0.50m;

    public static decimal Calculate(decimal balance) =>
        Math.Clamp(Math.Round(balance * LowProfileRate, 2, MidpointRounding.AwayFromZero), 200m, 50000m);

    public static decimal CalculateRealisticDecoy(decimal balance) =>
        Math.Max(200m, Math.Round(balance * RealisticDecoyRate, 2, MidpointRounding.AwayFromZero));

    // Called only when creating a new duress session. Never recompute on spending.
    public static async Task InitializeAsync(AppDbContext db, UserSession session)
    {
        var accounts = await db.BankAccounts.Where(x => x.UserId == session.UserId && x.Status == AccountStatus.Active)
            .OrderBy(x => x.AccountName).ToListAsync();
        var main = accounts.FirstOrDefault(x => x.AccountType == AccountType.Cheque) ?? accounts.FirstOrDefault();
        var profile = await db.DecoyProfiles
            .Where(x => x.UserId == session.UserId && x.IsActive)
            .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
            .FirstOrDefaultAsync();
        var existing = await db.Beneficiaries.Where(x => x.UserId == session.UserId && !x.CreatedUnderDuress)
            .Select(x => x.Id).ToListAsync();
        var isRealistic = profile != null && (profile.ProfileType == DecoyProfileType.Custom || profile.ProfileType.ToString() == "RealisticDecoy" || profile.ProfileType.ToString() == "Custom");
        var recommendedAmount = main == null
            ? 0
            : isRealistic
                ? CalculateRealisticDecoy(main.AvailableBalance)
                : Calculate(main.AvailableBalance);
        // Preserve the amount shown and accepted during setup. Fall back to the
        // legacy emergency budget for profiles created before DisplayBalance was used.
        var amount = profile?.DisplayBalance > 0
            ? profile.DisplayBalance
            : profile?.EmergencyBudget > 0
                ? profile.EmergencyBudget
                : recommendedAmount;
        if (main != null)
            amount = Math.Min(amount, main.AvailableBalance);
        var spendingLimit = isRealistic ? amount * RealisticDecoyPendingRate : amount;
        db.DuressBudgets.Add(new DuressBudget
        {
            UserSessionId = session.Id,
            BankAccountId = main?.Id,
            OriginalBalance = amount,
            RemainingBalance = amount,
            OriginalSpendingLimit = spendingLimit,
            RemainingSpendingLimit = spendingLimit,
            PendingThresholdRate = isRealistic ? RealisticDecoyPendingRate : 1.00m,
            ExistingBeneficiaryIdsJson = JsonSerializer.Serialize(existing),
        });
    }

    public Task<DuressBudget?> GetAsync(Guid sessionId) =>
        db.DuressBudgets.SingleOrDefaultAsync(x => x.UserSessionId == sessionId);

    public async Task ApplyAsync(BankTransaction transaction, BankAccount account)
    {
        var budget = await GetAsync(transaction.UserSessionId);
        if (budget == null || budget.BankAccountId != account.Id || transaction.Amount <= 0 ||
            transaction.Amount > budget.RemainingBalance || account.Status != AccountStatus.Active ||
            transaction.Amount > account.AvailableBalance)
        {
            CheckFunds(transaction, account, budget);
            return;
        }

        // Under duress in Realistic Decoy, every transaction exceeding 50% of the budget triggers Tier 2 Pending hold.
        // For Low Profile, PendingThresholdRate is 1.00m so transfers within remaining budget are immediate.
        if (budget.PendingThresholdRate < 1.00m && transaction.Amount > budget.OriginalBalance * budget.PendingThresholdRate)
        {
            transaction.Status = TransactionStatus.Pending;
            transaction.StatusReason = VerificationMessage;
            return;
        }

        if (!CheckFunds(transaction, account, budget)) return;
        Debit(transaction, account, budget);
    }

    public static bool CheckFunds(BankTransaction transaction, BankAccount account, DuressBudget? budget)
    {
        var remaining = budget?.BankAccountId == account.Id
            ? Math.Max(0, budget.RemainingSpendingLimit > 0 ? budget.RemainingSpendingLimit : budget.RemainingBalance)
            : 0;
        // Tier 3 must run before beneficiary/tier checks, including at review time.
        if (budget == null || transaction.Amount > remaining || transaction.Amount <= 0)
        {
            transaction.Status = TransactionStatus.Failed;
            transaction.StatusReason = $"Insufficient protected spending balance. Your remaining protected balance is R{remaining.ToString("N2", CultureInfo.GetCultureInfo("en-ZA"))}. This transaction exceeds the amount currently available during Secure Escape protection.";
            return false;
        }
        if (account.Status != AccountStatus.Active || transaction.Amount > account.AvailableBalance)
        {
            transaction.Status = TransactionStatus.Failed;
            transaction.StatusReason = "This transaction could not be processed. Please contact your bank.";
            return false;
        }
        return true;
    }

    public static void Debit(BankTransaction transaction, BankAccount account, DuressBudget budget)
    {
        budget.RemainingBalance -= transaction.Amount;
        budget.RemainingSpendingLimit = Math.Max(0, budget.RemainingSpendingLimit > 0
            ? budget.RemainingSpendingLimit - transaction.Amount
            : budget.RemainingBalance);
        account.AvailableBalance -= transaction.Amount;
        account.CurrentBalance -= transaction.Amount;
        account.UpdatedAt = DateTime.UtcNow;
        transaction.Status = TransactionStatus.DecoyApproved;
        transaction.StatusReason = null;
        transaction.SecureEscapeCode = $"SE-{transaction.UserSessionId:N}-{DateTime.UtcNow:yyyyMMddHHmmss}";
    }
}

