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
					className="size-4 fill-yellow-500 text-yellow-500"
				/>,
			);
		} else if (rating >= i - 0.5) {
			// Half star
			stars.push(
				<StarHalf
					key={i}
					className="size-4 fill-yellow-500 text-yellow-500"
				/>,
			);
		} else {
			// Empty star
			stars.push(
				<Star key={i} className="size-4 text-muted-foreground/30" />,
			);
		}
	}

	return <div className={cn("flex items-center gap-0.5", className)}>{stars}</div>;
}
