// Zustand global store — auth, UI state, realtime presence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  avatarBlurhash: string | null;
  accountType: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
  focusModeEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface AuthSlice {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

interface UISlice {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  composeOpen: boolean;
  activeModal: string | null;
  focusMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarOpen: (open: boolean) => void;
  setComposeOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  toggleFocusMode: () => void;
}

interface RealtimeSlice {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  unreadNotifications: number;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  setOnlineStatus: (userId: string, online: boolean) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

type NexusStore = AuthSlice & UISlice & RealtimeSlice;

export const useStore = create<NexusStore>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      clearAuth: () => {
        get().disconnectSocket();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // ── UI ────────────────────────────────────────────────────────────────
      theme: 'system',
      sidebarOpen: true,
      composeOpen: false,
      activeModal: null,
      focusMode: false,

      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setComposeOpen: (open) => set({ composeOpen: open }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

      // ── Realtime ──────────────────────────────────────────────────────────
      socket: null,
      isConnected: false,
      onlineUsers: new Set(),
      unreadNotifications: 0,

      connectSocket: (token) => {
        const existing = get().socket;
        if (existing?.connected) return;

        const socket = io(API_BASE, {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          set({ isConnected: true });
        });

        socket.on('disconnect', () => {
          set({ isConnected: false });
        });

        socket.on('presence', ({ userId, status }: { userId: string; status: string }) => {
          set((state) => {
            const next = new Set(state.onlineUsers);
            if (status === 'online') next.add(userId);
            else next.delete(userId);
            return { onlineUsers: next };
          });
        });

        socket.on('notification', () => {
          set((state) => ({ unreadNotifications: state.unreadNotifications + 1 }));
        });

        set({ socket });
      },

      disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({ socket: null, isConnected: false });
        }
      },

      setOnlineStatus: (userId, online) => {
        set((state) => {
          const next = new Set(state.onlineUsers);
          if (online) next.add(userId);
          else next.delete(userId);
          return { onlineUsers: next };
        });
      },

      incrementNotifications: () =>
        set((state) => ({ unreadNotifications: state.unreadNotifications + 1 })),

      clearNotifications: () => set({ unreadNotifications: 0 }),
    }),
    {
      name: 'nexus-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        focusMode: state.focusMode,
      }),
    },
  ),
);

// Selector hooks for performance (avoid re-renders)
export const useUser = () => useStore((s) => s.user);
export const useAuth = () => useStore((s) => ({ user: s.user, token: s.accessToken, isAuthenticated: s.isAuthenticated }));
export const useTheme = () => useStore((s) => s.theme);
export const useFocusMode = () => useStore((s) => s.focusMode);
export const useSocket = () => useStore((s) => s.socket);
export const useUnreadNotifications = () => useStore((s) => s.unreadNotifications);
