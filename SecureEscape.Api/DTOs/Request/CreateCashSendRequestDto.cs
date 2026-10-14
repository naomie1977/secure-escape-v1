using System.ComponentModel.DataAnnotations;

namespace SecureEscape.Api.DTOs.Request;

public class CreateCashSendRequestDto
{
    [Required]
    public Guid BankAccountId { get; set; }

    [Required]
    [Range(0.01, 50_000)]
    public decimal Amount { get; set; }

    [Required]
    [StringLength(4, MinimumLength = 4, ErrorMessage = "Voucher PIN must be exactly 4 digits.")]
    [RegularExpression(@"^\d{4}$", ErrorMessage = "Voucher PIN must contain exactly 4 numeric digits.")]
    public string VoucherPin { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}