using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class EmergencyContactService : IEmergencyContactService
{
    private readonly IEmergencyContactRepository _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUnitOfWork _unitOfWork;

    public EmergencyContactService(
        IEmergencyContactRepository repository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<EmergencyContactResponseDto>> GetAllAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var contacts =
            await _repository.GetAllByUserIdAsync(currentUser.UserId);

        return contacts.Select(MapToResponse).ToList();
    }

    public async Task<EmergencyContactResponseDto> AddAsync(
        AddEmergencyContactRequestDto request)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        if (request.IsPrimary)
        {
            var existing =
                await _repository.GetAllByUserIdAsync(currentUser.UserId);

            foreach (var c in existing.Where(x => x.IsPrimary))
            {
                c.IsPrimary = false;
                c.UpdatedAt = DateTime.UtcNow;
                await _repository.UpdateAsync(c);
            }
        }

        var contact = new EmergencyContact
        {
            Id = Guid.NewGuid(),
            UserId = currentUser.UserId,
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = request.Email.Trim(),
            Relationship = request.Relationship.Trim(),
            IsPrimary = request.IsPrimary,
            NotifyOnDuress = request.NotifyOnDuress,
            Status = EmergencyContactStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(contact);
        await _unitOfWork.SaveChangesAsync();

        return MapToResponse(contact);
    }

    public async Task<EmergencyContactResponseDto?> UpdateAsync(
        Guid id,
        UpdateEmergencyContactRequestDto request)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var contact =
            await _repository.GetByIdForUserAsync(
                id,
                currentUser.UserId);

        if (contact == null)
        {
            return null;
        }

        if (request.IsPrimary && !contact.IsPrimary)
        {
            var existing =
                await _repository.GetAllByUserIdAsync(currentUser.UserId);

            foreach (
                var existingContact in existing.Where(
                    x => x.Id != contact.Id && x.IsPrimary))
            {
                existingContact.IsPrimary = false;
                existingContact.UpdatedAt = DateTime.UtcNow;

                await _repository.UpdateAsync(existingContact);
            }
        }

        contact.FullName = request.FullName.Trim();
        contact.PhoneNumber = request.PhoneNumber.Trim();
        contact.Email = request.Email.Trim();
        contact.Relationship = request.Relationship.Trim();
        contact.IsPrimary = request.IsPrimary;
        contact.NotifyOnDuress = request.NotifyOnDuress;
        contact.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(contact);
        await _unitOfWork.SaveChangesAsync();

        return MapToResponse(contact);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var contact =
            await _repository.GetByIdForUserAsync(
                id,
                currentUser.UserId);

        if (contact == null)
        {
            return false;
        }

        var contacts =
            await _repository.GetAllByUserIdAsync(currentUser.UserId);

        if (contacts.Count <= 1)
        {
            throw new InvalidOperationException(
                "At least one emergency contact is required while Secure Escape is active. Add another contact before deleting this one.");
        }

        await _repository.DeleteAsync(contact);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    private static EmergencyContactResponseDto MapToResponse(
        EmergencyContact c) => new()
    {
        Id = c.Id,
        FullName = c.FullName,
        PhoneNumber = c.PhoneNumber,
        Email = c.Email,
        Relationship = c.Relationship,
        IsPrimary = c.IsPrimary,
        NotifyOnDuress = c.NotifyOnDuress,
        CreatedAt = c.CreatedAt
    };
}