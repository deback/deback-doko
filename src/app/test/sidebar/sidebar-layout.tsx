"use client";

import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import Hand from "../game/hand";
import RightSidebar from "./right-sidebar";
import SidebarToggleButton from "./sidebar-toggle-button";

export default function SidebarLayout() {
	const { rightSidebarOpen, setRightSidebarOpen } = useUIStore();

	return (
		<div
			className={cn(
				"relative flex h-dvh w-full overflow-hidden md:grid md:grid-rows-1 md:transition-[grid-template-columns] md:duration-300 md:ease-in-out",
				rightSidebarOpen
					? "md:grid-cols-[minmax(0,1fr)_18rem]"
					: "md:grid-cols-[minmax(0,1fr)_0rem]",
			)}
		>
			<button
				aria-label="Close sidebar overlay"
				className={cn(
					"fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-in-out md:hidden",
					{
						"pointer-events-auto opacity-100": rightSidebarOpen,
						"pointer-events-none opacity-0": !rightSidebarOpen,
					},
				)}
				onClick={() => setRightSidebarOpen(false)}
				type="button"
			/>
			<main className="relative h-dvh min-h-0 min-w-0 flex-1 md:h-full">
				<div className="fixed top-2 right-2 z-60">
					<SidebarToggleButton />
				</div>
				<div className="h-dvh min-h-0 w-full">content</div>
			</main>
			<RightSidebar />
		</div>
	);
}
