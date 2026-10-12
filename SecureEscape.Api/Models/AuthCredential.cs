using System.ComponentModel.DataAnnotations;

namespace SecureEscape.Api.Models
{
    public class AuthCredential
    {
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string NormalPinHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string DuressPinHash { get; set; } = string.Empty;

        // Stores the protected/encrypted TOTP secret.
        // The raw authenticator secret must never be stored in plaintext.
        [MaxLength(1000)]
        public string? TotpSecret { get; set; }

        public bool IsTwoFactorEnabled { get; set; }

        public DateTime? TwoFactorEnabledAt { get; set; }

        public DateTime? PasswordUpdatedAt { get; set; }

        public DateTime? PinUpdatedAt { get; set; }

        public DateTime? DuressPinUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public User? User { get; set; }
    }
}