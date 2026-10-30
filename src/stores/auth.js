import { defineStore } from 'pinia';

const TOKEN_KEY = 'hnr_token';
const USER_KEY = 'hnr_user';

const FONT_MAP = {
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  dyslexic: 'OpenDyslexic, comic sans ms, cursive, sans-serif',
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// Only ever set safe CSS strings to :root from server-validated settings.
function applySettingsToDOM(settings) {
  if (!settings) return;
  const root = document.documentElement;
  if (typeof settings.accentColor === 'string' && HEX_RE.test(settings.accentColor.trim())) {
    root.style.setProperty('--color-primary', settings.accentColor.trim());
  }
  const scale = Number(settings.fontScale);
  if (Number.isFinite(scale) && scale >= 0.7 && scale <= 1.8) {
    root.style.setProperty('--font-scale', String(scale));
  }
  if (FONT_MAP[settings.fontFamily]) {
    root.style.setProperty('--font-family', FONT_MAP[settings.fontFamily]);
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    settings: (s) => s.user?.settings || { accentColor: '#FF6600', fontScale: 1, fontFamily: 'system' },
    // Expiry read from the JWT `exp` claim (seconds); null when unavailable.
    expiresAt: (s) => {
      if (!s.token) return null;
      try {
        const b64 = s.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        return payload.exp ? new Date(payload.exp * 1000) : null;
      } catch {
        return null;
      }
    },
  },
  actions: {
    // Validate a stored token against the server before trusting it.
    async restore() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          const u = JSON.parse(raw);
          this.user = u;
          applySettingsToDOM(u.settings);
        } catch {}
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        this.token = token;
        this.user = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        applySettingsToDOM(data.user.settings);
      } catch {
        this.logout();
      }
    },
    async login(username, password) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        applySettingsToDOM(data.user.settings);
        return true;
      } catch (e) {
        this.error = e.message || 'Login failed';
        return false;
      } finally {
        this.loading = false;
      }
    },
    async changePassword(currentPassword, newPassword) {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      return true;
    },
    async saveSettings(newSettings) {
      // Optimistically apply
      if (this.user) {
        this.user.settings = { ...(this.user.settings || {}), ...newSettings };
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
      applySettingsToDOM(this.user?.settings);

      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      if (this.user) {
        this.user.settings = data.settings;
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
      applySettingsToDOM(data.settings);
      return data.settings;
    },
    async logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      applySettingsToDOM({ accentColor: '#FF6600', fontScale: 1, fontFamily: 'system' });
    },
  },
});