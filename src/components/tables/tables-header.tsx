"use client";

import { Minus, Plus, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface TablesHeaderProps {
	isConnected: boolean;
	isPlayerAtAnyTable: boolean;
	isGameStarted: boolean;
	onCreateTable: () => void;
	onLeaveTable: () => void;
}

export function TablesHeader({
	isConnected,
	isPlayerAtAnyTable,
	isGameStarted,
	onCreateTable,
	onLeaveTable,
}: TablesHeaderProps) {
	// Cannot leave if game has started
	const canLeave = isPlayerAtAnyTable && !isGameStarted;
	return (
		<div className="sticky top-0 z-10 shadow-sm bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
			<div className="container mx-auto flex items-center justify-between p-4">
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="cursor-default">
							{isConnected ? (
								<Wifi className="size-5" />
							) : (
								<WifiOff className="size-5 text-red-500" />
							)}
						</div>
					</TooltipTrigger>
					<TooltipContent>
						{isConnected ? "Verbunden" : "Getrennt"}
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							disabled={!isConnected || (isPlayerAtAnyTable && isGameStarted)}
							onClick={canLeave ? onLeaveTable : onCreateTable}
							size="icon"
							variant={canLeave ? "outline" : "default"}
						>
							{canLeave ? <Minus /> : <Plus />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						{isGameStarted
							? "Spiel läuft - Verlassen nicht möglich"
							: canLeave
								? "Tisch verlassen"
								: "Neuen Tisch erstellen"}
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
