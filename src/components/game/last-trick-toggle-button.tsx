"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { FloatingButtonWrapper } from "./floating-button-wrapper";
import { LastTrickIcon } from "./last-trick-icon";

interface LastTrickToggleButtonProps {
	onClick: () => void;
}

export function LastTrickToggleButton({ onClick }: LastTrickToggleButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<FloatingButtonWrapper>
					<Button
						aria-label="Letzten Stich anzeigen"
						onClick={onClick}
						size="icon"
						variant="outline"
					>
						<LastTrickIcon className="size-7" />
					</Button>
				</FloatingButtonWrapper>
			</TooltipTrigger>
			<TooltipContent side="left">Letzten Stich anzeigen</TooltipContent>
		</Tooltip>
	);
}
