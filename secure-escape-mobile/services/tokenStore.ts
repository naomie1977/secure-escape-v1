import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "secure_escape_auth_token";
const SESSION_MODE_KEY = "secure_escape_session_mode";
const USER_SESSION_ID_KEY = "secure_escape_user_session_id";
const USER_ID_KEY = "secure_escape_user_id";
const LAST_ACTIVITY_KEY = "secure_escape_last_activity";
const LAST_LOGIN_EMAIL_KEY = "secure_escape_last_login_email";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function setAuthToken(token: string) {
  await setItem(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken() {
  return getItem(AUTH_TOKEN_KEY);
}

export async function setSessionMode(sessionMode: string) {
  await setItem(SESSION_MODE_KEY, sessionMode);
}

export async function getSessionMode() {
  return getItem(SESSION_MODE_KEY);
}

export async function setUserSessionId(userSessionId: string) {
  await setItem(USER_SESSION_ID_KEY, userSessionId);
}

export async function getUserSessionId() {
  return getItem(USER_SESSION_ID_KEY);
}

export async function setUserId(userId: string) {
  await setItem(USER_ID_KEY, userId);
}

export async function getUserId() {
  return getItem(USER_ID_KEY);
}

export async function setLastLoginEmail(email: string) {
  await setItem(LAST_LOGIN_EMAIL_KEY, email.trim());
}

export async function getLastLoginEmail() {
  return getItem(LAST_LOGIN_EMAIL_KEY);
}

export async function saveAuthSession(params: {
  token: string;
  sessionMode: string;
  userSessionId: string;
  userId: string;
}) {
  await Promise.all([
    setAuthToken(params.token),
    setSessionMode(params.sessionMode),
    setUserSessionId(params.userSessionId),
    setUserId(params.userId),
    setLastActivityNow(),
  ]);
}

export async function clearAuthToken() {
  await Promise.all([
    deleteItem(AUTH_TOKEN_KEY),
    deleteItem(SESSION_MODE_KEY),
    deleteItem(USER_SESSION_ID_KEY),
    deleteItem(USER_ID_KEY),
    deleteItem(LAST_ACTIVITY_KEY),
  ]);
}

export async function setLastActivityNow() {
  await setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export async function getLastActivity() {
  const value = await getItem(LAST_ACTIVITY_KEY);
  return value ? Number(value) : null;
}

export async function isSessionExpired() {
  const lastActivity = await getLastActivity();

  if (!lastActivity) {
    return true;
  }

  // Keep the session alive for 5 minutes after the last recorded activity.
  const inActivityBoundary = 5 * 60 * 1000;
  return Date.now() - lastActivity > inActivityBoundary;
}
