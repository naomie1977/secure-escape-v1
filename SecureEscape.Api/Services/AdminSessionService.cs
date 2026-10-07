using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class AdminSessionService : IAdminSessionService
{
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IAuditService _auditService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IBankAccountRepository _bankAccountRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public AdminSessionService(
        INotificationDispatchService notificationDispatchService,
        IUserSessionRepository userSessionRepository,
        IBankAccountRepository bankAccountRepository,
        IAuditService auditService,
        IUnitOfWork unitOfWork)
    {
        _userSessionRepository = userSessionRepository;
        _bankAccountRepository = bankAccountRepository;
        _notificationDispatchService = notificationDispatchService;
        _auditService = auditService;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<DuressSessionSummaryResponseDto>> GetDuressSessionsAsync(
        Guid? bankIntegrationId)
    {
        await ExpireStaleActiveSessionsAsync();

        var sessions =
            await _userSessionRepository.GetDuressSessionsAsync(
                bankIntegrationId);

        return sessions.Select(MapToSummary).ToList();
    }

    private async Task ExpireStaleActiveSessionsAsync()
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-1);

        var staleSessions = await _userSessionRepository
            .GetStaleActiveSessionsAsync(cutoffTime);

        if (!staleSessions.Any())
        {
            return;
        }

        var now = DateTime.UtcNow;

        foreach (var session in staleSessions)
        {
            session.Status = SessionStatus.Expired;
            session.EndedAt = now;
            session.UpdatedAt = now;

            await _userSessionRepository.UpdateAsync(session);
        }

        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<DuressSessionDetailResponseDto?> GetDuressSessionDetailAsync(
        Guid sessionId,
        Guid? bankIntegrationId)
    {
        var session = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        if (bankIntegrationId.HasValue &&
            session.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        return MapToDetail(session);
    }

    public async Task<DuressSessionDetailResponseDto?> AssignSessionAsync(
        Guid sessionId,
        AssignSessionRequestDto request,
        Guid? bankIntegrationId,
        Guid assignedByAdminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        session.AssignedAdminUserId = request.AdminUserId;
        session.AssignedAt = DateTime.UtcNow;
        session.CaseStatus = CaseStatus.Investigating;
        session.UpdatedAt = DateTime.UtcNow;

        await _userSessionRepository.UpdateAsync(session);

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = assignedByAdminUserId,
            ActionType = AlertActionType.Assigned,
            Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? $"Case assigned to admin user {request.AdminUserId}."
                : request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: assignedByAdminUserId,
            metadataJson:
                $"{{\"assignedAdminUserId\":\"{request.AdminUserId}\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> ClaimSessionAsync(
        Guid sessionId,
        Guid? bankIntegrationId,
        Guid adminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        if (session.AssignedAdminUserId.HasValue)
        {
            return null;
        }

        session.AssignedAdminUserId = adminUserId;
        session.AssignedAt = DateTime.UtcNow;
        session.CaseStatus = CaseStatus.Investigating;
        session.UpdatedAt = DateTime.UtcNow;

        await _userSessionRepository.UpdateAsync(session);

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = adminUserId,
            ActionType = AlertActionType.Assigned,
            Notes = "Fraud analyst claimed this case for investigation.",
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: adminUserId,
            metadataJson:
                $"{{\"claimedByAdminUserId\":\"{adminUserId}\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> DispatchSessionNotificationsAsync(
        Guid sessionId,
        Guid? bankIntegrationId)
    {
        var session = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        if (bankIntegrationId.HasValue &&
            session.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        await _notificationDispatchService
            .DispatchPendingForSessionAsync(session.Id);

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> UpdateCaseStatusAsync(
        Guid sessionId,
        UpdateCaseStatusRequestDto request,
        Guid? bankIntegrationId,
        Guid adminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        // Resolved and FalseAlarm are final case outcomes.
        // They must not be set through this generic status endpoint.
        // Resolved is reached through manager approval.
        if (request.CaseStatus == CaseStatus.Resolved ||
            request.CaseStatus == CaseStatus.FalseAlarm)
        {
            return null;
        }

        if (session.AssignedAdminUserId == null)
        {
            session.AssignedAdminUserId = adminUserId;
            session.AssignedAt ??= DateTime.UtcNow;
        }

        session.CaseStatus = request.CaseStatus;
        session.CaseResolvedAt = null;
        session.ResolvedByAdminUserId = null;
        session.UpdatedAt = DateTime.UtcNow;

        await _userSessionRepository.UpdateAsync(session);

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = adminUserId,
            ActionType = AlertActionType.Assigned,
            Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? $"Case status updated to {request.CaseStatus}."
                : request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: adminUserId,
            metadataJson:
                $"{{\"caseStatus\":\"{request.CaseStatus}\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> AddCaseActionAsync(
        Guid sessionId,
        CreateCaseActionRequestDto request,
        Guid? bankIntegrationId,
        Guid adminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = adminUserId,
            ActionType = request.ActionType,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "AlertAction",
            entityId: action.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: adminUserId,
            metadataJson:
                $"{{\"actionType\":\"{request.ActionType}\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> FreezeAccountAsync(
        Guid sessionId,
        Guid? bankIntegrationId,
        Guid adminUserId)
    {
        var session = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        if (bankIntegrationId.HasValue &&
            session.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        var accounts = await _bankAccountRepository
            .GetByUserIdForAdminAsync(session.UserId);

        foreach (var account in accounts)
        {
            account.Status = AccountStatus.Frozen;
            account.UpdatedAt = DateTime.UtcNow;

            await _bankAccountRepository.UpdateAsync(account);
        }

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            ActionType = AlertActionType.FrozeAccount,
            AdminUserId = adminUserId,
            Notes =
                $"All accounts frozen by fraud team at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC.",
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AccountFrozen,
            entityType: "BankAccount",
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: adminUserId,
            metadataJson:
                $"{{\"accountCount\":{accounts.Count},\"frozenBy\":\"FraudTeam\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> SubmitCaseReportAsync(
        Guid sessionId,
        SubmitCaseReportRequestDto request,
        Guid? bankIntegrationId,
        Guid adminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        if (session.AssignedAdminUserId != adminUserId)
        {
            return null;
        }

        session.InvestigationSummary = request.InvestigationSummary;
        session.ResolutionSummary = request.ResolutionSummary;
        session.ResolutionSubmittedAt = DateTime.UtcNow;

        // Submitting the report does not resolve the case.
        // A manager must review the analyst's recommendation.
        session.CaseStatus = CaseStatus.Investigating;
        session.CaseResolvedAt = null;
        session.ResolvedByAdminUserId = null;

        session.ManagerReviewStatus =
            ManagerReviewStatus.PendingReview;

        // A resubmission creates a new pending review.
        // Previous return feedback remains preserved in AlertActions.
        session.ManagerReviewedByAdminUserId = null;
        session.ManagerReviewedAt = null;
        session.ManagerReviewNotes = string.Empty;

        session.UpdatedAt = DateTime.UtcNow;

        await _userSessionRepository.UpdateAsync(session);

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = adminUserId,
            ActionType = AlertActionType.ReportSubmitted,
            Notes =
                "Analyst submitted investigation report for manager review.",
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: adminUserId,
            metadataJson:
                "{\"caseStatus\":\"Investigating\",\"managerReviewStatus\":\"PendingReview\"}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    public async Task<DuressSessionDetailResponseDto?> ManagerReviewCaseAsync(
        Guid sessionId,
        ManagerReviewCaseRequestDto request,
        Guid? bankIntegrationId,
        Guid managerAdminUserId)
    {
        var session =
            await _userSessionRepository.GetByIdAsync(sessionId);

        if (session == null)
        {
            return null;
        }

        var detail = await _userSessionRepository
            .GetDuressSessionDetailAsync(sessionId);

        if (bankIntegrationId.HasValue &&
            detail?.User?.BankIntegrationId != bankIntegrationId.Value)
        {
            return null;
        }

        if (request.ReviewStatus != ManagerReviewStatus.Approved &&
            request.ReviewStatus != ManagerReviewStatus.Rejected)
        {
            return null;
        }

        // Returning a report requires actionable feedback.
        if (request.ReviewStatus == ManagerReviewStatus.Rejected &&
            string.IsNullOrWhiteSpace(request.ReviewNotes))
        {
            return null;
        }

        if (session.ManagerReviewStatus !=
            ManagerReviewStatus.PendingReview)
        {
            return null;
        }

        var cleanedReviewNotes =
            request.ReviewNotes?.Trim() ?? string.Empty;

        session.ManagerReviewStatus = request.ReviewStatus;
        session.ManagerReviewedByAdminUserId =
            managerAdminUserId;
        session.ManagerReviewedAt = DateTime.UtcNow;
        session.ManagerReviewNotes = cleanedReviewNotes;
        session.UpdatedAt = DateTime.UtcNow;

        AlertActionType actionType;
        string actionNotes;

        if (request.ReviewStatus ==
            ManagerReviewStatus.Approved)
        {
            // Manager approval is the formal resolution point.
            session.CaseStatus = CaseStatus.Resolved;
            session.CaseResolvedAt = DateTime.UtcNow;
            session.ResolvedByAdminUserId =
                managerAdminUserId;

            actionType = AlertActionType.Resolved;

            actionNotes =
                string.IsNullOrWhiteSpace(cleanedReviewNotes)
                    ? "Manager approved the analyst report and resolved the case."
                    : cleanedReviewNotes;
        }
        else
        {
            // Returned reports go back to the analyst.
            session.CaseStatus = CaseStatus.Investigating;
            session.CaseResolvedAt = null;
            session.ResolvedByAdminUserId = null;

            actionType =
                AlertActionType.ReturnedForChanges;

            actionNotes = cleanedReviewNotes;
        }

        await _userSessionRepository.UpdateAsync(session);

        var action = new AlertAction
        {
            Id = Guid.NewGuid(),
            UserSessionId = session.Id,
            AdminUserId = managerAdminUserId,
            ActionType = actionType,
            Notes = actionNotes,
            CreatedAt = DateTime.UtcNow
        };

        await _userSessionRepository.AddActionAsync(action);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.AlertStatusUpdated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: session.UserId,
            userSessionId: session.Id,
            adminUserId: managerAdminUserId,
            metadataJson:
                $"{{\"caseStatus\":\"{session.CaseStatus}\",\"managerReviewStatus\":\"{request.ReviewStatus}\"}}");

        return await GetDuressSessionDetailAsync(
            sessionId,
            bankIntegrationId);
    }

    private static DuressSessionSummaryResponseDto MapToSummary(
        UserSession session)
    {
        var highestSeverity = session.Alerts.Any()
            ? session.Alerts.Max(a => a.Severity)
            : RiskLevel.Low;

        var latestLocation = session.LocationEvents
            .OrderByDescending(l => l.CapturedAt)
            .FirstOrDefault();

        return new DuressSessionSummaryResponseDto
        {
            Id = session.Id,
            UserId = session.UserId,

            CustomerName =
                session.User?.FullName ?? string.Empty,

            CustomerEmail =
                session.User?.Email ?? string.Empty,

            Status = session.Status,
            StartedAt = session.StartedAt,
            CaseStatus = session.CaseStatus,

            LastAlertAt = session.Alerts
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => (DateTime?)a.CreatedAt)
                .FirstOrDefault(),

            LastLocationAt =
                latestLocation?.CapturedAt,

            LatestLatitude =
                latestLocation?.Latitude,

            LatestLongitude =
                latestLocation?.Longitude,

            LatestAccuracyMeters =
                latestLocation?.AccuracyMeters,

            EndedAt = session.EndedAt,

            AlertCount = session.Alerts.Count,

            HighestSeverity = highestSeverity,

            AlertTypes = session.Alerts
                .Select(a => a.Type.ToString())
                .Distinct()
                .ToList(),

            AssignedAdminUserId =
                session.AssignedAdminUserId,

            AssignedAdminName =
                session.AssignedAdminUser?.FullName,

            AssignedAt =
                session.AssignedAt,

            ManagerReviewStatus =
                session.ManagerReviewStatus,

            ResolutionSubmittedAt =
                session.ResolutionSubmittedAt,

            ManagerReviewedAt =
                session.ManagerReviewedAt
        };
    }

    private static DuressSessionDetailResponseDto MapToDetail(
        UserSession session)
    {
        return new DuressSessionDetailResponseDto
        {
            Id = session.Id,
            UserId = session.UserId,

            CustomerName =
                session.User?.FullName ?? string.Empty,

            CustomerEmail =
                session.User?.Email ?? string.Empty,

            CustomerPhoneNumber =
                session.User?.PhoneNumber ?? string.Empty,

            Mode = session.Mode,
            Status = session.Status,
            CaseStatus = session.CaseStatus,

            AssignedAdminName =
                session.AssignedAdminUser?.FullName,

            AssignedAdminUserId =
                session.AssignedAdminUserId,

            AssignedAt =
                session.AssignedAt,

            IpAddress = session.IpAddress,
            DeviceInfo = session.DeviceInfo,

            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,

            CaseResolvedAt =
                session.CaseResolvedAt,

            InvestigationSummary =
                session.InvestigationSummary,

            ResolutionSummary =
                session.ResolutionSummary,

            ResolvedByAdminUserId =
                session.ResolvedByAdminUserId,

            ResolutionSubmittedAt =
                session.ResolutionSubmittedAt,

            ManagerReviewStatus =
                session.ManagerReviewStatus,

            ManagerReviewedByAdminUserId =
                session.ManagerReviewedByAdminUserId,

            ManagerReviewedAt =
                session.ManagerReviewedAt,

            ManagerReviewNotes =
                session.ManagerReviewNotes,

            AlertCount =
                session.Alerts.Count,

            TransactionCount =
                session.Transactions.Count,

            LocationCount =
                session.LocationEvents.Count,

            NotificationAttemptCount =
                session.Alerts
                    .SelectMany(a => a.NotificationAttempts)
                    .Count(),

            HighestSeverity =
                session.Alerts.Any()
                    ? session.Alerts.Max(a => a.Severity)
                    : RiskLevel.Low,

            LastLocationAt =
                session.LocationEvents
                    .OrderByDescending(l => l.CapturedAt)
                    .Select(l => (DateTime?)l.CapturedAt)
                    .FirstOrDefault(),

            LastAlertAt =
                session.Alerts
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(a => (DateTime?)a.CreatedAt)
                    .FirstOrDefault(),

            AccountsFrozen =
                session.User?.BankAccounts
                    .Any(a => a.Status == AccountStatus.Frozen)
                ?? false,

            Alerts =
                session.Alerts
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(MapToAlertLog)
                    .ToList(),

            Transactions =
                session.Transactions
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(MapToTransaction)
                    .ToList(),

            Locations =
                session.LocationEvents
                    .OrderByDescending(l => l.CapturedAt)
                    .Select(MapToLocation)
                    .ToList(),

            Actions =
                session.AlertActions
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(MapToAction)
                    .ToList()
        };
    }

    private static SessionAlertLogResponseDto MapToAlertLog(
        Alert alert)
    {
        return new SessionAlertLogResponseDto
        {
            Id = alert.Id,
            Type = alert.Type,
            Severity = alert.Severity,
            Description = alert.Description,
            Status = alert.Status,
            ResolvedAt = alert.ResolvedAt,
            CreatedAt = alert.CreatedAt,

            NotificationAttempts =
                alert.NotificationAttempts
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(MapToNotificationAttempt)
                    .ToList()
        };
    }

    private static AlertLocationResponseDto MapToLocation(
        LocationEvent location)
    {
        return new AlertLocationResponseDto
        {
            Id = location.Id,
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            AccuracyMeters = location.AccuracyMeters,
            LocationSource = location.LocationSource,
            CapturedAt = location.CapturedAt,
            CreatedAt = location.CreatedAt
        };
    }

    private static AlertTransactionResponseDto MapToTransaction(
        BankTransaction transaction)
    {
        return new AlertTransactionResponseDto
        {
            Id = transaction.Id,
            BankAccountId = transaction.BankAccountId,
            BeneficiaryId = transaction.BeneficiaryId,

            BeneficiaryName =
                transaction.Beneficiary?.Name
                ?? transaction.RecipientName,

            BeneficiaryBank =
                transaction.Beneficiary?.BankName
                ?? transaction.RecipientBank,

            BeneficiaryAccountNumber =
                transaction.Beneficiary?.AccountNumber
                ?? transaction.RecipientAccountNumber,

            BeneficiaryAccountType =
                transaction.RecipientAccountType,

            BeneficiaryBranchCode =
                transaction.RecipientBranchCode,

            BeneficiaryReference =
                transaction.Beneficiary?.Reference,

            BeneficiaryStatus =
                transaction.Beneficiary?.Status,

            BeneficiaryLastPaidAt =
                transaction.Beneficiary?.LastPaidAt,

            BankReference = transaction.BankReference,
            TransactionType = transaction.TransactionType,
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Status = transaction.Status,
            StatusReason = transaction.StatusReason,
            Flagged = transaction.Flagged,
            RiskLevel = transaction.RiskLevel,
            RiskScore = transaction.RiskScore,
            Description = transaction.Description,
            SecureEscapeCode =
                transaction.SecureEscapeCode,
            CreatedAt = transaction.CreatedAt
        };
    }

    private static AlertActionResponseDto MapToAction(
        AlertAction action)
    {
        return new AlertActionResponseDto
        {
            Id = action.Id,
            AdminUserId = action.AdminUserId,

            AdminName =
                action.AdminUser?.FullName
                ?? string.Empty,

            ActionType = action.ActionType,
            Notes = action.Notes,
            CreatedAt = action.CreatedAt
        };
    }

    private static NotificationAttemptResponseDto MapToNotificationAttempt(
        NotificationAttempt attempt)
    {
        return new NotificationAttemptResponseDto
        {
            Id = attempt.Id,
            Channel = attempt.Channel,
            Destination = attempt.Destination,
            Status = attempt.Status,
            ErrorMessage = attempt.ErrorMessage,
            MessageBody = attempt.MessageBody,
            SentAt = attempt.SentAt,
            ResponseMessage =
                attempt.ResponseMessage,
            AttemptedAt = attempt.AttemptedAt,
            CreatedAt = attempt.CreatedAt
        };
    }
}