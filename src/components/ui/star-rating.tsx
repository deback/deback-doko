import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
	rating: number;
	className?: string;
}

export function StarRating({ rating, className }: StarRatingProps) {
	const stars = [];

	for (let i = 1; i <= 5; i++) {
		if (rating >= i) {
			// Full star
			stars.push(
				<Star
					key={i}
					className="size-5 fill-yellow-600 text-yellow-600"
				/>,
			);
		} else if (rating >= i - 0.5) {
			// Half star - show outline star as background and filled star clipped to half
			stars.push(
				<div key={i} className="relative size-5">
					<Star className="absolute size-5 text-muted-foreground/30 fill-muted-foreground/10" />
					<div className="absolute size-5 overflow-hidden" style={{ clipPath: "inset(0 50% 0 0)" }}>
						<Star className="size-5 fill-yellow-600 text-yellow-600" />
					</div>
				</div>,
			);
		} else {
			// Empty star
			stars.push(
				<Star key={i} className="size-5 text-muted-foreground/30 fill-muted-foreground/10" />,
			);
		}
	}

	return <div className={cn("flex items-center gap-0.5", className)}>{stars}</div>;
}
