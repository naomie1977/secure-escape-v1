namespace SecureEscape.Api.Enums
{
    public enum AuditEventType
    {
        PinVerification = 1,
        NormalPinMatched = 2,
        DuressPinMatched = 3,
        LoginFailed = 4,
        SessionCreated = 5,
        TransactionCreated = 6,
        DuressPinMatchedStepUp,
        TransactionEvaluated = 7,
        AlertCreated = 8,
        AlertStatusUpdated = 9,
        NotificationSent = 10,
        NotificationFailed = 11,
        DecoyProfileUpdated = 12,
        AccountFrozen = 13,
        DuressPinUpdated = 14,
        FraudReported = 15,
        VoucherInvalidated = 16,
        EntityCreated = 17,
        EntityUpdated = 18,
        EntityDeleted = 19,

        TwoFactorChallengeCreated = 20,
        TwoFactorVerificationSucceeded = 21,
        TwoFactorVerificationFailed = 22
    }
}