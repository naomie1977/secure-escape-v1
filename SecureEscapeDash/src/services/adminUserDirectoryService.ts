import { API_BASE_URL } from "../constants/api";
import { getToken } from "../utils/tokenStore";

export type SecureEscapeUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  userStatus: string;

  bankIntegrationId: string;
  bankName: string;
  bankCode: string;

  enrollmentStatus: string;
  enrollmentStartedAt: string | null;
  enrollmentActivatedAt: string | null;

  hasActiveSession: boolean;
  lastActivityAt: string | null;

  createdAt: string;
};

export type StaffUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activityStatus: string;

  bankIntegrationId: string | null;
  bankName: string | null;
  bankCode: string | null;

  createdAt: string;
  updatedAt: string | null;
};

export type AdminUserDirectory = {
  secureEscapeUsers: SecureEscapeUser[];
  staffUsers: StaffUser[];
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleError(
  response: Response,
  fallbackMessage: string,
) {
  let details = "";

  try {
    details = await response.text();
  } catch {
    details = "";
  }

  throw new Error(
    `${fallbackMessage} Status: ${response.status}. ${details}`,
  );
}

export async function getAdminUserDirectory(): Promise<AdminUserDirectory> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/user-directory`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    await handleError(
      response,
      "Failed to load the user directory.",
    );
  }

  return response.json();
}