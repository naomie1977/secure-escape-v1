using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SecureEscape.Api.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IConfiguration configuration,
        ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendAsync(
        string destinationEmail,
        string subject,
        string textBody,
        string? htmlBody = null)
    {
        if (string.IsNullOrWhiteSpace(destinationEmail))
        {
            return EmailSendResult.Failure(
                "Email destination is missing.");
        }

        if (!IsValidEmailAddress(destinationEmail))
        {
            return EmailSendResult.Failure(
                "Email destination is not a valid email address.");
        }

        if (string.IsNullOrWhiteSpace(subject))
        {
            return EmailSendResult.Failure(
                "Email subject is missing.");
        }

        if (string.IsNullOrWhiteSpace(textBody))
        {
            return EmailSendResult.Failure(
                "Email message body is missing.");
        }

        var host =
            _configuration["Email:SmtpHost"];

        var portValue =
            _configuration["Email:SmtpPort"];

        var username =
            _configuration["Email:Username"];

        var password =
            _configuration["Email:Password"];

        var fromEmail =
            _configuration["Email:FromEmail"];

        var fromName =
            _configuration["Email:FromName"];

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portValue) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning(
                "Email dispatch was requested, but SMTP configuration is incomplete.");

            return EmailSendResult.Failure(
                "Email provider is not configured.");
        }

        if (!int.TryParse(portValue, out var port) ||
            port <= 0 ||
            port > 65535)
        {
            _logger.LogWarning(
                "Email SMTP port configuration is invalid.");

            return EmailSendResult.Failure(
                "Email SMTP port configuration is invalid.");
        }

        if (!IsValidEmailAddress(fromEmail))
        {
            _logger.LogWarning(
                "Email sender address configuration is invalid.");

            return EmailSendResult.Failure(
                "Email sender address configuration is invalid.");
        }

        try
        {
            var message = new MimeMessage();

            message.From.Add(
                new MailboxAddress(
                    string.IsNullOrWhiteSpace(fromName)
                        ? "Secure Escape"
                        : fromName.Trim(),
                    fromEmail.Trim()));

            message.To.Add(
                MailboxAddress.Parse(destinationEmail.Trim()));

            message.Subject = subject.Trim();

            var bodyBuilder = new BodyBuilder
            {
                TextBody = textBody
            };

            if (!string.IsNullOrWhiteSpace(htmlBody))
            {
                bodyBuilder.HtmlBody = htmlBody;
            }

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();

            /*
                Port 587 with StartTls is the standard configuration
                used by Gmail SMTP for authenticated message submission.
            */
            await client.ConnectAsync(
                host.Trim(),
                port,
                SecureSocketOptions.StartTls);

            await client.AuthenticateAsync(
                username.Trim(),
                password);

            var providerResponse =
                await client.SendAsync(message);

            await client.DisconnectAsync(true);

            _logger.LogInformation(
                "Emergency email was accepted by the SMTP provider.");

            return EmailSendResult.Success(
                string.IsNullOrWhiteSpace(providerResponse)
                    ? "SMTP provider accepted the message."
                    : SanitizeProviderResponse(providerResponse));
        }
        catch (MailKit.Security.AuthenticationException ex)
        {
            _logger.LogError(
                ex,
                "SMTP authentication failed while sending an emergency email.");

            return EmailSendResult.Failure(
                "Email provider authentication failed.");
        }
        catch (SmtpCommandException ex)
        {
            var providerMessage =
                SanitizeProviderResponse(ex.Message);

            _logger.LogError(
                "SMTP provider rejected an emergency email. StatusCode: {StatusCode}. Provider message: {ProviderMessage}",
                ex.StatusCode,
                providerMessage);

            return EmailSendResult.Failure(
                $"Email provider rejected the message: {providerMessage}");
        }
        catch (SmtpProtocolException ex)
        {
            _logger.LogError(
                ex,
                "SMTP protocol error while sending an emergency email.");

            return EmailSendResult.Failure(
                "An SMTP protocol error occurred.");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected error while sending an emergency email.");

            return EmailSendResult.Failure(
                "An unexpected email provider error occurred.");
        }
    }

    private static bool IsValidEmailAddress(string emailAddress)
    {
        if (string.IsNullOrWhiteSpace(emailAddress))
        {
            return false;
        }

        try
        {
            var mailbox =
                MailboxAddress.Parse(emailAddress.Trim());

            return string.Equals(
                mailbox.Address,
                emailAddress.Trim(),
                StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static string SanitizeProviderResponse(
        string? providerResponse)
    {
        if (string.IsNullOrWhiteSpace(providerResponse))
        {
            return "SMTP provider did not provide a response.";
        }

        var sanitized =
            providerResponse
                .Replace("\r", " ")
                .Replace("\n", " ")
                .Trim();

        const int maximumLength = 700;

        return sanitized.Length <= maximumLength
            ? sanitized
            : sanitized[..maximumLength];
    }
}

public sealed class EmailSendResult
{
    public bool IsSuccessful { get; init; }

    public string? ProviderResponse { get; init; }

    public string? ErrorMessage { get; init; }

    public static EmailSendResult Success(
        string providerResponse)
    {
        return new EmailSendResult
        {
            IsSuccessful = true,
            ProviderResponse = providerResponse
        };
    }

    public static EmailSendResult Failure(
        string errorMessage)
    {
        return new EmailSendResult
        {
            IsSuccessful = false,
            ErrorMessage = errorMessage
        };
    }
}