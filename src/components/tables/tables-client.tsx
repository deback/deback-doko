"use client";

import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Player, Table, TableEvent, TableMessage } from "@/types/tables";

interface TablesClientProps {
	player: Player;
}

export function TablesClient({ player }: TablesClientProps) {
	const [tables, setTables] = useState<Table[]>([]);
	const [newTableName, setNewTableName] = useState("");
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const socketRef = useRef<PartySocket | null>(null);

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
					setError(null); // Clear error on successful state update
				} else if (message.type === "error") {
					setError(message.message);
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
		if (!newTableName.trim() || !socketRef.current) return;

		const event: TableEvent = {
			type: "create-table",
			name: newTableName.trim(),
			player,
		};

		socketRef.current.send(JSON.stringify(event));
		setNewTableName("");
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

	return (
		<div className="container mx-auto space-y-6 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div
						className={`h-3 w-3 rounded-full ${
							isConnected ? "bg-emerald-500" : "bg-red-500"
						}`}
					/>
					<span className="text-muted-foreground text-sm">
						{isConnected ? "Verbunden" : "Getrennt"}
					</span>
				</div>
			</div>

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-center text-destructive">{error}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Neuen Tisch erstellen</CardTitle>
					<CardDescription>
						Erstelle einen neuen Tisch für ein Doppelkopf-Spiel
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							onChange={(e) => setNewTableName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									createTable();
								}
							}}
							placeholder="Tischname..."
							value={newTableName}
						/>
						<Button disabled={!newTableName.trim()} onClick={createTable}>
							Erstellen
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{tables.map((table) => {
					const playerAtTable = isPlayerAtTable(table);
					const full = isTableFull(table);

					return (
						<Card key={table.id}>
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
	);
}
