// Security & Content Access Control Service for Seung AI Labs

const AUTH_KEY = 'seung_content_auth_v1';
const CONFIG_KEY = 'seung_security_config_v1';

// Fixed Participant Access Code (Case-insensitive)
export const FIXED_AUTH_CODE = 'KOCO2027';
export const FIXED_AUTH_HASH = '4a8e76d21579bfc1856c18bfeeaf2f72b736afa9f90785e5414f2f13116c8744';

// Default config: Locked by default for student participant control!
export const DEFAULT_CONFIG = {
  isLocked: true,
  mode: 'restricted',
  defaultCode: 'koco2027',
  targetHash: FIXED_AUTH_HASH,
  updatedAt: new Date().toISOString()
};

export async function computeSHA256(text) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Crypto API fallback', e);
  }
  return null;
}

export const securityService = {
  getConfig() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          defaultCode: 'koco2027',
          targetHash: FIXED_AUTH_HASH
        };
      }
    } catch (e) {
      console.warn('Failed reading config from storage', e);
    }
    return DEFAULT_CONFIG;
  },

  async syncRemoteConfig() {
    try {
      const res = await fetch('./security-config.json?_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        const currentLocal = localStorage.getItem(CONFIG_KEY);
        if (!currentLocal) {
          const merged = { ...DEFAULT_CONFIG, ...remote, defaultCode: 'koco2027', targetHash: FIXED_AUTH_HASH };
          localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
          return merged;
        } else {
          const localObj = JSON.parse(currentLocal);
          return { ...DEFAULT_CONFIG, ...remote, ...localObj, defaultCode: 'koco2027', targetHash: FIXED_AUTH_HASH };
        }
      }
    } catch (e) {
      // ignore
    }
    return this.getConfig();
  },

  isContentLocked() {
    const cfg = this.getConfig();
    return cfg.isLocked === true;
  },

  isContentAuthed() {
    const s = sessionStorage.getItem(AUTH_KEY);
    const l = localStorage.getItem(AUTH_KEY);
    return s === 'granted' || l === 'granted';
  },

  async verifyContentCode(input) {
    const clean = (input || '').trim().toUpperCase();
    if (!clean) return false;
    return clean === FIXED_AUTH_CODE;
  },

  grantContentAuth() {
    sessionStorage.setItem(AUTH_KEY, 'granted');
    localStorage.setItem(AUTH_KEY, 'granted');
    sessionStorage.setItem('seung_auth_time', Date.now().toString());
  },

  revokeContentAuth() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('seung_auth_time');
    window.dispatchEvent(new Event('seung_content_auth_revoked'));
  },

  async setContentLockMode(locked) {
    const current = this.getConfig();
    const updated = {
      ...current,
      isLocked: Boolean(locked),
      mode: locked ? 'restricted' : 'public',
      defaultCode: 'koco2027',
      targetHash: FIXED_AUTH_HASH,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));

    if (locked) {
      this.revokeContentAuth();
    }

    window.dispatchEvent(new Event('seung_security_config_changed'));
    return updated;
  }
};
