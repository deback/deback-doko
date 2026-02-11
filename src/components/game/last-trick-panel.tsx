"use client";

import { X } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trick } from "@/types/game";
import type { Player } from "@/types/tables";

interface LastTrickPanelProps {
	trick: Trick;
	trickNumber: number;
	players: Player[];
	perspectivePlayerId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type RelativePosition = "bottom" | "left" | "top" | "right";

const POSITION_ORDER: RelativePosition[] = ["bottom", "left", "top", "right"];

const CARD_TRANSFORMS: Record<
	RelativePosition,
	{ x: number; y: number; rotate: number; z: number }
> = {
	bottom: { x: 0, y: 28, rotate: 0, z: 30 },
	left: { x: -28, y: 0, rotate: -90, z: 20 },
	top: { x: 0, y: -28, rotate: 0, z: 10 },
	right: { x: 28, y: 0, rotate: 90, z: 20 },
};

const LABEL_TRANSFORMS: Record<RelativePosition, { x: number; y: number }> = {
	bottom: { x: 0, y: 90 },
	left: { x: -92, y: 0 },
	top: { x: 0, y: -90 },
	right: { x: 92, y: 0 },
};

export function LastTrickPanel({
	trick,
	trickNumber,
	players,
	perspectivePlayerId,
	open,
	onOpenChange,
}: LastTrickPanelProps) {
	if (!open) return null;

	const playerMap = new Map(players.map((player) => [player.id, player.name]));
	const perspectiveIndex = Math.max(
		0,
		players.findIndex((player) => player.id === perspectivePlayerId),
	);

	const cardsByPosition = new Map<
		RelativePosition,
		(typeof trick.cards)[number] | undefined
	>();
	for (const entry of trick.cards) {
		const playerIndex = players.findIndex(
			(player) => player.id === entry.playerId,
		);
		if (playerIndex < 0) continue;
		const relative =
			(playerIndex - perspectiveIndex + players.length) % players.length;
		const position = POSITION_ORDER[relative];
		if (!position) continue;
		cardsByPosition.set(position, entry);
	}

	return (
		<div className="w-[min(92vw,22rem)] rounded-xl border border-white/15 bg-black/60 p-3 text-white shadow-xl backdrop-blur-md">
			<div className="mb-3 flex items-center justify-between">
				<div>
					<p className="font-semibold text-sm">
						Letzter Stich (Stich {trickNumber})
					</p>
					<p className="text-white/70 text-xs">{trick.points ?? 0} Punkte</p>
				</div>
				<Button
					className="h-7 w-7 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
					onClick={() => onOpenChange(false)}
					size="icon"
					variant="ghost"
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Letzten Stich schließen</span>
				</Button>
			</div>

			<div className="relative h-52 rounded-lg border border-white/10 bg-black/20">
				{POSITION_ORDER.map((position) => {
					const entry = cardsByPosition.get(position);
					if (!entry) return null;

					const isWinner = trick.winnerId === entry.playerId;
					const cardTransform = CARD_TRANSFORMS[position];
					const labelTransform = LABEL_TRANSFORMS[position];

					return (
						<div className="absolute top-1/2 left-1/2" key={entry.card.id}>
							<div
								className={cn(
									"w-32 rounded-md border p-1 shadow-lg",
									isWinner
										? "border-emerald-400/70 bg-emerald-500/20 ring-1 ring-emerald-300/60"
										: "border-white/15 bg-white/5",
								)}
								style={{
									transform: `translate(-50%, -50%) translate(${cardTransform.x}px, ${cardTransform.y}px) rotate(${cardTransform.rotate}deg)`,
									zIndex: cardTransform.z,
								}}
							>
								<CardImage rank={entry.card.rank} suit={entry.card.suit} />
							</div>
							<p
								className={cn(
									"absolute w-24 -translate-x-1/2 truncate text-center text-xs",
									isWinner ? "font-semibold text-emerald-300" : "text-white/70",
								)}
								style={{
									transform: `translate(${labelTransform.x}px, ${labelTransform.y}px)`,
								}}
							>
								{playerMap.get(entry.playerId) ?? "Unbekannt"}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
}
