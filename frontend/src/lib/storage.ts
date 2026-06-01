import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

export async function getStoredToken(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }
  return localStorage.getItem('token');
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (token) {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    } else {
      await Preferences.remove({ key: TOKEN_KEY });
    }
    return;
  }
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function getStoredUsername(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: USERNAME_KEY });
    return value;
  }
  return localStorage.getItem(USERNAME_KEY);
}

export async function setStoredUsername(username: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (username) {
      await Preferences.set({ key: USERNAME_KEY, value: username });
    } else {
      await Preferences.remove({ key: USERNAME_KEY });
    }
    return;
  }
  if (username) {
    localStorage.setItem(USERNAME_KEY, username);
  } else {
    localStorage.removeItem(USERNAME_KEY);
  }
}
