"use client";

import { ArrowDownToLine, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useIsStandingUp, useToggleStandUp } from "@/stores/game-selectors";

interface StandUpButtonProps {
	className?: string;
}

export function StandUpButton({ className }: StandUpButtonProps) {
	const isStandingUp = useIsStandingUp();
	const toggleStandUp = useToggleStandUp();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(className)}
					onClick={() => toggleStandUp()}
					size="sm"
					variant={isStandingUp ? "destructive" : "outline"}
				>
					{isStandingUp ? (
						<>
							<ArrowDownToLine className="size-4" />
							<span className="hidden sm:inline">Platz nehmen</span>
						</>
					) : (
						<>
							<LogOut className="size-4" />
							<span className="hidden sm:inline">Aufstehen</span>
						</>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{isStandingUp
					? "Am Tisch bleiben (Platz nehmen)"
					: "Nach dieser Runde den Tisch verlassen"}
			</TooltipContent>
		</Tooltip>
	);
}
