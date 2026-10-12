export type LoginRequest = {
  email: string;
  pin: string;
  deviceInfo?: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
};

export type LoginResponse = {
  userId: string;
  userSessionId: string;
  fullName: string;
  email: string;
  token: string;
  sessionMode: "Normal" | "Duress" | "";
  isDuress: boolean;

  /*
    True when this customer has already enrolled authenticator 2FA
    and must enter their current six-digit authenticator code.
  */
  requiresTwoFactor: boolean;

  /*
    True when this customer has not enrolled authenticator 2FA yet
    and must complete first-time setup before receiving a JWT.
  */
  requiresTwoFactorSetup: boolean;

  /*
    Temporary challenge for an already-enrolled customer's
    authenticator verification.
  */
  twoFactorChallengeToken: string;

  /*
    Temporary challenge for first-time authenticator enrollment.

    This is NOT the authenticator secret.
  */
  twoFactorSetupChallengeToken: string;
};

export type VerifyTwoFactorLoginRequest = {
  challengeToken: string;
  code: string;
};

/*
  Sent to the backend when the app needs the customer's
  first-time authenticator setup information.
*/
export type SetupTwoFactorLoginRequest = {
  challengeToken: string;
};

/*
  Returned by the backend during first-time enrollment.

  setupUri is the otpauth:// value that can later be represented
  as a QR code.

  manualEntryKey allows setup directly on the same phone without
  requiring the user to scan their own screen.
*/
export type TwoFactorLoginSetupResponse = {
  manualEntryKey: string;
  setupUri: string;
};

/*
  Sent after the customer has added Secure Escape to their
  authenticator app and enters the first rotating six-digit code.
*/
export type ConfirmTwoFactorLoginSetupRequest = {
  challengeToken: string;
  code: string;
};