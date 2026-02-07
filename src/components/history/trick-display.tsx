import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { GamePlayerResult, StoredTrick } from "@/types/game-history";

interface TrickDisplayProps {
	trick: StoredTrick;
	trickNumber: number;
	players: GamePlayerResult[];
}

export function TrickDisplay({
	trick,
	trickNumber,
	players,
}: TrickDisplayProps) {
	const playerMap = new Map(players.map((p) => [p.userId, p]));

	return (
		<div className="rounded-lg bg-card p-3">
			<div className="mb-2 flex items-center justify-between">
				<span className="font-semibold text-sm">Stich {trickNumber}</span>
				<span className="text-muted-foreground text-xs">
					{trick.points} Pkt.
				</span>
			</div>
			<div className="grid grid-cols-4 gap-2">
				{trick.cards.map((entry) => {
					const player = playerMap.get(entry.playerId);
					const isWinner = entry.playerId === trick.winnerId;
					return (
						<div
							className={cn(
								"flex flex-col items-center gap-1 rounded-md p-1",
								isWinner && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
							)}
							key={entry.card.id}
						>
							<CardImage rank={entry.card.rank} suit={entry.card.suit} />
							<span
								className={cn(
									"truncate text-center text-xs w-full",
									isWinner
										? "font-semibold text-emerald-600"
										: "text-muted-foreground",
								)}
							>
								{player?.userName ?? "?"}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
