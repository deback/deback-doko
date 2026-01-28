"use client";

import { Plus, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface TablesHeaderProps {
	isConnected: boolean;
	isPlayerAtAnyTable: boolean;
	onCreateTable: () => void;
}

export function TablesHeader({
	isConnected,
	isPlayerAtAnyTable,
	onCreateTable,
}: TablesHeaderProps) {
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

				{!isPlayerAtAnyTable && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								disabled={!isConnected}
								onClick={onCreateTable}
								size="icon"
								variant="outline"
							>
								<Plus />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Neuen Tisch erstellen</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
}
