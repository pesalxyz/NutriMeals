'use client';

const KEY = 'nutriscan_token';
const COOKIE_KEY = 'nutriscan_token';
const ONE_DAY_SECONDS = 60 * 60 * 24;

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${ONE_DAY_SECONDS}; SameSite=Lax; Secure`;
}

export function getToken() {
  return localStorage.getItem(KEY);
}

export function clearToken() {
  localStorage.removeItem(KEY);
  document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
