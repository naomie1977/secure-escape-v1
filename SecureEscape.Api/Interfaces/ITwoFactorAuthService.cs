namespace SecureEscape.Api.Interfaces
{
    public interface ITwoFactorAuthService
    {
        string GenerateSecret();

        string GenerateSetupUri(
            string email,
            string secret);

        bool VerifyCode(
            string secret,
            string code);

        string ProtectSecret(string secret);

        string UnprotectSecret(string protectedSecret);
    }
}