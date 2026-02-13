"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConnectionLoadingState } from "./hooks/use-connection-loading-state";

interface ConnectionLoadingCardProps {
	loadingState: ConnectionLoadingState;
	onRetry: () => void;
	onBackToLobby: () => void;
}

export function ConnectionLoadingCard({
	loadingState,
	onRetry,
	onBackToLobby,
}: ConnectionLoadingCardProps) {
	const loadingText =
		loadingState === "waiting"
			? "Warte auf Spielstart..."
			: loadingState === "unreachable"
				? "Server nicht erreichbar"
				: "Verbinde...";
	const dotClass =
		loadingState === "waiting"
			? "bg-emerald-500"
			: loadingState === "unreachable"
				? "bg-red-500"
				: "bg-amber-400";

	return (
		<Card className="border-none bg-background/40 text-foreground backdrop-blur-sm">
			<CardContent>
				<div className="flex min-w-64 flex-col gap-4">
					<div className="inline-flex items-center justify-center gap-3">
						<div className={`h-3 w-3 animate-pulse rounded-full ${dotClass}`} />
						<p className="text-foreground">{loadingText}</p>
					</div>

					{loadingState === "unreachable" && (
						<div className="flex items-center gap-2">
							<Button onClick={onRetry} size="sm" variant="secondary">
								Erneut versuchen
							</Button>
							<Button onClick={onBackToLobby} size="sm" variant="outline">
								Zur Lobby
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
