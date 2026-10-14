using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class BeneficiaryService : IBeneficiaryService
{
    private readonly IBeneficiaryRepository _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUnitOfWork _unitOfWork;

    public BeneficiaryService(
    IBeneficiaryRepository repository,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<BeneficiaryResponseDto>> GetAllAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();
        var beneficiaries = await _repository.GetAllByUserIdAsync(currentUser.UserId);
        return beneficiaries.Select(MapToResponse).ToList();
    }

    public async Task<BeneficiaryResponseDto> AddAsync(AddBeneficiaryRequestDto request)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var existing = await _repository.GetByAccountNumberAsync(currentUser.UserId, request.AccountNumber);

        if (existing != null)
        {
            throw new InvalidOperationException("A beneficiary with this account number already exists.");
        }

        var beneficiary = new Beneficiary
        {
            Id = Guid.NewGuid(),
            UserId = currentUser.UserId,
            Name = request.Name,
            BankName = request.BankName,
            AccountNumber = request.AccountNumber,
            Reference = request.Reference,
            Status = BeneficiaryStatus.Active,
            CreatedUnderDuress = currentUser.SessionMode == SessionMode.Duress,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(beneficiary);
        await _unitOfWork.SaveChangesAsync();

        return MapToResponse(beneficiary);
    }

    public async Task<bool> DeactivateAsync(Guid id)
    {
        var currentUser = _currentUserService.GetCurrentUser();
        var beneficiary = await _repository.GetByIdForUserAsync(id, currentUser.UserId);

        if (beneficiary == null) return false;

        beneficiary.Status = BeneficiaryStatus.Inactive;
        beneficiary.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(beneficiary);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    private static BeneficiaryResponseDto MapToResponse(Beneficiary b) => new()
    {
        Id = b.Id,
        Name = b.Name,
        BankName = b.BankName,
        AccountNumber = b.AccountNumber,
        Reference = b.Reference,
        Status = b.Status,
        CreatedAt = b.CreatedAt,
        LastPaidAt = b.LastPaidAt,
    };
}