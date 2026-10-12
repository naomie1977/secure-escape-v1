namespace SecureEscape.Api.DTOs.Response;

public class EmergencyContactResponseDto
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Relationship { get; set; } = string.Empty;

    public bool IsPrimary { get; set; }

    public bool NotifyOnDuress { get; set; }

    public DateTime CreatedAt { get; set; }
}