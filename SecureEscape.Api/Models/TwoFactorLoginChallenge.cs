using System;
using System.ComponentModel.DataAnnotations;
using SecureEscape.Api.Enums;

namespace SecureEscape.Api.Models
{
    public class TwoFactorLoginChallenge
    {
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid UserSessionId { get; set; }

        [Required]
        [MaxLength(128)]
        public string ChallengeTokenHash { get; set; } = string.Empty;

        /*
            Identifies what this temporary challenge is allowed to do.

            LoginVerification:
            The customer already has authenticator 2FA enabled and
            must verify a current TOTP code before receiving a JWT.

            Enrollment:
            The customer has passed the banking PIN step but has not
            enrolled authenticator 2FA yet. The challenge may only be
            used for first-time authenticator enrollment.
        */
        public TwoFactorChallengePurpose Purpose { get; set; } =
            TwoFactorChallengePurpose.LoginVerification;

        public DateTime ExpiresAt { get; set; }

        public int FailedAttemptCount { get; set; } = 0;

        public DateTime? UsedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public User? User { get; set; }

        public UserSession? UserSession { get; set; }
    }
}