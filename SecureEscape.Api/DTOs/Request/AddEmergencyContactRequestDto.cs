using System.ComponentModel.DataAnnotations;

namespace SecureEscape.Api.DTOs.Request;

public class AddEmergencyContactRequestDto
{
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Relationship { get; set; } = string.Empty;

    public bool IsPrimary { get; set; } = false;

    public bool NotifyOnDuress { get; set; } = true;
}