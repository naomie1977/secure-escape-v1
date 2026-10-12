using System.ComponentModel.DataAnnotations;

namespace SecureEscape.Api.DTOs.Request;

public class ConfirmTwoFactorRequestDto
{
    [Required]
    [RegularExpression(
        @"^\d{6}$",
        ErrorMessage = "Authenticator code must contain exactly 6 digits.")]
    public string Code { get; set; } = string.Empty;
}