import type { ReactNode } from "react";
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

/** Two interlocking rings icon for Hochzeit (wedding) */
export function HochzeitIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth={2.8}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Left ring: gap near upper overlap */}
			<path
				d="M13.12 14.8 A5.4 5.4 0 1 1 13.12 9.2"
				transform="rotate(40 8.5 12)"
			/>
			{/* Right ring: gap near lower overlap */}
			<path
				d="M10.88 9.2 A5.4 5.4 0 1 1 10.88 14.8"
				transform="rotate(40 15.5 12)"
			/>
		</svg>
	);
}

interface AnnouncementBadgeProps {
	variant: BadgeVariant;
	label: ReactNode;
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
