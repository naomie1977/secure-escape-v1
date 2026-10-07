using SecureEscape.Api.Enums;

namespace SecureEscape.Api.DTOs.Response;

public class AlertLocationResponseDto
{
    public Guid Id { get; set; }

    public decimal Latitude { get; set; }

    public decimal Longitude { get; set; }

    public string? Address { get; set; }

    public decimal AccuracyMeters { get; set; }

    public LocationSource LocationSource { get; set; }

    public DateTime CapturedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}