using Microsoft.AspNetCore.DataProtection;
using OtpNet;
using SecureEscape.Api.Interfaces;

namespace SecureEscape.Api.Services
{
    public class TwoFactorAuthService : ITwoFactorAuthService
    {
        private const string Issuer = "Secure Escape";
        private const string DataProtectionPurpose = "SecureEscape.TotpSecret.v1";

        private readonly IDataProtector _dataProtector;

        public TwoFactorAuthService(IDataProtectionProvider dataProtectionProvider)
        {
            _dataProtector = dataProtectionProvider.CreateProtector(
                DataProtectionPurpose);
        }

        public string GenerateSecret()
        {
            var secretBytes = KeyGeneration.GenerateRandomKey(20);

            return Base32Encoding.ToString(secretBytes);
        }

        public string GenerateSetupUri(
            string email,
            string secret)
        {
            var encodedIssuer = Uri.EscapeDataString(Issuer);
            var encodedAccount = Uri.EscapeDataString(email);

            return
                $"otpauth://totp/{encodedIssuer}:{encodedAccount}" +
                $"?secret={secret}" +
                $"&issuer={encodedIssuer}" +
                $"&algorithm=SHA1" +
                $"&digits=6" +
                $"&period=30";
        }

        public bool VerifyCode(
            string secret,
            string code)
        {
            if (string.IsNullOrWhiteSpace(secret) ||
                string.IsNullOrWhiteSpace(code))
            {
                return false;
            }

            var normalizedCode = code
                .Trim()
                .Replace(" ", string.Empty);

            if (normalizedCode.Length != 6 ||
                !normalizedCode.All(char.IsDigit))
            {
                return false;
            }

            try
            {
                var secretBytes = Base32Encoding.ToBytes(secret);

                var totp = new Totp(
                    secretBytes,
                    step: 30,
                    mode: OtpHashMode.Sha1,
                    totpSize: 6);

                return totp.VerifyTotp(
                    normalizedCode,
                    out _,
                    new VerificationWindow(
                        previous: 1,
                        future: 1));
            }
            catch
            {
                return false;
            }
        }

        public string ProtectSecret(string secret)
        {
            if (string.IsNullOrWhiteSpace(secret))
            {
                throw new ArgumentException(
                    "TOTP secret cannot be empty.",
                    nameof(secret));
            }

            return _dataProtector.Protect(secret);
        }

        public string UnprotectSecret(string protectedSecret)
        {
            if (string.IsNullOrWhiteSpace(protectedSecret))
            {
                throw new ArgumentException(
                    "Protected TOTP secret cannot be empty.",
                    nameof(protectedSecret));
            }

            return _dataProtector.Unprotect(protectedSecret);
        }
    }
}