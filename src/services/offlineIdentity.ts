const LAST_USER_KEY = "biblioteca-hq-last-user";

export function rememberOfflineUser(userId: string) {
  if (userId) localStorage.setItem(LAST_USER_KEY, userId);
}

export function getRememberedOfflineUser(): string {
  try {
    return localStorage.getItem(LAST_USER_KEY) || "";
  } catch {
    return "";
  }
}

export function forgetOfflineUser() {
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // Storage may be unavailable.
  }
}
