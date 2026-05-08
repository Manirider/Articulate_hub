export function setToken(token: string, remember = false) {
  if (typeof window === 'undefined') return;
  try {
    if (remember) {
      localStorage.setItem('acc_token', token);
    } else {
      sessionStorage.setItem('acc_token', token);
    }
  } catch (e) {
    // fallback
    try { localStorage.setItem('acc_token', token); } catch (_) {}
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('acc_token') || localStorage.getItem('acc_token');
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem('acc_token'); } catch (_) {}
  try { localStorage.removeItem('acc_token'); } catch (_) {}
}

export default { setToken, getToken, clearToken };
