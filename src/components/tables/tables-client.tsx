"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TablesHeader } from "@/components/tables/tables-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { onProfileUpdate } from "@/lib/profile-sync";
import {
	calculateAverageRating,
	calculateRating,
	cn,
	formatBalance,
} from "@/lib/utils";
import type { Player, Table, TableEvent, TableMessage } from "@/types/tables";
import { InfoBox } from "../ui/info-box";

interface TablesClientProps {
	player: Player;
}

export function TablesClient({ player }: TablesClientProps) {
	const router = useRouter();
	const [tables, setTables] = useState<Table[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [lastCreatedTableId, setLastCreatedTableId] = useState<string | null>(
		null,
	);
	const socketRef = useRef<PartySocket | null>(null);
	const pendingTableName = useRef<string | null>(null);
	const tableRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const getNextTableName = () => {
		const existingNumbers = tables
			.map((t) => {
				const match = t.name.match(/^Tisch (\d+)$/);
				const numberStr = match?.[1];
				return numberStr ? Number.parseInt(numberStr, 10) : 0;
			})
			.filter((n) => n > 0);
		const nextNumber =
			existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
		return `Tisch ${nextNumber}`;
	};

	useEffect(() => {
		// Determine Partykit host
		const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

		const socket = new PartySocket({
			host,
			room: "tables-room",
		});

		socketRef.current = socket;

		socket.addEventListener("open", () => {
			setIsConnected(true);
			// Request current state
			socket.send(JSON.stringify({ type: "get-state" } satisfies TableEvent));
		});

		socket.addEventListener("close", () => {
			setIsConnected(false);
		});

		socket.addEventListener("message", (event) => {
			try {
				const message: TableMessage = JSON.parse(event.data as string);

				if (message.type === "state") {
					setTables(message.state.tables);

					// Check if we just created a table and scroll to it
					if (pendingTableName.current) {
						const createdTable = message.state.tables.find(
							(t) => t.name === pendingTableName.current,
						);
						if (createdTable) {
							setLastCreatedTableId(createdTable.id);
							pendingTableName.current = null;
						}
					}
				} else if (message.type === "error") {
					toast.error(message.message);
					console.error("Error from server:", message.message);
				} else if (message.type === "game-started") {
					// Only redirect if current player is part of the game
					const isPlayerInGame = message.players.some(
						(p) => p.id === player.id,
					);
					if (isPlayerInGame) {
						// Store game info in sessionStorage for game client
						sessionStorage.setItem(
							`game-${message.gameId}`,
							JSON.stringify({
								players: message.players,
								tableId: message.tableId,
							}),
						);
						// Redirect to game page
						window.location.href = `/game/${message.gameId}`;
					}
				}
			} catch (error) {
				console.error("Error parsing message:", error);
			}
		});

		const cleanupProfileSync = onProfileUpdate((update) => {
			const event: TableEvent = {
				type: "update-player-info",
				playerId: update.playerId,
				name: update.name,
				image: update.image,
			};
			socket.send(JSON.stringify(event));
		});

		return () => {
			socket.close();
			cleanupProfileSync();
		};
	}, [player.id]);

	const createTable = () => {
		if (!socketRef.current) return;

		const tableName = getNextTableName();
		pendingTableName.current = tableName;

		const event: TableEvent = {
			type: "create-table",
			name: tableName,
			player,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const joinTable = (tableId: string) => {
		if (!socketRef.current) return;

		if (isPlayerAtAnyTable) {
			toast.error(
				"Du sitzt bereits an einem Tisch. Verlasse zuerst den anderen Tisch.",
			);
			return;
		}

		const event: TableEvent = {
			type: "join-table",
			tableId,
			player,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const leaveCurrentTable = () => {
		if (!socketRef.current) return;

		const currentTable = tables.find((t) =>
			t.players.some((p) => p.id === player.id),
		);
		if (!currentTable) return;

		const event: TableEvent = {
			type: "leave-table",
			tableId: currentTable.id,
			playerId: player.id,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const currentPlayerTable = tables.find((table) =>
		table.players.some((p) => p.id === player.id),
	);
	const isPlayerAtAnyTable = !!currentPlayerTable;
	const isGameRunning =
		(currentPlayerTable?.gameStarted &&
			currentPlayerTable.players.length >= 4) ??
		false;

	const canJoinTable = (table: Table) => {
		const isAtThisTable = table.players.some((p) => p.id === player.id);
		const isFull = table.players.length >= 4;
		return !isAtThisTable && !isFull && !isPlayerAtAnyTable;
	};

	const canSpectateTable = (table: Table) => {
		// Only allow spectating if game started with 4 players AND user is NOT a player at this table
		const isPlayerAtThisTable = table.players.some((p) => p.id === player.id);
		return (
			table.gameStarted &&
			table.gameId &&
			table.players.length >= 4 &&
			!isPlayerAtThisTable
		);
	};

	const spectateGame = (table: Table) => {
		if (table.gameId) {
			router.push(`/game/${table.gameId}?spectate=true`);
		}
	};

	// Scroll to newly created table
	useEffect(() => {
		if (lastCreatedTableId) {
			const element = tableRefs.current.get(lastCreatedTableId);
			element?.scrollIntoView({ behavior: "smooth", block: "center" });
			setLastCreatedTableId(null);
		}
	}, [lastCreatedTableId]);

	return (
		<>
			<TablesHeader
				isConnected={isConnected}
				isGameStarted={isGameRunning}
				isPlayerAtAnyTable={isPlayerAtAnyTable}
				onCreateTable={createTable}
				onLeaveTable={leaveCurrentTable}
			/>

			<div className="container mx-auto space-y-6 p-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{tables.map((table) => {
						const joinable = canJoinTable(table);
						const isMyTable = table.players.some((p) => p.id === player.id);
						const canSpectate = canSpectateTable(table);
						const canRejoinGame =
							isMyTable && table.gameStarted && table.gameId;
						const canGoToGame = isMyTable && table.gameId;
						const isClickable =
							joinable || canSpectate || canRejoinGame || canGoToGame;

						const handleTableClick = () => {
							if ((canRejoinGame || canGoToGame) && table.gameId) {
								// Player is at this table — go to game
								router.push(`/game/${table.gameId}`);
							} else if (canSpectate) {
								// Spectate game (won't happen since canSpectate excludes own tables)
								spectateGame(table);
							} else if (joinable) {
								// Join the table
								joinTable(table.id);
							}
						};

						return (
							<Card
								className={cn(
									"pt-4",
									isClickable &&
										"cursor-pointer transition-colors hover:border-primary",
									!isClickable && "cursor-not-allowed opacity-50",
									canSpectate && "border-amber-500/50",
									canRejoinGame && "border-emerald-500/50",
								)}
								key={table.id}
								onClick={handleTableClick}
								ref={(el) => {
									if (el) tableRefs.current.set(table.id, el);
									else tableRefs.current.delete(table.id);
								}}
							>
								<CardHeader className="border-b px-4 [.border-b]:pb-1">
									<div className="flex items-center justify-between gap-2">
										<div>
											<div className="flex items-center gap-2">
												<CardTitle>{table.name}</CardTitle>
												{table.gameStarted && (
													<Badge
														className="bg-amber-500/20 text-amber-700 dark:text-amber-400"
														variant="secondary"
													>
														Live
													</Badge>
												)}
											</div>
											<p className="text-muted-foreground text-sm">
												{table.gameStarted && table.players.length >= 4
													? "Spiel läuft"
													: `${table.players.length} / 4 Spieler`}
											</p>
										</div>
										{table.players.length > 0 && (
											<StarRating
												className="mb-1 shrink-0"
												rating={calculateAverageRating(table.players)}
											/>
										)}
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{table.players.map((p) => (
											<div className="flex items-center gap-3" key={p.id}>
												<Avatar
													alt={p.name || "Spieler"}
													fallback={(p.name || p.email || "?")
														.charAt(0)
														.toUpperCase()}
													size="sm"
													src={p.image}
												/>
												<div className="min-w-0 flex-1">
													<p
														className={`truncate text-sm ${
															p.id === player.id ? "font-bold" : ""
														}`}
													>
														{p.name || p.email}
													</p>
													<p className="text-muted-foreground text-xs">
														{formatBalance(p.balance)}
													</p>
												</div>
												<StarRating
													className="shrink-0"
													rating={calculateRating(p.gamesPlayed, p.gamesWon)}
													size="sm"
												/>
											</div>
										))}
										{table.players.length < 4 &&
											Array.from({ length: 4 - table.players.length }).map(
												(_, i) => (
													<div
														className="flex items-center gap-3"
														key={`empty-${table.id}-${i}`}
													>
														<div className="size-8 rounded-full border-2 border-muted-foreground/30 border-dashed" />
														<span className="text-muted-foreground text-sm">
															(Frei)
														</span>
													</div>
												),
											)}
										{canSpectate && (
											<Button
												className="mt-2 w-full"
												onClick={(e) => {
													e.stopPropagation();
													spectateGame(table);
												}}
												variant="outline"
											>
												<Eye className="mr-2 h-4 w-4" />
												Zuschauen
												{table.spectatorCount
													? ` (${table.spectatorCount})`
													: ""}
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>

				{tables.length === 0 && (
					<InfoBox variant="info">
						Noch keine Tische vorhanden. Erstelle den ersten Tisch!
					</InfoBox>
				)}
			</div>
		</>
	);
}
