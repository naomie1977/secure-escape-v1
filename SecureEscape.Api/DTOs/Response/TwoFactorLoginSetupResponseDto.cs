namespace SecureEscape.Api.DTOs.Response;

public class TwoFactorLoginSetupResponseDto
{
    /*
        Manual key the user can enter into Google Authenticator,
        Microsoft Authenticator, or another compatible TOTP app.
    */
    public string ManualEntryKey { get; set; } = string.Empty;

    /*
        Standard otpauth:// URI containing the account name,
        issuer, secret, algorithm, digit count, and TOTP period.

        The mobile app can use this value to generate a QR code.
    */
    public string SetupUri { get; set; } = string.Empty;
}