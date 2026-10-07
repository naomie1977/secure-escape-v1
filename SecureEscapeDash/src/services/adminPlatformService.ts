import { API_BASE_URL } from "../constants/api";
import { getToken } from "../utils/tokenStore";

export type AdminBankStats = {
  bankIntegrationId: string;
  bankName: string;
  bankCode: string;
  status: string;
  registeredUsers: number;
  duressSessions: number;
  activeSessions: number;
  resolvedCases: number;
  highRiskEvents: number;
};

export type AdminPlatformStats = {
  connectedBanks: number;
  totalUsers: number;
  totalDuressSessions: number;
  activeSessions: number;
  resolvedCases: number;
  highRiskEvents: number;
  banks: AdminBankStats[];
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

export async function getAdminPlatformStats(): Promise<AdminPlatformStats> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/platform/stats`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    await handleError(
      response,
      "Failed to load platform statistics.",
    );
  }

  return response.json();
}