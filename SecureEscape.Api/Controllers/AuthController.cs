using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecureEscape.Api.DTOs.Request;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Interfaces;

namespace SecureEscape.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(
        LoginRequestDto request)
    {
        var response = await _authService.LoginAsync(request);

        if (response == null)
        {
            return Unauthorized(new
            {
                message = "Invalid email, password, or PIN."
            });
        }

        return Ok(response);
    }

    /*
        Used when the customer has already enrolled authenticator 2FA.

        The temporary login challenge and current six-digit TOTP code
        are verified before the authenticated JWT is issued.
    */
    [HttpPost("2fa/verify-login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> VerifyTwoFactorLogin(
        VerifyTwoFactorLoginRequestDto request)
    {
        var response =
            await _authService.VerifyTwoFactorLoginAsync(request);

        if (response == null)
        {
            return Unauthorized(new
            {
                message =
                    "Invalid or expired two-factor authentication challenge."
            });
        }

        return Ok(response);
    }

    /*
        Starts mandatory first-time authenticator enrollment.

        This endpoint intentionally allows anonymous access because the
        customer has passed the banking PIN step but has not received an
        authenticated JWT yet.

        Access is controlled by the temporary enrollment challenge.
    */
    [HttpPost("2fa/setup-login")]
    [AllowAnonymous]
    public async Task<ActionResult<TwoFactorLoginSetupResponseDto>>
        SetupTwoFactorLogin(
            SetupTwoFactorLoginRequestDto request)
    {
        var response =
            await _authService.SetupTwoFactorLoginAsync(request);

        if (response == null)
        {
            return Unauthorized(new
            {
                message =
                    "Invalid or expired two-factor enrollment challenge."
            });
        }

        return Ok(response);
    }

    /*
        Confirms the customer's first authenticator code during
        mandatory enrollment.

        A successful confirmation enables 2FA, consumes the temporary
        enrollment challenge, and returns the final authenticated login
        response containing the JWT.
    */
    [HttpPost("2fa/confirm-login-setup")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>>
        ConfirmTwoFactorLoginSetup(
            ConfirmTwoFactorLoginSetupRequestDto request)
    {
        var response =
            await _authService
                .ConfirmTwoFactorLoginSetupAsync(request);

        if (response == null)
        {
            return Unauthorized(new
            {
                message =
                    "Invalid authenticator code or expired two-factor enrollment challenge."
            });
        }

        return Ok(response);
    }

    [HttpPost("verify-pin")]
    [Authorize]
    public async Task<ActionResult<VerifyPinResponseDto>> VerifyPin(
        VerifyPinRequestDto request)
    {
        var verified = await _authService.VerifyPinAsync(request.Pin);

        return Ok(new VerifyPinResponseDto
        {
            Verified = verified
        });
    }

    /*
        Existing authenticated-account 2FA setup endpoint retained for
        compatibility and account-management scenarios.
    */
    [HttpPost("2fa/setup")]
    [Authorize]
    public async Task<ActionResult<TwoFactorSetupResponseDto>>
        SetupTwoFactor()
    {
        var response = await _authService.SetupTwoFactorAsync();

        if (response.IsAlreadyEnabled)
        {
            return Ok(new TwoFactorSetupResponseDto
            {
                IsAlreadyEnabled = true
            });
        }

        return Ok(response);
    }

    /*
        Existing authenticated-account 2FA confirmation endpoint
        retained for compatibility and account-management scenarios.
    */
    [HttpPost("2fa/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmTwoFactor(
        ConfirmTwoFactorRequestDto request)
    {
        var verified =
            await _authService.ConfirmTwoFactorAsync(request.Code);

        if (!verified)
        {
            return BadRequest(new
            {
                verified = false,
                message = "Invalid authenticator code."
            });
        }

        return Ok(new
        {
            verified = true,
            message =
                "Two-factor authentication has been enabled successfully."
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync();

        return Ok(new
        {
            message = "Logged out successfully."
        });
    }
}