using SecureEscape.Api.Enums;

namespace SecureEscape.Api.DTOs.Response;

public class AlertTransactionResponseDto
{
    public Guid Id { get; set; }

    public Guid BankAccountId { get; set; }

    public Guid? BeneficiaryId { get; set; }

    // Recipient / beneficiary details shown to fraud analysts.
    // For saved-beneficiary transfers, these values come from the
    // Beneficiary linked to the transaction.
    // For once-off transfers, they come from the recipient details
    // stored directly on the BankTransaction.
    public string? BeneficiaryName { get; set; }

    public string? BeneficiaryBank { get; set; }

    public string? BeneficiaryAccountNumber { get; set; }

    public string? BeneficiaryAccountType { get; set; }

    public string? BeneficiaryBranchCode { get; set; }

    public string? BeneficiaryReference { get; set; }

    public BeneficiaryStatus? BeneficiaryStatus { get; set; }

    public DateTime? BeneficiaryLastPaidAt { get; set; }

    public string BankReference { get; set; } = string.Empty;

    public TransactionType TransactionType { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "ZAR";

    public TransactionStatus Status { get; set; }

    public string? StatusReason { get; set; }

    public bool Flagged { get; set; }

    public RiskLevel RiskLevel { get; set; }

    public decimal RiskScore { get; set; }

    public string Description { get; set; } = string.Empty;

    public string? SecureEscapeCode { get; set; }

    public DateTime CreatedAt { get; set; }
}