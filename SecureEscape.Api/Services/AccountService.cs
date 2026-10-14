using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class AccountService : IAccountService
{
    private readonly IBankAccountRepository _bankAccountRepository;
    private readonly IDecoyProfileRepository _decoyProfileRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly DuressBudgetService _duressBudgetService;

    public AccountService(
        IBankAccountRepository bankAccountRepository,
        IDecoyProfileRepository decoyProfileRepository,
        ICurrentUserService currentUserService,
        DuressBudgetService duressBudgetService)
    {
        _bankAccountRepository = bankAccountRepository;
        _decoyProfileRepository = decoyProfileRepository;
        _currentUserService = currentUserService;
        _duressBudgetService = duressBudgetService;
    }

    public async Task<List<AccountResponseDto>> GetCurrentUserAccountsAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var accounts = await _bankAccountRepository.GetByUserIdAsync(currentUser.UserId);

        var budget = currentUser.SessionMode == SessionMode.Duress
            ? await _duressBudgetService.GetAsync(currentUser.UserSessionId)
            : null;

        return accounts
            .Select(account => MapToResponse(account, budget, currentUser.SessionMode))
            .ToList();
    }

    public async Task<AccountResponseDto?> GetCurrentUserAccountByIdAsync(Guid accountId)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var account = await _bankAccountRepository.GetByIdForUserAsync(
            accountId,
            currentUser.UserId);

        if (account == null)
        {
            return null;
        }

        var budget = currentUser.SessionMode == SessionMode.Duress
            ? await _duressBudgetService.GetAsync(currentUser.UserSessionId)
            : null;

        return MapToResponse(account, budget, currentUser.SessionMode);
    }

    private static AccountResponseDto MapToResponse(
        BankAccount account,
        DuressBudget? budget,
        SessionMode sessionMode)
    {
        var isDuress = sessionMode == SessionMode.Duress;
        var isDecoyView = isDuress;

        var availableBalance = account.AvailableBalance;
        var currentBalance = account.CurrentBalance;

        if (isDecoyView)
        {
            availableBalance = budget?.BankAccountId == account.Id
                ? Math.Max(0, budget.RemainingBalance)
                : 0;
            currentBalance = availableBalance;
        }

        return new AccountResponseDto
        {
            Id = account.Id,
            AccountNumber = account.AccountNumber,
            AccountName = account.AccountName,
            AccountType = account.AccountType,
            AvailableBalance = availableBalance,
            CurrentBalance = currentBalance,
            Currency = account.Currency,
            Status = account.Status,
            IsDecoyView = isDecoyView
        };
    }
}