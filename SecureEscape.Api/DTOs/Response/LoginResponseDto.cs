namespace SecureEscape.Api.DTOs.Response;

public class LoginResponseDto
{
    public Guid UserId { get; set; }

    public Guid UserSessionId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public string SessionMode { get; set; } = string.Empty;

    public bool IsDuress { get; set; }

    /*
        True when the user has already enrolled authenticator 2FA
        and must enter their current six-digit authenticator code.
    */
    public bool RequiresTwoFactor { get; set; }

    /*
        True when the user has not yet enrolled authenticator 2FA
        and must complete first-time authenticator setup before
        receiving an authenticated JWT.
    */
    public bool RequiresTwoFactorSetup { get; set; }

    /*
        Temporary challenge used only for an already-enrolled
        user's authenticator verification.
    */
    public string TwoFactorChallengeToken { get; set; } = string.Empty;

    /*
        Temporary challenge used only for first-time authenticator
        enrollment. This is not the TOTP secret.
    */
    public string TwoFactorSetupChallengeToken { get; set; } = string.Empty;
}