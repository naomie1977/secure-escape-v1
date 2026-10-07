namespace SecureEscape.Api.DTOs.Response;

public class AdminUsersResponseDto
{
    public List<SecureEscapeUserResponseDto> SecureEscapeUsers { get; set; } =
        new();

    public List<StaffUserResponseDto> StaffUsers { get; set; } =
        new();
}

public class SecureEscapeUserResponseDto
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string UserStatus { get; set; } = string.Empty;

    public Guid BankIntegrationId { get; set; }

    public string BankName { get; set; } = string.Empty;

    public string BankCode { get; set; } = string.Empty;

    public string EnrollmentStatus { get; set; } = string.Empty;

    public DateTime? EnrollmentStartedAt { get; set; }

    public DateTime? EnrollmentActivatedAt { get; set; }

    public bool HasActiveSession { get; set; }

    public DateTime? LastActivityAt { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class StaffUserResponseDto
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string ActivityStatus { get; set; } = string.Empty;

    public Guid? BankIntegrationId { get; set; }

    public string? BankName { get; set; }

    public string? BankCode { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}