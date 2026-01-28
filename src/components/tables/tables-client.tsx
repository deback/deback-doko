"use client";

import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TablesHeader } from "@/components/tables/tables-header";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Player, Table, TableEvent, TableMessage } from "@/types/tables";

interface TablesClientProps {
	player: Player;
}

export function TablesClient({ player }: TablesClientProps) {
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
			} catch (error) {
				console.error("Error parsing message:", error);
			}
		});

		return () => {
			socket.close();
		};
	}, []);

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

		const event: TableEvent = {
			type: "join-table",
			tableId,
			player,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const leaveTable = (tableId: string) => {
		if (!socketRef.current) return;

		const event: TableEvent = {
			type: "leave-table",
			tableId,
			playerId: player.id,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const deleteTable = (tableId: string) => {
		if (!socketRef.current) return;

		const event: TableEvent = {
			type: "delete-table",
			tableId,
			playerId: player.id,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const isPlayerAtTable = (table: Table) => {
		return table.players.some((p) => p.id === player.id);
	};

	const isTableFull = (table: Table) => {
		return table.players.length >= 4;
	};

	const isPlayerAtAnyTable = tables.some((table) =>
		table.players.some((p) => p.id === player.id),
	);

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
				isPlayerAtAnyTable={isPlayerAtAnyTable}
				onCreateTable={createTable}
			/>

			<div className="container mx-auto space-y-6 p-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{tables.map((table) => {
						const playerAtTable = isPlayerAtTable(table);
						const full = isTableFull(table);

						return (
							<Card
								key={table.id}
								ref={(el) => {
									if (el) tableRefs.current.set(table.id, el);
									else tableRefs.current.delete(table.id);
								}}
							>
								<CardHeader>
									<CardTitle>{table.name}</CardTitle>
									<CardDescription>
										{table.players.length} / 4 Spieler
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<div className="font-medium text-sm">Spieler:</div>
										<ul className="list-inside list-disc space-y-1">
											{table.players.map((p) => (
												<li
													className={`text-sm ${
														p.id === player.id ? "font-bold" : ""
													}`}
													key={p.id}
												>
													{p.name || p.email}
												</li>
											))}
											{Array.from({ length: 4 - table.players.length }).map(
												(_, i) => (
													<li
														className="text-muted-foreground text-sm"
														key={`empty-${table.id}-${i}`}
													>
														(Leer)
													</li>
												),
											)}
										</ul>
									</div>
								</CardContent>
								<CardFooter className="flex gap-2">
									{playerAtTable ? (
										<Button
											className="flex-1"
											onClick={() => leaveTable(table.id)}
											variant="destructive"
										>
											Verlassen
										</Button>
									) : (
										<Button
											className="flex-1"
											disabled={full}
											onClick={() => joinTable(table.id)}
										>
											{full ? "Voll" : "Beitreten"}
										</Button>
									)}
									{playerAtTable && table.players[0]?.id === player.id && (
										<Button
											onClick={() => deleteTable(table.id)}
											variant="destructive"
										>
											Löschen
										</Button>
									)}
								</CardFooter>
							</Card>
						);
					})}
				</div>

				{tables.length === 0 && (
					<Card>
						<CardContent className="pt-6">
							<p className="text-center text-muted-foreground">
								Noch keine Tische vorhanden. Erstelle den ersten Tisch!
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</>
	);
}
