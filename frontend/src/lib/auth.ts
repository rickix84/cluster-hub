import { create } from 'zustand';

export type AuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
  /** Returns a masked version for display (e.g. "••••••••••••") */
  maskedToken: () => string;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,

  setToken: (token) => set({ token }),

  clearToken: () => set({ token: null }),

  maskedToken: () => {
    const t = get().token;
    if (!t) return '';
    // Show last 4 chars masked, rest as bullets
    if (t.length <= 4) return '••••';
    return '•'.repeat(t.length - 4) + t.slice(-4);
  },
}));
