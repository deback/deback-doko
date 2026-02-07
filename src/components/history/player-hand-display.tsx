import { CardImage } from "@/components/cards/card-image";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import type { GamePlayerResult } from "@/types/game-history";

interface PlayerHandDisplayProps {
	player: GamePlayerResult;
	cards: Card[];
	isCurrentUser?: boolean;
}

export function PlayerHandDisplay({
	player,
	cards,
	isCurrentUser,
}: PlayerHandDisplayProps) {
	return (
		<div
			className={cn(
				"rounded-lg p-3",
				player.team === "re" ? "bg-blue-500/5" : "bg-red-500/5",
			)}
		>
			<div className="mb-2 flex items-center gap-2">
				<Avatar
					alt={player.userName}
					fallback={player.userName.charAt(0).toUpperCase()}
					size="xs"
					src={player.userImage}
				/>
				<span
					className={cn("font-medium text-sm", isCurrentUser && "text-primary")}
				>
					{player.userName}
					{isCurrentUser && " (Du)"}
				</span>
				<span
					className={cn(
						"rounded-full px-1.5 py-0.5 text-xs",
						player.team === "re"
							? "bg-blue-500/10 text-blue-600"
							: "bg-red-500/10 text-red-600",
					)}
				>
					{player.team === "re" ? "Re" : "Kontra"}
				</span>
			</div>
			<div className="grid grid-cols-6 gap-1">
				{cards.map((card) => (
					<CardImage key={card.id} rank={card.rank} suit={card.suit} />
				))}
			</div>
		</div>
	);
}
