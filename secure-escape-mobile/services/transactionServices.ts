import { API_BASE_URL } from "@/constants/api";
import { getAuthToken } from "@/services/tokenStore";
import * as FileSystem from "expo-file-system/legacy";
import {
  CashSendResponse,
  CreateCashSendRequest,
  CreateTransferRequest,
  TransactionResponse,
} from "@/types/transaction";

export async function getAuthorizedHeaders() {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("No auth token found. Please log in again.");
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getErrorMessage(
  response: Response,
  fallback: string,
) {
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
      return Object.values(errorBody.errors)
        .flat()
        .join("\n");
    }

    if (typeof errorBody.title === "string") {
      return errorBody.title;
    }
  } catch {
    return text;
  }

  return fallback;
}

export async function createTransfer(
  request: CreateTransferRequest,
): Promise<TransactionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/transactions`,
    {
      method: "POST",
      headers: await getAuthorizedHeaders(),
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to create transfer.",
      ),
    );
  }

  return response.json();
}

export async function uploadCurrentPhotoEvidence(
  photoUri: string,
  bankTransactionId: string,
): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error(
      "No auth token found. Please log in again.",
    );
  }

  const uploadResult = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/v1/session-evidence/current-photo`,
    photoUri,
    {
      httpMethod: "POST",
      uploadType:
        FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "photo",
      mimeType: "image/jpeg",
      parameters: {
        bankTransactionId,
      },
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (
    uploadResult.status < 200 ||
    uploadResult.status >= 300
  ) {
    let message =
      "The security photo could not be saved.";

    if (uploadResult.body) {
      try {
        const errorBody = JSON.parse(uploadResult.body);

        if (typeof errorBody.message === "string") {
          message = errorBody.message;
        } else if (
          typeof errorBody.title === "string"
        ) {
          message = errorBody.title;
        }
      } catch {
        if (uploadResult.body.trim()) {
          message = uploadResult.body;
        }
      }
    }

    throw new Error(message);
  }
}

export async function uploadScreenRecordingEvidence(
  videoUri: string,
): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error(
      "No auth token found. Please log in again.",
    );
  }

  const normalizedUri = videoUri.toLowerCase();

  const mimeType = normalizedUri.endsWith(".mov")
    ? "video/quicktime"
    : normalizedUri.endsWith(".webm")
      ? "video/webm"
      : "video/mp4";

  const uploadResult = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/v1/session-evidence/screen-recording`,
    videoUri,
    {
      httpMethod: "POST",
      uploadType:
        FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "video",
      mimeType,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (
    uploadResult.status < 200 ||
    uploadResult.status >= 300
  ) {
    let message =
      "The screen recording could not be saved.";

    if (uploadResult.body) {
      try {
        const errorBody = JSON.parse(uploadResult.body);

        if (typeof errorBody.message === "string") {
          message = errorBody.message;
        } else if (
          typeof errorBody.title === "string"
        ) {
          message = errorBody.title;
        }
      } catch {
        if (uploadResult.body.trim()) {
          message = uploadResult.body;
        }
      }
    }

    throw new Error(message);
  }
}
export async function createCashSend(
  request: CreateCashSendRequest,
): Promise<CashSendResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/transactions/cash-send`,
    {
      method: "POST",
      headers: await getAuthorizedHeaders(),
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to create cash send.",
      ),
    );
  }

  return response.json();
}

export async function getTransactions(): Promise<
  TransactionResponse[]
> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/transactions`,
    {
      method: "GET",
      headers: await getAuthorizedHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to load transactions.",
      ),
    );
  }

  return response.json();
}
