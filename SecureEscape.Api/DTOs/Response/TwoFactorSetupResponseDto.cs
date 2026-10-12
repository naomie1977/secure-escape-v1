namespace SecureEscape.Api.DTOs.Response;

public class TwoFactorSetupResponseDto
{
    public string ManualEntryKey { get; set; } = string.Empty;

    public string SetupUri { get; set; } = string.Empty;

    public bool IsAlreadyEnabled { get; set; }
}