"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

export default function RightSidebar() {
	const { rightSidebarOpen } = useUIStore();

	return (
		<div
			className={cn(
				"fixed inset-y-0 right-0 z-50 h-dvh w-72 overflow-hidden bg-background/50 backdrop-blur-sm transition-transform duration-300 ease-in-out md:static md:z-auto md:w-full md:shrink-0",
				{
					"translate-x-0": rightSidebarOpen,
					"pointer-events-none translate-x-full": !rightSidebarOpen,
				},
			)}
		></div>
	);
}
