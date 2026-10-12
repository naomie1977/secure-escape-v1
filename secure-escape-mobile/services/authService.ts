import { API_BASE_URL } from "@/constants/api";
import {
  ConfirmTwoFactorLoginSetupRequest,
  LoginRequest,
  LoginResponse,
  SetupTwoFactorLoginRequest,
  TwoFactorLoginSetupResponse,
  VerifyTwoFactorLoginRequest,
} from "@/types/auth";
import {
  clearAuthToken,
  getAuthToken,
  setLastActivityNow,
} from "./tokenStore";
import { getAuthorizedHeaders } from "./transactionServices";

async function getErrorMessage(response: Response, fallback: string) {
  const text = await response.text();

  if (!text) {
    return fallback;
  }

  try {
    const errorBody = JSON.parse(text);

    if (typeof errorBody.message === "string") {
      return errorBody.message;
    }

    if (errorBody.errors) {
      return Object.values(errorBody.errors).flat().join("\n");
    }

    if (typeof errorBody.title === "string") {
      return errorBody.title;
    }
  } catch {
    return text;
  }

  return fallback;
}

export async function login(
  request: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/login`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Login failed. Please check your details and try again.",
      ),
    );
  }

  const result: LoginResponse = await response.json();

  /*
    A JWT must only exist after the customer's complete
    authentication flow has finished.

    For an already-enrolled customer this means successful TOTP
    verification.

    For a first-time customer this means successful authenticator
    enrollment and confirmation.
  */
  if (
    !result.requiresTwoFactor &&
    !result.requiresTwoFactorSetup &&
    result.token
  ) {
    await setLastActivityNow();
  }

  return result;
}

export async function verifyTwoFactorLogin(
  request: VerifyTwoFactorLoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/2fa/verify-login`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Invalid or expired two-factor authentication challenge.",
      ),
    );
  }

  const result: LoginResponse = await response.json();

  if (!result.token) {
    throw new Error(
      "Two-factor authentication completed without an authentication token.",
    );
  }

  await setLastActivityNow();

  return result;
}

/*
  Starts first-time authenticator enrollment.

  The customer does not have a JWT at this point. The temporary
  enrollment challenge returned by the PIN login is used instead.
*/
export async function setupTwoFactorLogin(
  request: SetupTwoFactorLoginRequest,
): Promise<TwoFactorLoginSetupResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/2fa/setup-login`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Unable to start authenticator setup. Please sign in again.",
      ),
    );
  }

  const result: TwoFactorLoginSetupResponse =
    await response.json();

  if (!result.manualEntryKey || !result.setupUri) {
    throw new Error(
      "Authenticator setup information was not returned by the server.",
    );
  }

  return result;
}

/*
  Confirms the first rotating authenticator code.

  A successful response is the first point in the enrollment flow
  where the backend returns the authenticated JWT.
*/
export async function confirmTwoFactorLoginSetup(
  request: ConfirmTwoFactorLoginSetupRequest,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/2fa/confirm-login-setup`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Invalid authenticator code or expired setup session.",
      ),
    );
  }

  const result: LoginResponse = await response.json();

  if (!result.token) {
    throw new Error(
      "Authenticator enrollment completed without an authentication token.",
    );
  }

  await setLastActivityNow();

  return result;
}

export async function logout(): Promise<void> {
  const token = await getAuthToken();

  if (token) {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }

  await clearAuthToken();
}

export async function verifyPin(
  pin: string,
): Promise<{ verified: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/verify-pin`,
    {
      method: "POST",
      headers: await getAuthorizedHeaders(),
      body: JSON.stringify({ pin }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Verification failed.",
      ),
    );
  }

  return response.json();
}