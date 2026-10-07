import { API_BASE_URL } from "../constants/api";
import { getToken } from "../utils/tokenStore";

export type AdminAuditLog = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userSessionId: string | null;
  adminUserId: string | null;
  adminName: string | null;
  actor: string;
  metadataJson: string;
  createdAt: string;
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

export async function getAuditLogs(): Promise<
  AdminAuditLog[]
> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/audit-logs`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    await handleError(
      response,
      "Failed to load audit logs.",
    );
  }

  return response.json();
}