namespace SecureEscape.Api.DTOs.Response;

public class AdminAuditLogResponseDto
{
    public Guid Id { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public Guid? EntityId { get; set; }

    public Guid? UserId { get; set; }

    public string? UserName { get; set; }

    public Guid? UserSessionId { get; set; }

    public Guid? AdminUserId { get; set; }

    public string? AdminName { get; set; }

    public string Actor { get; set; } = "System";

    public string MetadataJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}