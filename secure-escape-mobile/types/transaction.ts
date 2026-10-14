export type TransactionStatus =
  | "Pending"
  | "Approved"
  | "Blocked"
  | "Delayed"
  | "DecoyApproved"
  | "Failed";

export type TransactionType = "Transfer" | "CashSend";

export type CreateTransferRequest = {
  bankAccountId: string;

  // Existing saved beneficiary payment
  beneficiaryId?: string | null;

  // Once-off bank transfer
  recipientName?: string | null;
  recipientBank?: string | null;
  recipientAccountNumber?: string | null;
  recipientAccountType?: string | null;
  recipientBranchCode?: string | null;

  amount: number;
  description: string;
};

export type CreateCashSendRequest = {
  bankAccountId: string;
  amount: number;
  voucherPin: string;
  description: string;
};

export type TransactionResponse = {
  id: string;
  bankAccountId: string;
  beneficiaryId?: string | null;
  beneficiaryName?: string | null;
  bankReference: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  voucherNumber?: string | null;
  voucherExpiresAt?: string | null;
  voucherRedeemed: boolean;
  status: TransactionStatus;
  statusReason?: string | null;
  description: string;
  secureEscapeCode?: string | null;
  createdAt: string;
};

export type CashSendResponse = {
  transactionId: string;
  bankAccountId: string;
  bankReference: string;
  voucherNumber: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  statusReason?: string | null;
  voucherExpiresAt: string;
  voucherRedeemed: boolean;
  createdAt: string;
};