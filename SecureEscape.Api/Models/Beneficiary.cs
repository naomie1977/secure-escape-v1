using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using SecureEscape.Api.Enums;

namespace SecureEscape.Api.Models
{
    public class Beneficiary
    {
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string BankName { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string AccountNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Reference { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public BeneficiaryStatus Status { get; set; } = BeneficiaryStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastPaidAt { get; set; }
        public bool CreatedUnderDuress { get; set; }

        public User? User { get; set; }

        public ICollection<BankTransaction> Transactions { get; set; } = new List<BankTransaction>();
    }
}