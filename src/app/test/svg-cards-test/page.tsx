"use client";

import { useState } from "react";
import { CardImage } from "@/components/cards";
import { ALL_FULL_RANKS, ALL_SUITS } from "@/lib/card-config";
import type { CardRenderMode } from "@/types/game";

export default function SvgCardsTestPage() {
	const [renderMode, setRenderMode] = useState<CardRenderMode>("svg");
	const [selectedCard, setSelectedCard] = useState<string | null>(null);

	return (
		<div className="p-4">
			<div className="mx-auto max-w-7xl">
				<h1 className="mb-4 font-bold text-3xl">SVG Karten Test</h1>

				{/* Render Mode Toggle */}
				<div className="mb-8 flex gap-4">
					<button
						className={`rounded px-4 py-2 ${
							renderMode === "svg" ? "bg-blue-600 text-white" : "bg-white"
						}`}
						onClick={() => setRenderMode("svg")}
						type="button"
					>
						SVG Rendering
					</button>
					<button
						className={`rounded px-4 py-2 ${
							renderMode === "text" ? "bg-blue-600 text-white" : "bg-white"
						}`}
						onClick={() => setRenderMode("text")}
						type="button"
					>
						Text Rendering
					</button>
				</div>

				{/* Kartenrücken */}
				<section className="mb-12">
					<h2 className="mb-4 font-semibold text-xl">Kartenrücken</h2>
					<div className="flex gap-4">
						<div className="w-24">
							<CardImage backDesign="blue" renderMode={renderMode} showBack />
							<p className="mt-2 text-center text-sm">Standard</p>
						</div>
						<div className="w-24">
							<CardImage
								backDesign="pattern"
								renderMode={renderMode}
								showBack
							/>
							<p className="mt-2 text-center text-sm">Alternativ</p>
						</div>
					</div>
				</section>

				{/* Joker */}
				<section className="mb-12">
					<h2 className="mb-4 font-semibold text-xl">Joker</h2>
					<div className="flex gap-4">
						<div className="w-24">
							<CardImage joker="red" renderMode={renderMode} />
							<p className="mt-2 text-center text-sm">Rot</p>
						</div>
						<div className="w-24">
							<CardImage joker="black" renderMode={renderMode} />
							<p className="mt-2 text-center text-sm">Schwarz</p>
						</div>
					</div>
				</section>

				{/* Alle Karten nach Farbe */}
				{ALL_SUITS.map((suit) => (
					<section className="mb-12" key={suit}>
						<h2 className="mb-4 font-semibold text-xl capitalize">
							{suit === "hearts" && "Herz"}
							{suit === "diamonds" && "Karo"}
							{suit === "clubs" && "Kreuz"}
							{suit === "spades" && "Pik"}
						</h2>
						<div className="grid grid-cols-7 gap-2 sm:grid-cols-9 md:grid-cols-13 lg:gap-4">
							{ALL_FULL_RANKS.map((rank) => {
								const cardId = `${suit}_${rank}`;
								return (
									<div className="w-full" key={cardId}>
										<CardImage
											onClick={() =>
												setSelectedCard(selectedCard === cardId ? null : cardId)
											}
											rank={rank}
											renderMode={renderMode}
											selected={selectedCard === cardId}
											suit={suit}
										/>
									</div>
								);
							})}
						</div>
					</section>
				))}

				{/* Interaktive Zustände Demo */}
				<section className="mb-12">
					<h2 className="mb-4 font-semibold text-xl">Interaktive Zustände</h2>
					<div className="flex flex-wrap gap-4">
						<div className="w-24">
							<CardImage rank="ace" renderMode={renderMode} suit="hearts" />
							<p className="mt-2 text-center text-sm">Normal</p>
						</div>
						<div className="w-24">
							<CardImage
								playable
								rank="king"
								renderMode={renderMode}
								suit="hearts"
							/>
							<p className="mt-2 text-center text-sm">Spielbar</p>
						</div>
						<div className="w-24">
							<CardImage
								rank="queen"
								renderMode={renderMode}
								selected
								suit="hearts"
							/>
							<p className="mt-2 text-center text-sm">Ausgewählt</p>
						</div>
						<div className="w-24">
							<CardImage
								disabled
								rank="jack"
								renderMode={renderMode}
								suit="hearts"
							/>
							<p className="mt-2 text-center text-sm">Deaktiviert</p>
						</div>
					</div>
				</section>

				{/* Lizenz-Hinweis */}
				<footer className="mt-16 border-t pt-4 text-slate-500 text-sm">
					<p>
						Karten-Grafiken:{" "}
						<a
							className="text-blue-600 hover:underline"
							href="https://github.com/htdebeer/SVG-cards"
							rel="noopener noreferrer"
							target="_blank"
						>
							SVG-cards von htdebeer
						</a>{" "}
						(LGPL-2.1 Lizenz)
					</p>
				</footer>
			</div>
		</div>
	);
}
