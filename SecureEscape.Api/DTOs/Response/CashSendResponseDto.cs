using SecureEscape.Api.Enums;

namespace SecureEscape.Api.DTOs.Response;

public class CashSendResponseDto
{
    public Guid TransactionId { get; set; }

    public Guid BankAccountId { get; set; }

    public string BankReference { get; set; } = string.Empty;

    public string VoucherNumber { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "ZAR";

    public TransactionStatus Status { get; set; }
    public string? StatusReason { get; set; }

    public DateTime VoucherExpiresAt { get; set; }

    public bool VoucherRedeemed { get; set; }

    public DateTime CreatedAt { get; set; }
}