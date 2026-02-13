/**
 * UI Store - Client-seitiger UI-Zustand (z. B. Sidebars)
 */

import { create } from "zustand";

export interface UIStoreState {
	/** Rechte Sidebar (z. B. Test-Seite) geöffnet */
	rightSidebarOpen: boolean;
	setRightSidebarOpen: (open: boolean) => void;
	toggleRightSidebar: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
	rightSidebarOpen: false,
	setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
	toggleRightSidebar: () =>
		set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
}));
