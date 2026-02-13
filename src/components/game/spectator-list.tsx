"use client";

import { Avatar } from "@/components/ui/avatar";
import type { GameState } from "@/types/game";

interface SpectatorListProps {
	spectators: GameState["spectators"];
}

export function SpectatorList({ spectators }: SpectatorListProps) {
	if (spectators.length === 0) return null;

	return (
		<div className="flex max-h-[30vh] max-w-[min(30vw,20rem)] flex-col overflow-hidden rounded-lg bg-black/40 backdrop-blur-sm">
			<div className="flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-white/50 text-xs">
				Zuschauer
			</div>
			<div className="flex min-h-0 flex-col gap-1 overflow-y-auto px-2 pb-2">
				{spectators.map((spectator) => (
					<div className="flex items-center gap-2" key={spectator.id}>
						<Avatar
							alt={spectator.name}
							fallback={spectator.name.charAt(0).toUpperCase()}
							size="xs"
							src={spectator.image}
						/>
						<span className="truncate text-white/70 text-xs">
							{spectator.name}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
