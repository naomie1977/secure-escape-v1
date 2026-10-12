using System.Net.Http.Json;
using System.Text.Json;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Services;

public class NotificationDispatchService : INotificationDispatchService
{
    private readonly INotificationAttemptRepository _notificationAttemptRepository;
    private readonly IAuditService _auditService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TwilioSmsService _twilioSmsService;
    private readonly EmailService _emailService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NotificationDispatchService> _logger;

    public NotificationDispatchService(
        INotificationAttemptRepository notificationAttemptRepository,
        IAuditService auditService,
        IUnitOfWork unitOfWork,
        TwilioSmsService twilioSmsService,
        EmailService emailService,
        IHttpClientFactory httpClientFactory,
        ILogger<NotificationDispatchService> logger)
    {
        _notificationAttemptRepository = notificationAttemptRepository;
        _auditService = auditService;
        _unitOfWork = unitOfWork;
        _twilioSmsService = twilioSmsService;
        _emailService = emailService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<NotificationAttemptResponseDto?> DispatchAsync(
        Guid notificationAttemptId)
    {
        var attempt =
            await _notificationAttemptRepository
                .GetByIdAsync(notificationAttemptId);

        if (attempt == null)
        {
            return null;
        }

        /*
            Prevent an already-successful notification from being
            accidentally sent again through the manual admin endpoint.
        */
        if (attempt.Status == NotificationStatus.Sent)
        {
            return MapToResponse(attempt);
        }

        return await DispatchAttemptAsync(attempt);
    }

    public async Task<List<NotificationAttemptResponseDto>>
        DispatchPendingAsync()
    {
        var pendingAttempts =
            await _notificationAttemptRepository
                .GetPendingAsync();

        var results =
            new List<NotificationAttemptResponseDto>();

        foreach (var attempt in pendingAttempts)
        {
            /*
                Secure Escape currently provides real delivery for SMS,
                Email, and Webhook channels.

                Other notification channels remain pending rather than
                being falsely reported as delivered.
            */
            if (!IsSupportedChannel(attempt.Channel))
            {
                continue;
            }

            var result =
                await DispatchAttemptAsync(attempt);

            results.Add(result);
        }

        return results;
    }

    public async Task<List<NotificationAttemptResponseDto>>
        DispatchPendingForSessionAsync(Guid userSessionId)
    {
        var pendingAttempts =
            await _notificationAttemptRepository
                .GetPendingBySessionIdAsync(userSessionId);

        var results =
            new List<NotificationAttemptResponseDto>();

        foreach (var attempt in pendingAttempts)
        {
            if (!IsSupportedChannel(attempt.Channel))
            {
                continue;
            }

            var result =
                await DispatchAttemptAsync(attempt);

            results.Add(result);
        }

        return results;
    }

    private async Task<NotificationAttemptResponseDto>
        DispatchAttemptAsync(NotificationAttempt attempt)
    {
        if (attempt.Status == NotificationStatus.Sent)
        {
            return MapToResponse(attempt);
        }

        attempt.AttemptedAt = DateTime.UtcNow;

        try
        {
            switch (attempt.Channel)
            {
                case NotificationChannel.Sms:
                    await DispatchSmsAsync(attempt);
                    break;

                case NotificationChannel.Email:
                    await DispatchEmailAsync(attempt);
                    break;

                case NotificationChannel.Webhook:
                    await DispatchWebhookAsync(attempt);
                    break;

                default:
                    await MarkUnsupportedChannelAsync(attempt);
                    break;
            }
        }
        catch (Exception ex)
        {
            /*
                Provider/network failures must never crash the user's
                duress login flow. Record the notification failure and
                allow the authentication flow to continue.
            */
            _logger.LogError(
                ex,
                "Unexpected notification dispatch failure. NotificationAttemptId: {NotificationAttemptId}, Channel: {Channel}",
                attempt.Id,
                attempt.Channel);

            await MarkFailedAsync(
                attempt,
                "An unexpected notification delivery error occurred.");
        }

        return MapToResponse(attempt);
    }

    private async Task DispatchSmsAsync(
        NotificationAttempt attempt)
    {
        var result =
            await _twilioSmsService.SendAsync(
                attempt.Destination,
                attempt.MessageBody ?? string.Empty);

        if (!result.IsSuccessful)
        {
            await MarkFailedAsync(
                attempt,
                result.ErrorMessage ??
                "The SMS provider rejected the notification.");

            return;
        }

        attempt.Status = NotificationStatus.Sent;
        attempt.SentAt = DateTime.UtcNow;
        attempt.ErrorMessage = string.Empty;

        var providerStatus =
            string.IsNullOrWhiteSpace(result.ProviderStatus)
                ? "accepted"
                : result.ProviderStatus;

        /*
            "Sent" in Secure Escape means the external provider accepted
            the dispatch request. It does not claim that the recipient's
            handset has already received the SMS.
        */
        attempt.ResponseMessage =
            Truncate(
                $"Accepted by Twilio. Provider status: {providerStatus}. Message SID: {result.ProviderMessageId}.",
                1000);

        await _auditService.LogAsync(
            AuditEventType.NotificationSent,
            entityType: "NotificationAttempt",
            entityId: attempt.Id,
            metadataJson:
                JsonSerializer.Serialize(
                    new
                    {
                        channel = attempt.Channel.ToString(),
                        provider = "Twilio",
                        providerStatus
                    }));

        await _unitOfWork.SaveChangesAsync();
    }

    private async Task DispatchEmailAsync(
        NotificationAttempt attempt)
    {
        const string subject =
            "Secure Escape Safety Alert";

        var textBody =
            attempt.MessageBody ?? string.Empty;

        /*
            The notification body may contain a Google Maps URL.
            Sending the message as plain text keeps the stored
            NotificationAttempt body simple while modern email clients
            can still make the HTTPS URL clickable.
        */
        var result =
            await _emailService.SendAsync(
                attempt.Destination,
                subject,
                textBody);

        if (!result.IsSuccessful)
        {
            await MarkFailedAsync(
                attempt,
                result.ErrorMessage ??
                "The email provider rejected the notification.");

            return;
        }

        attempt.Status = NotificationStatus.Sent;
        attempt.SentAt = DateTime.UtcNow;
        attempt.ErrorMessage = string.Empty;

        attempt.ResponseMessage =
            Truncate(
                result.ProviderResponse ??
                "SMTP provider accepted the email.",
                1000);

        await _auditService.LogAsync(
            AuditEventType.NotificationSent,
            entityType: "NotificationAttempt",
            entityId: attempt.Id,
            metadataJson:
                JsonSerializer.Serialize(
                    new
                    {
                        channel = attempt.Channel.ToString(),
                        provider = "SMTP"
                    }));

        await _unitOfWork.SaveChangesAsync();
    }

    private async Task DispatchWebhookAsync(
        NotificationAttempt attempt)
    {
        if (!TryValidateWebhookDestination(
                attempt.Destination,
                out var webhookUri,
                out var validationError))
        {
            await MarkFailedAsync(
                attempt,
                validationError);

            return;
        }

        var client =
            _httpClientFactory.CreateClient();

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                webhookUri);

        /*
            This identifier gives the receiving bank a stable value it
            can use for idempotency/deduplication.
        */
        request.Headers.TryAddWithoutValidation(
            "X-SecureEscape-Notification-Id",
            attempt.Id.ToString());

        request.Content =
            JsonContent.Create(
                new
                {
                    eventType = "secure_escape.duress_alert",
                    notificationAttemptId = attempt.Id,
                    alertId = attempt.AlertId,
                    channel = attempt.Channel.ToString(),
                    occurredAt = DateTime.UtcNow
                });

        using var response =
            await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Secure Escape webhook was rejected. NotificationAttemptId: {NotificationAttemptId}, StatusCode: {StatusCode}",
                attempt.Id,
                (int)response.StatusCode);

            await MarkFailedAsync(
                attempt,
                $"Webhook endpoint returned HTTP {(int)response.StatusCode}.");

            return;
        }

        attempt.Status = NotificationStatus.Sent;
        attempt.SentAt = DateTime.UtcNow;
        attempt.ErrorMessage = string.Empty;
        attempt.ResponseMessage =
            Truncate(
                $"Webhook accepted with HTTP {(int)response.StatusCode}.",
                1000);

        await _auditService.LogAsync(
            AuditEventType.NotificationSent,
            entityType: "NotificationAttempt",
            entityId: attempt.Id,
            metadataJson:
                JsonSerializer.Serialize(
                    new
                    {
                        channel = attempt.Channel.ToString(),
                        statusCode = (int)response.StatusCode
                    }));

        await _unitOfWork.SaveChangesAsync();
    }

    private async Task MarkUnsupportedChannelAsync(
        NotificationAttempt attempt)
    {
        await MarkFailedAsync(
            attempt,
            $"No delivery provider is configured for the {attempt.Channel} notification channel.");
    }

    private async Task MarkFailedAsync(
        NotificationAttempt attempt,
        string errorMessage)
    {
        attempt.Status = NotificationStatus.Failed;
        attempt.SentAt = null;
        attempt.ErrorMessage =
            Truncate(errorMessage, 1000);
        attempt.ResponseMessage = string.Empty;

        /*
            Do not place destination phone numbers, email addresses,
            webhook URLs, message contents, provider credentials,
            or raw exceptions in audit metadata.
        */
        await _auditService.LogAsync(
            AuditEventType.NotificationFailed,
            entityType: "NotificationAttempt",
            entityId: attempt.Id,
            metadataJson:
                JsonSerializer.Serialize(
                    new
                    {
                        channel = attempt.Channel.ToString(),
                        reason = attempt.ErrorMessage
                    }));

        await _unitOfWork.SaveChangesAsync();
    }

    private static bool TryValidateWebhookDestination(
        string? destination,
        out Uri? webhookUri,
        out string errorMessage)
    {
        webhookUri = null;

        if (string.IsNullOrWhiteSpace(destination))
        {
            errorMessage =
                "Bank webhook destination is not configured.";

            return false;
        }

        if (!Uri.TryCreate(
                destination,
                UriKind.Absolute,
                out var parsedUri))
        {
            errorMessage =
                "Bank webhook destination is not a valid absolute URL.";

            return false;
        }

        /*
            Production bank webhooks must use HTTPS. This also prevents
            accidental dispatch to plain HTTP endpoints.
        */
        if (!string.Equals(
                parsedUri.Scheme,
                Uri.UriSchemeHttps,
                StringComparison.OrdinalIgnoreCase))
        {
            errorMessage =
                "Bank webhook destination must use HTTPS.";

            return false;
        }

        webhookUri = parsedUri;
        errorMessage = string.Empty;

        return true;
    }

    private static bool IsSupportedChannel(
        NotificationChannel channel)
    {
        return channel == NotificationChannel.Sms ||
               channel == NotificationChannel.Email ||
               channel == NotificationChannel.Webhook;
    }

    private static string Truncate(
        string value,
        int maximumLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value.Length <= maximumLength
            ? value
            : value[..maximumLength];
    }

    private static NotificationAttemptResponseDto MapToResponse(
        NotificationAttempt attempt)
    {
        return new NotificationAttemptResponseDto
        {
            Id = attempt.Id,
            Channel = attempt.Channel,
            Destination = attempt.Destination,
            MessageBody = attempt.MessageBody,
            Status = attempt.Status,
            ErrorMessage = attempt.ErrorMessage,
            AttemptedAt = attempt.AttemptedAt,
            SentAt = attempt.SentAt,
            ResponseMessage = attempt.ResponseMessage,
            CreatedAt = attempt.CreatedAt
        };
    }
}