using Twilio;
using Twilio.Exceptions;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace SecureEscape.Api.Services;

public class TwilioSmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TwilioSmsService> _logger;

    public TwilioSmsService(
        IConfiguration configuration,
        ILogger<TwilioSmsService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<TwilioSmsResult> SendAsync(
        string destinationPhoneNumber,
        string messageBody)
    {
        if (string.IsNullOrWhiteSpace(destinationPhoneNumber))
        {
            return TwilioSmsResult.Failure(
                "SMS destination phone number is missing.");
        }

        if (!IsValidE164PhoneNumber(destinationPhoneNumber))
        {
            return TwilioSmsResult.Failure(
                "SMS destination must use E.164 format, for example +27821234567.");
        }

        if (string.IsNullOrWhiteSpace(messageBody))
        {
            return TwilioSmsResult.Failure(
                "SMS message body is missing.");
        }

        var accountSid =
            _configuration["Twilio:AccountSid"];

        var authToken =
            _configuration["Twilio:AuthToken"];

        var fromPhoneNumber =
            _configuration["Twilio:FromPhoneNumber"];

        if (string.IsNullOrWhiteSpace(accountSid) ||
            string.IsNullOrWhiteSpace(authToken) ||
            string.IsNullOrWhiteSpace(fromPhoneNumber))
        {
            _logger.LogWarning(
                "Twilio SMS dispatch was requested, but Twilio configuration is incomplete.");

            return TwilioSmsResult.Failure(
                "Twilio SMS provider is not configured.");
        }

        if (!IsValidE164PhoneNumber(fromPhoneNumber))
        {
            _logger.LogWarning(
                "Twilio From phone number is not configured in E.164 format.");

            return TwilioSmsResult.Failure(
                "Twilio sender phone number configuration is invalid.");
        }

        try
        {
            TwilioClient.Init(accountSid, authToken);

            var message = await MessageResource.CreateAsync(
                body: messageBody,
                from: new PhoneNumber(fromPhoneNumber),
                to: new PhoneNumber(destinationPhoneNumber));

            /*
                Twilio returning a Message SID means the provider accepted
                the message request. It does not necessarily mean the
                recipient's handset has already received the SMS.
            */
            if (string.IsNullOrWhiteSpace(message.Sid))
            {
                _logger.LogWarning(
                    "Twilio accepted an SMS request but did not return a Message SID.");

                return TwilioSmsResult.Failure(
                    "Twilio did not return a message identifier.");
            }

            _logger.LogInformation(
                "Twilio accepted an emergency SMS. Message SID: {MessageSid}, Status: {MessageStatus}",
                message.Sid,
                message.Status);

            return TwilioSmsResult.Success(
                message.Sid,
                message.Status?.ToString());
        }
        catch (ApiException ex)
        {
            /*
                Preserve Twilio's provider error description so failed
                NotificationAttempt records contain enough information
                for troubleshooting.

                Do not include the destination number, AuthToken,
                Account SID, sender number, or SMS message body.
            */
            var providerMessage =
                SanitizeProviderErrorMessage(ex.Message);

            _logger.LogError(
                "Twilio rejected an emergency SMS request. Twilio code: {TwilioCode}. Provider message: {ProviderMessage}",
                ex.Code,
                providerMessage);

            return TwilioSmsResult.Failure(
                $"Twilio rejected the SMS request (code {ex.Code}): {providerMessage}");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected error while sending an emergency SMS through Twilio.");

            return TwilioSmsResult.Failure(
                "An unexpected SMS provider error occurred.");
        }
    }

    private static bool IsValidE164PhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return false;
        }

        if (!phoneNumber.StartsWith('+'))
        {
            return false;
        }

        var digits = phoneNumber[1..];

        if (digits.Length < 8 || digits.Length > 15)
        {
            return false;
        }

        return digits.All(char.IsDigit);
    }

    private static string SanitizeProviderErrorMessage(
        string? providerMessage)
    {
        if (string.IsNullOrWhiteSpace(providerMessage))
        {
            return "Twilio did not provide an error description.";
        }

        var sanitized =
            providerMessage
                .Replace("\r", " ")
                .Replace("\n", " ")
                .Trim();

        const int maximumLength = 700;

        return sanitized.Length <= maximumLength
            ? sanitized
            : sanitized[..maximumLength];
    }
}

public sealed class TwilioSmsResult
{
    public bool IsSuccessful { get; init; }

    public string? ProviderMessageId { get; init; }

    public string? ProviderStatus { get; init; }

    public string? ErrorMessage { get; init; }

    public static TwilioSmsResult Success(
        string providerMessageId,
        string? providerStatus)
    {
        return new TwilioSmsResult
        {
            IsSuccessful = true,
            ProviderMessageId = providerMessageId,
            ProviderStatus = providerStatus
        };
    }

    public static TwilioSmsResult Failure(string errorMessage)
    {
        return new TwilioSmsResult
        {
            IsSuccessful = false,
            ErrorMessage = errorMessage
        };
    }
}