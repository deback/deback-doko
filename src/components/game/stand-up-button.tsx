"use client";

import { ArrowDownToLine, ArrowUpFromLine, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	useGameState,
	useIsStandingUp,
	useToggleStandUp,
} from "@/stores/game-selectors";

interface StandUpButtonProps {
	className?: string;
}

export function StandUpButton({ className }: StandUpButtonProps) {
	const isStandingUp = useIsStandingUp();
	const toggleStandUp = useToggleStandUp();
	const gameState = useGameState();
	const isWaiting = gameState && !gameState.gameStarted;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					aria-label={isStandingUp ? "Platz nehmen" : "Aufstehen"}
					className={cn(className)}
					onClick={() => toggleStandUp()}
					size="icon"
					variant="outline"
				>
					{isStandingUp ? <ArrowDownToLine /> : <ArrowUpFromLine />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{isStandingUp
					? "Am Tisch bleiben (Platz nehmen)"
					: isWaiting
						? "Tisch sofort verlassen"
						: "Nach dieser Runde den Tisch verlassen"}
			</TooltipContent>
		</Tooltip>
	);
}
