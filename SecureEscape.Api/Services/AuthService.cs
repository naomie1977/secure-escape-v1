using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Data;
using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class AuthService : IAuthService
{
    private static readonly TimeSpan TwoFactorChallengeLifetime =
        TimeSpan.FromMinutes(5);

    private const int MaximumTwoFactorAttempts = 5;

    private readonly AppDbContext _context;
    private readonly IHashingService _hashingService;
    private readonly ITokenService _tokenService;
    private readonly IAuditService _auditService;
    private readonly IRiskService _riskService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmergencyContactRepository _emergencyContactRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly ITwoFactorAuthService _twoFactorAuthService;
    private readonly IReverseGeocodingService _reverseGeocodingService;

    public AuthService(
        AppDbContext context,
        IHashingService hashingService,
        ITokenService tokenService,
        IAuditService auditService,
        IRiskService riskService,
        IEmergencyContactRepository emergencyContactRepository,
        ICurrentUserService currentUserService,
        INotificationDispatchService notificationDispatchService,
        ITwoFactorAuthService twoFactorAuthService,
        IReverseGeocodingService reverseGeocodingService)
    {
        _context = context;
        _hashingService = hashingService;
        _tokenService = tokenService;
        _auditService = auditService;
        _riskService = riskService;
        _emergencyContactRepository = emergencyContactRepository;
        _currentUserService = currentUserService;
        _notificationDispatchService = notificationDispatchService;
        _twoFactorAuthService = twoFactorAuthService;
        _reverseGeocodingService = reverseGeocodingService;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.Users
            .Include(x => x.AuthCredential)
            .Include(x => x.BankIntegration)
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (user == null || user.AuthCredential == null)
        {
            await _auditService.LogAsync(
                AuditEventType.LoginFailed,
                entityType: "User",
                metadataJson:
                    $"{{\"email\":\"{request.Email}\",\"reason\":\"User not found\"}}");

            return null;
        }

        if (user.Status != UserStatus.Active)
        {
            await _auditService.LogAsync(
                AuditEventType.LoginFailed,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                metadataJson:
                    $"{{\"reason\":\"User account is not active\",\"status\":\"{user.Status}\"}}");

            return null;
        }

        if (user.BankIntegration == null ||
            user.BankIntegration.Status != BankIntegrationStatus.Active)
        {
            await _auditService.LogAsync(
                AuditEventType.LoginFailed,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                metadataJson:
                    $"{{\"reason\":\"Bank integration is not active\",\"bankIntegrationStatus\":\"{user.BankIntegration?.Status.ToString() ?? "Missing"}\"}}");

            return null;
        }

        var normalPinValid = _hashingService.Verify(
            request.Pin,
            user.AuthCredential.NormalPinHash);

        var duressPinValid = _hashingService.Verify(
            request.Pin,
            user.AuthCredential.DuressPinHash);

        if (!normalPinValid && !duressPinValid)
        {
            await _auditService.LogAsync(
                AuditEventType.LoginFailed,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                metadataJson: "{\"reason\":\"Invalid PIN\"}");

            return null;
        }

        var sessionMode =
            duressPinValid ? SessionMode.Duress : SessionMode.Normal;

        var now = DateTime.UtcNow;

        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            BankSessionId =
                $"SESS-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..32],
            Mode = sessionMode,
            Status = SessionStatus.Active,
            IpAddress = request.IpAddress,
            DeviceInfo = request.DeviceInfo,
            StartedAt = now,
            LastActivityAt = now,
            CreatedAt = now
        };

        await _context.UserSessions.AddAsync(session);

        Alert? alert = null;

        string? coordinateText = null;
        string? readableAddress = null;
        string? googleMapsUrl = null;

        if (request.Latitude.HasValue &&
            request.Longitude.HasValue)
        {
            var latitudeText =
                request.Latitude.Value.ToString(
                    CultureInfo.InvariantCulture);

            var longitudeText =
                request.Longitude.Value.ToString(
                    CultureInfo.InvariantCulture);

            coordinateText =
                $"{latitudeText}, {longitudeText}";

            googleMapsUrl =
                $"https://www.google.com/maps?q={latitudeText},{longitudeText}";

            /*
                Reverse geocoding is helpful evidence, but an external
                geocoding failure must never block a duress login.
            */
            if (duressPinValid)
            {
                try
                {
                    readableAddress =
                        await _reverseGeocodingService.GetAddressAsync(
                            request.Latitude.Value,
                            request.Longitude.Value);
                }
                catch
                {
                    readableAddress = null;
                }
            }
        }

        /*
            A duress PIN is intentionally different from a normal login.

            Once the duress PIN is valid, Secure Escape must silently
            create the emergency evidence and notification workflow and
            allow the disguised banking session to continue.

            Requiring an authenticator code at this point could expose
            the emergency workflow to a coercive observer, so duress
            authentication deliberately bypasses TOTP.
        */
        if (duressPinValid)
        {
            var riskAssessment =
                _riskService.AssessDuressLogin();

            alert = new Alert
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                UserSessionId = session.Id,
                Type = AlertType.DuressLogin,
                Severity = riskAssessment.RiskLevel,
                Status = AlertStatus.Open,
                Description = "User logged in using duress PIN.",
                CreatedAt = now
            };

            await _context.Alerts.AddAsync(alert);

            var riskEvaluation = new RiskEvaluation
            {
                Id = Guid.NewGuid(),
                UserSessionId = session.Id,
                Score = riskAssessment.Score,
                RiskLevel = riskAssessment.RiskLevel,
                ReasonsJson = riskAssessment.ReasonsJson,
                CreatedAt = now
            };

            await _context.RiskEvaluations.AddAsync(
                riskEvaluation);

            var bankNotificationAttempt =
                new NotificationAttempt
                {
                    Id = Guid.NewGuid(),
                    AlertId = alert.Id,
                    Channel = NotificationChannel.Webhook,
                    Destination =
                        user.BankIntegration?.WebhookUrl ??
                        string.Empty,
                    Status = NotificationStatus.Pending,
                    AttemptedAt = now,
                    CreatedAt = now
                };

            await _context.NotificationAttempts.AddAsync(
                bankNotificationAttempt);

            var emergencyContacts =
                await _emergencyContactRepository
                    .GetAllByUserIdAsync(user.Id);

            foreach (var contact in emergencyContacts)
            {
                if (contact.Status !=
                        EmergencyContactStatus.Active ||
                    !contact.NotifyOnDuress ||
                    string.IsNullOrWhiteSpace(contact.Email))
                {
                    continue;
                }

                var locationDescription =
                    !string.IsNullOrWhiteSpace(readableAddress)
                        ? readableAddress
                        : coordinateText ??
                          "No location was captured.";

                var mapsDescription =
                    !string.IsNullOrWhiteSpace(googleMapsUrl)
                        ? googleMapsUrl
                        : "Unavailable";

                var messageBody =
                    "SECURE ESCAPE SAFETY ALERT\n\n" +
                    $"{user.FullName} may be in danger and activated Secure Escape using their duress PIN.\n\n" +
                    $"Incident time (UTC): {now:yyyy-MM-dd HH:mm:ss} UTC\n" +
                    $"Last known location: {locationDescription}\n" +
                    $"Coordinates: {coordinateText ?? "Unavailable"}\n" +
                    $"Google Maps: {mapsDescription}\n\n" +
                    "Please follow the emergency plan you have agreed with this person. " +
                    "If immediate danger is suspected, contact the appropriate emergency services.";

                var emergencyContactNotification =
                    new NotificationAttempt
                    {
                        Id = Guid.NewGuid(),
                        AlertId = alert.Id,
                        Channel = NotificationChannel.Email,
                        Destination = contact.Email.Trim(),
                        MessageBody = messageBody,
                        Status = NotificationStatus.Pending,
                        AttemptedAt = now,
                        CreatedAt = now,
                        ResponseMessage =
                            $"Emergency contact notification queued for {contact.FullName}."
                    };

                await _context.NotificationAttempts.AddAsync(
                    emergencyContactNotification);
            }
        }

        if (request.Latitude.HasValue &&
            request.Longitude.HasValue)
        {
            var locationEvent = new LocationEvent
            {
                Id = Guid.NewGuid(),
                UserSessionId = session.Id,
                AlertId = alert?.Id,
                Latitude = request.Latitude.Value,
                Longitude = request.Longitude.Value,
                AccuracyMeters =
                    request.AccuracyMeters ?? 0,
                LocationSource = LocationSource.Gps,
                CapturedAt = now,
                CreatedAt = now
            };

            await _context.LocationEvents.AddAsync(
                locationEvent);
        }

        /*
            Duress authentication completes immediately.

            Save the session, evidence, alert, location, and queued
            notifications before dispatching any external provider.
        */
        if (duressPinValid)
        {
            await _context.SaveChangesAsync();

            await _notificationDispatchService
                .DispatchPendingForSessionAsync(session.Id);

            await _auditService.LogAsync(
                AuditEventType.DuressPinMatched,
                entityType: "UserSession",
                entityId: session.Id,
                userId: user.Id,
                userSessionId: session.Id);

            await _auditService.LogAsync(
                AuditEventType.SessionCreated,
                entityType: "UserSession",
                entityId: session.Id,
                userId: user.Id,
                userSessionId: session.Id,
                metadataJson:
                    "{\"authenticationStage\":\"DuressAuthenticatedWithoutTwoFactor\"}");

            var token =
                _tokenService.CreateToken(user, session);

            return CreateCompletedLoginResponse(
                user,
                session,
                token);
        }

        /*
            Normal authentication retains the existing authenticator
            workflow.

            Already-enrolled customers receive a LoginVerification
            challenge. Customers who have never enrolled receive an
            Enrollment challenge. No authenticated JWT is issued until
            that normal two-factor flow is completed.
        */
        var rawChallengeToken =
            GenerateChallengeToken();

        var challengePurpose =
            user.AuthCredential.IsTwoFactorEnabled
                ? TwoFactorChallengePurpose.LoginVerification
                : TwoFactorChallengePurpose.Enrollment;

        var challenge = new TwoFactorLoginChallenge
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            UserSessionId = session.Id,
            ChallengeTokenHash =
                HashChallengeToken(rawChallengeToken),
            Purpose = challengePurpose,
            ExpiresAt =
                now.Add(TwoFactorChallengeLifetime),
            FailedAttemptCount = 0,
            CreatedAt = now
        };

        await _context.TwoFactorLoginChallenges.AddAsync(
            challenge);

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.NormalPinMatched,
            entityType: "UserSession",
            entityId: session.Id,
            userId: user.Id,
            userSessionId: session.Id);

        await _auditService.LogAsync(
            AuditEventType.SessionCreated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: user.Id,
            userSessionId: session.Id);

        await _auditService.LogAsync(
            AuditEventType.TwoFactorChallengeCreated,
            entityType: "UserSession",
            entityId: session.Id,
            userId: user.Id,
            userSessionId: session.Id,
            metadataJson:
                challengePurpose ==
                    TwoFactorChallengePurpose.LoginVerification
                    ? "{\"authenticationStage\":\"AwaitingTwoFactor\"}"
                    : "{\"authenticationStage\":\"AwaitingTwoFactorEnrollment\"}");

        if (challengePurpose ==
            TwoFactorChallengePurpose.LoginVerification)
        {
            return new LoginResponseDto
            {
                UserId = user.Id,
                UserSessionId = session.Id,
                FullName = user.FullName,
                Email = user.Email,
                Token = string.Empty,
                SessionMode = string.Empty,
                IsDuress = false,
                RequiresTwoFactor = true,
                RequiresTwoFactorSetup = false,
                TwoFactorChallengeToken =
                    rawChallengeToken,
                TwoFactorSetupChallengeToken =
                    string.Empty
            };
        }

        return new LoginResponseDto
        {
            UserId = user.Id,
            UserSessionId = session.Id,
            FullName = user.FullName,
            Email = user.Email,
            Token = string.Empty,
            SessionMode = string.Empty,
            IsDuress = false,
            RequiresTwoFactor = false,
            RequiresTwoFactorSetup = true,
            TwoFactorChallengeToken =
                string.Empty,
            TwoFactorSetupChallengeToken =
                rawChallengeToken
        };
    }
    public async Task<LoginResponseDto?> VerifyTwoFactorLoginAsync(
        VerifyTwoFactorLoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken))
        {
            return null;
        }

        var now = DateTime.UtcNow;

        var challengeHash =
            HashChallengeToken(request.ChallengeToken);

        var challenge = await _context.TwoFactorLoginChallenges
            .Include(x => x.User)
                .ThenInclude(x => x!.AuthCredential)
            .Include(x => x.UserSession)
            .FirstOrDefaultAsync(
                x => x.ChallengeTokenHash == challengeHash);

        if (challenge == null)
        {
            return null;
        }

        /*
            An enrollment challenge must never be accepted by the normal
            login-verification endpoint.
        */
        if (challenge.Purpose !=
            TwoFactorChallengePurpose.LoginVerification)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Challenge purpose is not login verification\"}");

            return null;
        }

        if (challenge.UsedAt.HasValue)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Challenge already used\"}");

            return null;
        }

        if (challenge.ExpiresAt <= now ||
            challenge.FailedAttemptCount >= MaximumTwoFactorAttempts)
        {
            await TerminatePendingSessionAsync(
                challenge.UserSession,
                now);

            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Challenge expired or maximum attempts reached\"}");

            return null;
        }

        var user = challenge.User;
        var session = challenge.UserSession;

        if (user == null ||
            session == null ||
            session.Status != SessionStatus.Active ||
            user.AuthCredential == null ||
            !user.AuthCredential.IsTwoFactorEnabled ||
            string.IsNullOrWhiteSpace(
                user.AuthCredential.TotpSecret))
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Two-factor credentials or active session unavailable");

            return null;
        }

        string rawSecret;

        try
        {
            rawSecret = _twoFactorAuthService.UnprotectSecret(
                user.AuthCredential.TotpSecret);
        }
        catch
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Two-factor secret could not be read");

            return null;
        }

        var valid = _twoFactorAuthService.VerifyCode(
            rawSecret,
            request.Code);

        if (!valid)
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Invalid authenticator code");

            return null;
        }

        /*
            One-time-use challenge. Mark it used before returning the JWT.
        */
        challenge.UsedAt = now;
        challenge.UpdatedAt = now;

        session.LastActivityAt = now;
        session.UpdatedAt = now;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.TwoFactorVerificationSucceeded,
            entityType: "TwoFactorLoginChallenge",
            entityId: challenge.Id,
            userId: user.Id,
            userSessionId: session.Id,
            metadataJson:
                "{\"authenticationStage\":\"TwoFactorComplete\"}");

        var token = _tokenService.CreateToken(user, session);

        return CreateCompletedLoginResponse(
            user,
            session,
            token);
    }

    public async Task<TwoFactorLoginSetupResponseDto?>
        SetupTwoFactorLoginAsync(
            SetupTwoFactorLoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken))
        {
            return null;
        }

        var now = DateTime.UtcNow;

        var challengeHash =
            HashChallengeToken(request.ChallengeToken);

        var challenge = await _context.TwoFactorLoginChallenges
            .Include(x => x.User)
                .ThenInclude(x => x!.AuthCredential)
            .Include(x => x.UserSession)
            .FirstOrDefaultAsync(
                x => x.ChallengeTokenHash == challengeHash);

        if (challenge == null)
        {
            return null;
        }

        /*
            Only an Enrollment challenge may reveal the one-time
            authenticator setup information.
        */
        if (challenge.Purpose !=
            TwoFactorChallengePurpose.Enrollment)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Challenge purpose is not enrollment\"}");

            return null;
        }

        if (challenge.UsedAt.HasValue)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Enrollment challenge already used\"}");

            return null;
        }

        if (challenge.ExpiresAt <= now ||
            challenge.FailedAttemptCount >= MaximumTwoFactorAttempts)
        {
            await TerminatePendingSessionAsync(
                challenge.UserSession,
                now);

            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Enrollment challenge expired or maximum attempts reached\"}");

            return null;
        }

        var user = challenge.User;
        var session = challenge.UserSession;

        if (user == null ||
            session == null ||
            session.Status != SessionStatus.Active ||
            user.AuthCredential == null)
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Enrollment credentials or active session unavailable");

            return null;
        }

        /*
            If 2FA became enabled after this challenge was created,
            this enrollment challenge is no longer valid.
        */
        if (user.AuthCredential.IsTwoFactorEnabled)
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Two-factor authentication is already enabled");

            return null;
        }

        string rawSecret;

        /*
            A customer may call the setup endpoint again during the same
            valid enrollment flow. Reuse the already-protected secret so
            their authenticator entry does not unexpectedly change.

            The raw secret is never stored in plaintext.
        */
        if (string.IsNullOrWhiteSpace(
            user.AuthCredential.TotpSecret))
        {
            rawSecret =
                _twoFactorAuthService.GenerateSecret();

            user.AuthCredential.TotpSecret =
                _twoFactorAuthService.ProtectSecret(rawSecret);

            user.AuthCredential.TwoFactorEnabledAt = null;
            user.AuthCredential.UpdatedAt = now;

            await _context.SaveChangesAsync();
        }
        else
        {
            try
            {
                rawSecret =
                    _twoFactorAuthService.UnprotectSecret(
                        user.AuthCredential.TotpSecret);
            }
            catch
            {
                await RecordFailedTwoFactorAttemptAsync(
                    challenge,
                    "Two-factor enrollment secret could not be read");

                return null;
            }
        }

        var setupUri =
            _twoFactorAuthService.GenerateSetupUri(
                user.Email,
                rawSecret);

        return new TwoFactorLoginSetupResponseDto
        {
            ManualEntryKey = rawSecret,
            SetupUri = setupUri
        };
    }

    public async Task<LoginResponseDto?>
        ConfirmTwoFactorLoginSetupAsync(
            ConfirmTwoFactorLoginSetupRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken))
        {
            return null;
        }

        var now = DateTime.UtcNow;

        var challengeHash =
            HashChallengeToken(request.ChallengeToken);

        var challenge = await _context.TwoFactorLoginChallenges
            .Include(x => x.User)
                .ThenInclude(x => x!.AuthCredential)
            .Include(x => x.UserSession)
            .FirstOrDefaultAsync(
                x => x.ChallengeTokenHash == challengeHash);

        if (challenge == null)
        {
            return null;
        }

        /*
            A normal login-verification challenge must never be accepted
            by the enrollment-confirmation endpoint.
        */
        if (challenge.Purpose !=
            TwoFactorChallengePurpose.Enrollment)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Challenge purpose is not enrollment\"}");

            return null;
        }

        if (challenge.UsedAt.HasValue)
        {
            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Enrollment challenge already used\"}");

            return null;
        }

        if (challenge.ExpiresAt <= now ||
            challenge.FailedAttemptCount >= MaximumTwoFactorAttempts)
        {
            await TerminatePendingSessionAsync(
                challenge.UserSession,
                now);

            await _auditService.LogAsync(
                AuditEventType.TwoFactorVerificationFailed,
                entityType: "TwoFactorLoginChallenge",
                entityId: challenge.Id,
                userId: challenge.UserId,
                userSessionId: challenge.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Enrollment challenge expired or maximum attempts reached\"}");

            return null;
        }

        var user = challenge.User;
        var session = challenge.UserSession;

        if (user == null ||
            session == null ||
            session.Status != SessionStatus.Active ||
            user.AuthCredential == null ||
            string.IsNullOrWhiteSpace(
                user.AuthCredential.TotpSecret))
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Enrollment credentials or active session unavailable");

            return null;
        }

        if (user.AuthCredential.IsTwoFactorEnabled)
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Two-factor authentication is already enabled");

            return null;
        }

        string rawSecret;

        try
        {
            rawSecret =
                _twoFactorAuthService.UnprotectSecret(
                    user.AuthCredential.TotpSecret);
        }
        catch
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Two-factor enrollment secret could not be read");

            return null;
        }

        var valid =
            _twoFactorAuthService.VerifyCode(
                rawSecret,
                request.Code);

        if (!valid)
        {
            await RecordFailedTwoFactorAttemptAsync(
                challenge,
                "Invalid authenticator enrollment code");

            return null;
        }

        /*
            Successful first-time enrollment.

            Enable 2FA, consume the enrollment challenge, update the
            pending session, and only then create the authenticated JWT.
        */
        user.AuthCredential.IsTwoFactorEnabled = true;
        user.AuthCredential.TwoFactorEnabledAt = now;
        user.AuthCredential.UpdatedAt = now;

        challenge.UsedAt = now;
        challenge.UpdatedAt = now;

        session.LastActivityAt = now;
        session.UpdatedAt = now;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.TwoFactorVerificationSucceeded,
            entityType: "TwoFactorLoginChallenge",
            entityId: challenge.Id,
            userId: user.Id,
            userSessionId: session.Id,
            metadataJson:
                "{\"authenticationStage\":\"TwoFactorEnrollmentComplete\"}");

        var token =
            _tokenService.CreateToken(user, session);

        return CreateCompletedLoginResponse(
            user,
            session,
            token);
    }

    /*
        Existing authenticated-account enrollment endpoint retained for
        compatibility/account-management scenarios.
    */
    public async Task<TwoFactorSetupResponseDto> SetupTwoFactorAsync()
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var user = await _context.Users
            .Include(x => x.AuthCredential)
            .FirstOrDefaultAsync(
                x => x.Id == currentUser.UserId);

        if (user == null || user.AuthCredential == null)
        {
            throw new InvalidOperationException(
                "Authentication credentials could not be found.");
        }

        if (user.AuthCredential.IsTwoFactorEnabled)
        {
            return new TwoFactorSetupResponseDto
            {
                IsAlreadyEnabled = true
            };
        }

        var rawSecret =
            _twoFactorAuthService.GenerateSecret();

        var protectedSecret =
            _twoFactorAuthService.ProtectSecret(rawSecret);

        user.AuthCredential.TotpSecret = protectedSecret;
        user.AuthCredential.TwoFactorEnabledAt = null;
        user.AuthCredential.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var setupUri =
            _twoFactorAuthService.GenerateSetupUri(
                user.Email,
                rawSecret);

        return new TwoFactorSetupResponseDto
        {
            ManualEntryKey = rawSecret,
            SetupUri = setupUri,
            IsAlreadyEnabled = false
        };
    }

    public async Task<bool> ConfirmTwoFactorAsync(string code)
    {
        var currentUser = _currentUserService.GetCurrentUser();

        var user = await _context.Users
            .Include(x => x.AuthCredential)
            .FirstOrDefaultAsync(
                x => x.Id == currentUser.UserId);

        if (user == null ||
            user.AuthCredential == null ||
            string.IsNullOrWhiteSpace(
                user.AuthCredential.TotpSecret))
        {
            return false;
        }

        if (user.AuthCredential.IsTwoFactorEnabled)
        {
            return true;
        }

        string rawSecret;

        try
        {
            rawSecret =
                _twoFactorAuthService.UnprotectSecret(
                    user.AuthCredential.TotpSecret);
        }
        catch
        {
            return false;
        }

        var valid = _twoFactorAuthService.VerifyCode(
            rawSecret,
            code);

        if (!valid)
        {
            return false;
        }

        user.AuthCredential.IsTwoFactorEnabled = true;
        user.AuthCredential.TwoFactorEnabledAt =
            DateTime.UtcNow;
        user.AuthCredential.UpdatedAt =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task RecordFailedTwoFactorAttemptAsync(
        TwoFactorLoginChallenge challenge,
        string reason)
    {
        var now = DateTime.UtcNow;

        challenge.FailedAttemptCount++;
        challenge.UpdatedAt = now;

        if (challenge.FailedAttemptCount >=
                MaximumTwoFactorAttempts &&
            challenge.UserSession != null &&
            challenge.UserSession.Status ==
                SessionStatus.Active)
        {
            challenge.UserSession.Status =
                SessionStatus.Terminated;
            challenge.UserSession.EndedAt = now;
            challenge.UserSession.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditEventType.TwoFactorVerificationFailed,
            entityType: "TwoFactorLoginChallenge",
            entityId: challenge.Id,
            userId: challenge.UserId,
            userSessionId: challenge.UserSessionId,
            metadataJson:
                $"{{\"reason\":\"{reason}\",\"failedAttemptCount\":{challenge.FailedAttemptCount}}}");
    }

    private async Task TerminatePendingSessionAsync(
        UserSession? session,
        DateTime now)
    {
        if (session == null ||
            session.Status != SessionStatus.Active)
        {
            return;
        }

        session.Status = SessionStatus.Terminated;
        session.EndedAt = now;
        session.UpdatedAt = now;

        await _context.SaveChangesAsync();
    }

    private static LoginResponseDto CreateCompletedLoginResponse(
        User user,
        UserSession session,
        string token)
    {
        return new LoginResponseDto
        {
            UserId = user.Id,
            UserSessionId = session.Id,
            FullName = user.FullName,
            Email = user.Email,
            Token = token,
            SessionMode = session.Mode.ToString(),
            IsDuress = session.Mode == SessionMode.Duress,
            RequiresTwoFactor = false,
            RequiresTwoFactorSetup = false,
            TwoFactorChallengeToken = string.Empty,
            TwoFactorSetupChallengeToken = string.Empty
        };
    }

    private static string GenerateChallengeToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashChallengeToken(
        string challengeToken)
    {
        var bytes = Encoding.UTF8.GetBytes(
            challengeToken);

        var hash = SHA256.HashData(bytes);

        return Convert.ToHexString(hash);
    }

    private async Task TriggerDuressAlertAsync(
        User user,
        Guid userSessionId)
    {
        var now = DateTime.UtcNow;

        var riskAssessment =
            _riskService.AssessDuressLogin();

        var alert = new Alert
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            UserSessionId = userSessionId,
            Type = AlertType.DuressLogin,
            Severity = riskAssessment.RiskLevel,
            Status = AlertStatus.Open,
            Description =
                "User entered duress PIN during step-up verification.",
            CreatedAt = now
        };

        await _context.Alerts.AddAsync(alert);

        var riskEvaluation = new RiskEvaluation
        {
            Id = Guid.NewGuid(),
            UserSessionId = userSessionId,
            Score = riskAssessment.Score,
            RiskLevel = riskAssessment.RiskLevel,
            ReasonsJson = riskAssessment.ReasonsJson,
            CreatedAt = now
        };

        await _context.RiskEvaluations.AddAsync(
            riskEvaluation);

        var bankNotificationAttempt =
            new NotificationAttempt
            {
                Id = Guid.NewGuid(),
                AlertId = alert.Id,
                Channel = NotificationChannel.Webhook,
                Destination =
                    user.BankIntegration?.WebhookUrl ??
                    string.Empty,
                Status = NotificationStatus.Pending,
                AttemptedAt = now,
                CreatedAt = now
            };

        await _context.NotificationAttempts.AddAsync(
            bankNotificationAttempt);

        var emergencyContacts =
            await _emergencyContactRepository
                .GetAllByUserIdAsync(user.Id);

        foreach (var contact in emergencyContacts)
        {
            if (contact.Status !=
                    EmergencyContactStatus.Active ||
                !contact.NotifyOnDuress ||
                string.IsNullOrWhiteSpace(contact.Email))
            {
                continue;
            }

            var messageBody =
                "SECURE ESCAPE SAFETY ALERT\n\n" +
                $"{user.FullName} may be in danger and entered their duress PIN during a secure verification step.\n\n" +
                $"Incident time (UTC): {now:yyyy-MM-dd HH:mm:ss} UTC\n" +
                "Location: No new location was captured during this verification step.\n\n" +
                "Please follow the emergency plan you have agreed with this person. " +
                "If immediate danger is suspected, contact the appropriate emergency services.";

            var emergencyContactNotification =
                new NotificationAttempt
                {
                    Id = Guid.NewGuid(),
                    AlertId = alert.Id,
                    Channel = NotificationChannel.Email,
                    Destination = contact.Email.Trim(),
                    MessageBody = messageBody,
                    Status = NotificationStatus.Pending,
                    AttemptedAt = now,
                    CreatedAt = now,
                    ResponseMessage =
                        $"Emergency contact notification queued for {contact.FullName}."
                };

            await _context.NotificationAttempts.AddAsync(
                emergencyContactNotification);
        }
    }
    public async Task<bool> VerifyPinAsync(string pin)
    {
        var currentUser =
            _currentUserService.GetCurrentUser();

        var user = await _context.Users
            .Include(x => x.AuthCredential)
            .Include(x => x.BankIntegration)
            .FirstOrDefaultAsync(
                x => x.Id == currentUser.UserId);

        if (user == null ||
            user.AuthCredential == null)
        {
            return false;
        }

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(
                x => x.Id ==
                    currentUser.UserSessionId);

        if (session == null)
        {
            return false;
        }

        if (session.Mode == SessionMode.Duress)
        {
            var duressPinValid =
                _hashingService.Verify(
                    pin,
                    user.AuthCredential.DuressPinHash);

            if (duressPinValid)
            {
                await _auditService.LogAsync(
                    AuditEventType.DuressPinMatchedStepUp,
                    entityType: "User",
                    entityId: user.Id,
                    userId: user.Id,
                    userSessionId:
                        currentUser.UserSessionId,
                    metadataJson:
                        "{\"context\":\"step-up verification\",\"sessionMode\":\"Duress\"}");

                return true;
            }

            await _auditService.LogAsync(
                AuditEventType.LoginFailed,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                userSessionId:
                    currentUser.UserSessionId,
                metadataJson:
                    "{\"reason\":\"Invalid PIN\",\"context\":\"step-up verification\",\"sessionMode\":\"Duress\"}");

            return false;
        }

        var normalPinValid =
            _hashingService.Verify(
                pin,
                user.AuthCredential.NormalPinHash);

        if (normalPinValid)
        {
            await _auditService.LogAsync(
                AuditEventType.NormalPinMatched,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                userSessionId:
                    currentUser.UserSessionId,
                metadataJson:
                    "{\"context\":\"step-up verification\",\"sessionMode\":\"Normal\"}");

            return true;
        }

        var duressPinValidInNormalSession =
            _hashingService.Verify(
                pin,
                user.AuthCredential.DuressPinHash);

        if (duressPinValidInNormalSession)
        {
            await TriggerDuressAlertAsync(
                user,
                currentUser.UserSessionId);

            session.HadStepUpDuressEvent = true;
            session.UpdatedAt = DateTime.UtcNow;

            await _auditService.LogAsync(
                AuditEventType.DuressPinMatchedStepUp,
                entityType: "User",
                entityId: user.Id,
                userId: user.Id,
                userSessionId:
                    currentUser.UserSessionId,
                metadataJson:
                    "{\"context\":\"step-up verification\",\"sessionMode\":\"Normal\"}");

            await _context.SaveChangesAsync();

            await _notificationDispatchService
                .DispatchPendingForSessionAsync(
                    currentUser.UserSessionId);

            return false;
        }

        await _auditService.LogAsync(
            AuditEventType.LoginFailed,
            entityType: "User",
            entityId: user.Id,
            userId: user.Id,
            userSessionId:
                currentUser.UserSessionId,
            metadataJson:
                "{\"reason\":\"Invalid PIN\",\"context\":\"step-up verification\",\"sessionMode\":\"Normal\"}");

        return false;
    }

    public async Task LogoutAsync()
    {
        var currentUser =
            _currentUserService.GetCurrentUser();

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(
                x => x.Id ==
                    currentUser.UserSessionId);

        var now = DateTime.UtcNow;

        if (session != null)
        {
            session.Status =
                SessionStatus.Terminated;
            session.EndedAt = now;
            session.LastActivityAt = now;
            session.UpdatedAt = now;

            await _context.SaveChangesAsync();
        }

        await _auditService.LogAsync(
            AuditEventType.SessionCreated,
            entityType: "UserSession",
            entityId:
                currentUser.UserSessionId,
            userId: currentUser.UserId,
            userSessionId:
                currentUser.UserSessionId,
            metadataJson:
                "{\"action\":\"logout\"}");
    }
}

