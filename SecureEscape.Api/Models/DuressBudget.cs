using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecureEscape.Api.Models;

// The decoy balance and spending limit are fixed at session creation.
public class DuressBudget
{
    [Key]
    public Guid UserSessionId { get; set; }
    public Guid? BankAccountId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal OriginalBalance { get; set; }
    [ConcurrencyCheck, Column(TypeName = "decimal(18,2)")]
    public decimal RemainingBalance { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal OriginalSpendingLimit { get; set; }
    [ConcurrencyCheck, Column(TypeName = "decimal(18,2)")]
    public decimal RemainingSpendingLimit { get; set; }
    [Column(TypeName = "decimal(5,4)")]
    public decimal PendingThresholdRate { get; set; } = 0.50m;
    public string ExistingBeneficiaryIdsJson { get; set; } = "[]";
}

