using System.ComponentModel.DataAnnotations;
using SecureEscape.Api.Enums;

namespace SecureEscape.Api.Models
{
    public class EmergencyContact
    {
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(254)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Relationship { get; set; } = string.Empty;

        public bool NotifyOnDuress { get; set; } = true;

        public bool IsPrimary { get; set; } = false;

        public EmergencyContactStatus Status { get; set; } = EmergencyContactStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public User? User { get; set; }
    }
}