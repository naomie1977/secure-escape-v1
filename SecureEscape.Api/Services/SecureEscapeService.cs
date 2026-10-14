using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class SecureEscapeService : ISecureEscapeService
{
    private readonly IDecoyProfileRepository _decoyProfileRepository;
    private readonly ISecureEscapeEnrollmentRepository _enrollmentRepository;
    private readonly IEmergencyContactRepository _emergencyContactRepository;
    private readonly IUserRepository _userRepository;
    private readonly IHashingService _hashingService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;
    private readonly IUnitOfWork _unitOfWork;

    public SecureEscapeService(
        IDecoyProfileRepository decoyProfileRepository,
        ISecureEscapeEnrollmentRepository enrollmentRepository,
        IEmergencyContactRepository emergencyContactRepository,
        IUserRepository userRepository,
        IHashingService hashingService,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _decoyProfileRepository = decoyProfileRepository;
        _enrollmentRepository = enrollmentRepository;
        _emergencyContactRepository = emergencyContactRepository;
        _userRepository = userRepository;
        _hashingService = hashingService;
        _currentUserService = currentUserService;
        _auditService = auditService;
        _unitOfWork = unitOfWork;
    }

    public async Task<DecoyProfileResponseDto?> GetActiveDecoyProfileAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var decoyProfile =
            await _decoyProfileRepository.GetActiveByUserIdAsync(
                currentUser.UserId);

        return decoyProfile == null
            ? null
            : MapToResponse(decoyProfile);
    }

    public async Task<DecoyProfileResponseDto> UpsertDecoyProfileAsync(
        UpsertDecoyProfileRequestDto request)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var decoyProfile =
            await _decoyProfileRepository.GetActiveByUserIdAsync(
                currentUser.UserId);

        if (decoyProfile == null)
        {
            decoyProfile = new DecoyProfile
            {
                Id = Guid.NewGuid(),
                UserId = currentUser.UserId,
                ProfileType = request.ProfileType,
                DisplayBalance = request.DisplayBalance,
                EmergencyBudget = request.EmergencyBudget,
                Tier1Limit = request.Tier1Limit,
                Tier2Limit = request.Tier2Limit,
                Tier2DelayHours = request.Tier2DelayHours,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _decoyProfileRepository.AddAsync(decoyProfile);
        }
        else
        {
            decoyProfile.ProfileType = request.ProfileType;
            decoyProfile.DisplayBalance = request.DisplayBalance;
            decoyProfile.EmergencyBudget = request.EmergencyBudget;
            decoyProfile.Tier1Limit = request.Tier1Limit;
            decoyProfile.Tier2Limit = request.Tier2Limit;
            decoyProfile.Tier2DelayHours = request.Tier2DelayHours;
            decoyProfile.IsActive = true;
            decoyProfile.UpdatedAt = DateTime.UtcNow;

            await _decoyProfileRepository.UpdateAsync(decoyProfile);
        }

        await EnsureEnrollmentStartedAsync(currentUser.UserId);

        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.DecoyProfileUpdated,
            entityType: "DecoyProfile",
            entityId: decoyProfile.Id,
            userId: currentUser.UserId,
            userSessionId: currentUser.UserSessionId);

        return MapToResponse(decoyProfile);
    }

    public async Task<bool> SetDuressPinAsync(
        SetDuressPinRequestDto request)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var user =
            await _userRepository.GetByIdWithCredentialsAsync(
                currentUser.UserId);

        if (user == null || user.AuthCredential == null)
        {
            return false;
        }

        var pinValid = _hashingService.Verify(
            request.CurrentPin,
            user.AuthCredential.NormalPinHash);

        if (!pinValid)
        {
            return false;
        }

        user.AuthCredential.DuressPinHash =
            _hashingService.Hash(request.DuressPin);

        user.AuthCredential.DuressPinUpdatedAt = DateTime.UtcNow;
        user.AuthCredential.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        await EnsureEnrollmentStartedAsync(currentUser.UserId);

        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.DuressPinUpdated,
            entityType: "AuthCredential",
            entityId: user.AuthCredential.Id,
            userId: currentUser.UserId,
            userSessionId: currentUser.UserSessionId,
            metadataJson: "{\"action\":\"Duress PIN updated\"}");

        return true;
    }

    public async Task<object> GetDuressPinStatusAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var user =
            await _userRepository.GetByIdWithCredentialsAsync(
                currentUser.UserId);

        if (user == null || user.AuthCredential == null)
        {
            return new
            {
                duressPinConfigured = false,
                duressPinUpdatedAt = (DateTime?)null
            };
        }

        var credential = user.AuthCredential;

        return new
        {
            duressPinConfigured =
                !string.IsNullOrWhiteSpace(credential.DuressPinHash),

            duressPinUpdatedAt =
                credential.DuressPinUpdatedAt
        };
    }

    public async Task<object> GetEnrollmentStatusAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();
        var userId = currentUser.UserId;

        var enrollment =
            await _enrollmentRepository.GetByUserIdAsync(userId);

        if (enrollment != null &&
            enrollment.Status == SecureEscapeEnrollmentStatus.Active)
        {
            return CreateEnrollmentStatusResponse(
                "Active",
                true,
                true,
                true,
                enrollment.StartedAt,
                enrollment.ActivatedAt);
        }

        var setupState = await GetSetupStateAsync(userId);

        if (setupState.HasAllRequiredComponents)
        {
            enrollment ??= await CreateEnrollmentAsync(userId);

            enrollment.Status =
                SecureEscapeEnrollmentStatus.Active;

            enrollment.ActivatedAt ??= DateTime.UtcNow;
            enrollment.UpdatedAt = DateTime.UtcNow;

            await _enrollmentRepository.UpdateAsync(enrollment);
            await _unitOfWork.SaveChangesAsync();

            return CreateEnrollmentStatusResponse(
                "Active",
                setupState.HasDecoyProfile,
                setupState.HasDuressPin,
                setupState.HasEmergencyContact,
                enrollment.StartedAt,
                enrollment.ActivatedAt);
        }

        if (setupState.HasAnyComponent)
        {
            enrollment ??= await CreateEnrollmentAsync(userId);

            if (enrollment.Status !=
                SecureEscapeEnrollmentStatus.SetupInProgress)
            {
                enrollment.Status =
                    SecureEscapeEnrollmentStatus.SetupInProgress;

                enrollment.ActivatedAt = null;
                enrollment.UpdatedAt = DateTime.UtcNow;

                await _enrollmentRepository.UpdateAsync(enrollment);
            }

            await _unitOfWork.SaveChangesAsync();

            return CreateEnrollmentStatusResponse(
                "SetupInProgress",
                setupState.HasDecoyProfile,
                setupState.HasDuressPin,
                setupState.HasEmergencyContact,
                enrollment.StartedAt,
                enrollment.ActivatedAt);
        }

        return CreateEnrollmentStatusResponse(
            "NotConfigured",
            false,
            false,
            false,
            null,
            null);
    }

    public async Task<bool> CompleteEnrollmentAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();
        var userId = currentUser.UserId;

        var setupState = await GetSetupStateAsync(userId);

        if (!setupState.HasAllRequiredComponents)
        {
            return false;
        }

        var enrollment =
            await _enrollmentRepository.GetByUserIdAsync(userId);

        enrollment ??= await CreateEnrollmentAsync(userId);

        enrollment.Status =
            SecureEscapeEnrollmentStatus.Active;

        enrollment.ActivatedAt ??= DateTime.UtcNow;
        enrollment.UpdatedAt = DateTime.UtcNow;

        await _enrollmentRepository.UpdateAsync(enrollment);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    private async Task EnsureEnrollmentStartedAsync(Guid userId)
    {
        var enrollment =
            await _enrollmentRepository.GetByUserIdAsync(userId);

        if (enrollment != null)
        {
            return;
        }

        await _enrollmentRepository.AddAsync(
            new SecureEscapeEnrollment
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status =
                    SecureEscapeEnrollmentStatus.SetupInProgress,
                StartedAt = DateTime.UtcNow
            });
    }

    private async Task<SecureEscapeEnrollment> CreateEnrollmentAsync(
        Guid userId)
    {
        var enrollment = new SecureEscapeEnrollment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status =
                SecureEscapeEnrollmentStatus.SetupInProgress,
            StartedAt = DateTime.UtcNow
        };

        await _enrollmentRepository.AddAsync(enrollment);

        return enrollment;
    }

    private async Task<SetupState> GetSetupStateAsync(Guid userId)
    {
        var decoyProfile =
            await _decoyProfileRepository.GetActiveByUserIdAsync(userId);

        var user =
            await _userRepository.GetByIdWithCredentialsAsync(userId);

        var contacts =
            await _emergencyContactRepository.GetAllByUserIdAsync(userId);

        var hasDecoyProfile =
            decoyProfile != null && decoyProfile.IsActive;

        var hasDuressPin =
            user?.AuthCredential != null &&
            !string.IsNullOrWhiteSpace(
                user.AuthCredential.DuressPinHash);

        var hasEmergencyContact =
            contacts.Any(contact =>
                contact.Status == EmergencyContactStatus.Active);

        return new SetupState(
            hasDecoyProfile,
            hasDuressPin,
            hasEmergencyContact);
    }

    private static object CreateEnrollmentStatusResponse(
        string status,
        bool hasDecoyProfile,
        bool hasDuressPin,
        bool hasEmergencyContact,
        DateTime? startedAt,
        DateTime? activatedAt)
    {
        return new
        {
            status,
            isActive = status == "Active",
            hasDecoyProfile,
            hasDuressPin,
            hasEmergencyContact,
            startedAt,
            activatedAt
        };
    }

    private static DecoyProfileResponseDto MapToResponse(
        DecoyProfile decoyProfile)
    {
        return new DecoyProfileResponseDto
        {
            Id = decoyProfile.Id,
            UserId = decoyProfile.UserId,
            ProfileType = decoyProfile.ProfileType,
            DisplayBalance = decoyProfile.DisplayBalance,
            EmergencyBudget = decoyProfile.EmergencyBudget,
            Tier1Limit = decoyProfile.Tier1Limit,
            Tier2Limit = decoyProfile.Tier2Limit,
            Tier2DelayHours = decoyProfile.Tier2DelayHours,
            IsActive = decoyProfile.IsActive,
            CreatedAt = decoyProfile.CreatedAt,
            UpdatedAt = decoyProfile.UpdatedAt
        };
    }

    private sealed record SetupState(
        bool HasDecoyProfile,
        bool HasDuressPin,
        bool HasEmergencyContact)
    {
        public bool HasAnyComponent =>
            HasDecoyProfile ||
            HasDuressPin ||
            HasEmergencyContact;

        public bool HasAllRequiredComponents =>
            HasDecoyProfile &&
            HasDuressPin;
    }
}