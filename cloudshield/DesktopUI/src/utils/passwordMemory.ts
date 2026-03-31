// passwordMemory.ts
// In-memory password storage for session use only. Not persisted.

let _password: string | null = null;

export function setSessionPassword(pw: string) {
  _password = pw;
}

export function getSessionPassword(): string | null {
  return _password;
}

export function clearSessionPassword() {
  _password = null;
}
