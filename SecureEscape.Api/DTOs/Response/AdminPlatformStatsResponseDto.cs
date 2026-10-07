namespace SecureEscape.Api.DTOs.Response;

public class AdminPlatformStatsResponseDto
{
    public int ConnectedBanks { get; set; }

    public int TotalUsers { get; set; }

    public int TotalDuressSessions { get; set; }

    public int ActiveSessions { get; set; }

    public int ResolvedCases { get; set; }

    public int HighRiskEvents { get; set; }

    public List<AdminBankStatsResponseDto> Banks { get; set; } = new();
}

public class AdminBankStatsResponseDto
{
    public Guid BankIntegrationId { get; set; }

    public string BankName { get; set; } = string.Empty;

    public string BankCode { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int RegisteredUsers { get; set; }

    public int DuressSessions { get; set; }

    public int ActiveSessions { get; set; }

    public int ResolvedCases { get; set; }

    public int HighRiskEvents { get; set; }
}