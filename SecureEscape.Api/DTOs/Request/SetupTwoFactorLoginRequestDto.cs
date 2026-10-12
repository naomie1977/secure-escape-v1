using System.ComponentModel.DataAnnotations;

namespace SecureEscape.Api.DTOs.Request;

public class SetupTwoFactorLoginRequestDto
{
    [Required]
    public string ChallengeToken { get; set; } = string.Empty;
}