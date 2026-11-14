import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface UiState {
  toasts: Toast[];
  sidebarOpen: boolean;
  toast: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
  setSidebarOpen: (open: boolean) => void;
}

let nextToastId = 1;
const TOAST_MS = 4500;

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  sidebarOpen: false,
  toast: (kind, message) => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message }] }));
    setTimeout(() => get().dismissToast(id), TOAST_MS);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));

export const toast = {
  success: (message: string) => useUiStore.getState().toast('success', message),
  error: (message: string) => useUiStore.getState().toast('error', message),
  info: (message: string) => useUiStore.getState().toast('info', message),
};

/** Turns a thrown service error into words a non-technical user can act on. */
export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
}
