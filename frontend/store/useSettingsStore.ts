import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  apiUrl: string;
  sidebarOpen: boolean;
  setApiUrl: (url: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      sidebarOpen: true,

      setApiUrl: (url) => set({ apiUrl: url }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "eagleeye-settings",
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
