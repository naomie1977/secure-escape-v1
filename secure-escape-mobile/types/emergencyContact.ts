export type AddEmergencyContactRequest = {
  fullName: string;
  phoneNumber: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
  notifyOnDuress: boolean;
};

export type EmergencyContactResponse = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
  notifyOnDuress: boolean;
  createdAt: string;
};