import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type BadgeVariant =
	| "re"
	| "kontra"
	| "hochzeit"
	| "solo"
	| "points"
	| "schwarz";
type BadgePosition = "top" | "bottom" | "left" | "right";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
	re: "bg-game-re-background",
	kontra: "bg-game-kontra-background",
	hochzeit: "bg-game-hochzeit-background",
	solo: "bg-game-solo-background",
	points: "bg-game-points-background",
	schwarz: "bg-black",
};

/** Counter-rotation to keep badges upright inside rotated opponent hands */
const POSITION_ROTATION: Record<BadgePosition, string> = {
	top: "rotate-180",
	left: "-rotate-90",
	right: "rotate-90",
	bottom: "",
};

interface AnnouncementBadgeProps {
	variant: BadgeVariant;
	label: string;
	/** Full name shown as tooltip on hover */
	tooltip?: string;
	/** Position of the player hand — used to counter-rotate the badge */
	position?: BadgePosition;
	className?: string;
}

export function AnnouncementBadge({
	variant,
	label,
	tooltip,
	position,
	className,
}: AnnouncementBadgeProps) {
	const badge = (
		<span
			className={cn(
				"flex size-7 select-none items-center justify-center rounded-full font-bold text-base text-white shadow-lg",
				VARIANT_STYLES[variant],
				position && POSITION_ROTATION[position],
				className,
			)}
		>
			{label}
		</span>
	);

	if (!tooltip) return badge;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{badge}</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
