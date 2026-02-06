"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TurnIndicatorProps {
	currentPlayerName: string;
	isMyTurn: boolean;
}

export function TurnIndicator({
	currentPlayerName,
	isMyTurn,
}: TurnIndicatorProps) {
	const [showInfo, setShowInfo] = useState(false);

	return (
		<div className="fixed top-4 left-4 z-20">
			<button
				className={cn(
					"flex items-center gap-2 rounded-full px-2 py-1.5 backdrop-blur-sm transition-all",
					showInfo ? "bg-black/60 pr-4" : "bg-black/40 hover:bg-black/50",
				)}
				onClick={() => setShowInfo(!showInfo)}
				type="button"
			>
				<Info className="h-4 w-4 text-white/70" />
				{showInfo && (
					<span className="text-white/80 text-sm">
						{isMyTurn ? "Du bist am Zug" : `${currentPlayerName} ist am Zug`}
					</span>
				)}
			</button>
		</div>
	);
}
