export type AlertSummary = {
  id: string;
  userId: string;
  userSessionId: string;
  customerName: string;
  customerEmail: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type AlertLocation = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  locationSource: string;
  capturedAt: string;
  createdAt: string;
};

export type AlertTransaction = {
  id: string;
  bankAccountId: string;
  beneficiaryId: string | null;

  beneficiaryName: string | null;
  beneficiaryBank: string | null;
  beneficiaryAccountNumber: string | null;
  beneficiaryAccountType: string | null;
  beneficiaryBranchCode: string | null;
  beneficiaryReference: string | null;
  beneficiaryStatus: string | null;
  beneficiaryLastPaidAt: string | null;

  bankReference: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  statusReason: string | null;
  flagged: boolean;
  riskLevel: string;
  riskScore: number;
  description: string;
  secureEscapeCode: string | null;
  createdAt: string;
};

export type AlertAction = {
  id: string;
  adminUserId: string | null;
  adminName: string;
  actionType: string;
  notes: string;
  createdAt: string;
};

export type NotificationAttempt = {
  id: string;
  channel: string;
  destination: string;
  status: string;
  errorMessage: string;
  messageBody: string;
  sentAt: string | null;
  responseMessage: string;
  attemptedAt: string;
  createdAt: string;
};

export type AlertDetail = {
  id: string;
  userId: string;
  userSessionId: string;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  sessionMode: string;
  sessionStatus: string;
  ipAddress: string;
  deviceInfo: string;
  sessionStartedAt: string;
  locations: AlertLocation[];
  transactions: AlertTransaction[];
  actions: AlertAction[];
  notificationAttempts: NotificationAttempt[];
};