using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;

namespace SecureEscape.Api.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);

    Task<LoginResponseDto?> VerifyTwoFactorLoginAsync(
        VerifyTwoFactorLoginRequestDto request);

    /*
        Starts mandatory first-time authenticator enrollment after
        the customer has successfully passed the banking PIN step.
    */
    Task<TwoFactorLoginSetupResponseDto?> SetupTwoFactorLoginAsync(
        SetupTwoFactorLoginRequestDto request);

    /*
        Confirms the first authenticator code during enrollment.
        A successful confirmation enables 2FA and returns the final
        authenticated login response containing the JWT.
    */
    Task<LoginResponseDto?> ConfirmTwoFactorLoginSetupAsync(
        ConfirmTwoFactorLoginSetupRequestDto request);

    Task<bool> VerifyPinAsync(string pin);

    Task LogoutAsync();

    /*
        Existing authenticated-account 2FA management methods.
        These are kept for compatibility with the current API.
    */
    Task<TwoFactorSetupResponseDto> SetupTwoFactorAsync();

    Task<bool> ConfirmTwoFactorAsync(string code);
}