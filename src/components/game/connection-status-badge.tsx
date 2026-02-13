"use client";

import { cn } from "@/lib/utils";

interface ConnectionStatusBadgeProps {
	isConnected: boolean;
}

export function ConnectionStatusBadge({
	isConnected,
}: ConnectionStatusBadgeProps) {
	return (
		<div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
			<div
				className={cn(
					"h-2 w-2 rounded-full",
					isConnected ? "bg-emerald-500" : "bg-red-500",
				)}
			/>
			<span className="text-white/70 text-xs">
				{isConnected ? "Verbunden" : "Verbindung verloren"}
			</span>
		</div>
	);
}
