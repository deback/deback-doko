"use client";

import { useState } from "react";
import { CardImage } from "@/components/cards";
import { ALL_FULL_RANKS, ALL_SUITS } from "@/lib/card-config";

export default function SvgCardsTestPage() {
	const [selectedCard, setSelectedCard] = useState<string | null>(null);

	return (
		<div className="p-4">
			<div className="mx-auto max-w-7xl">
				<h1 className="mb-4 font-bold text-3xl">SVG Karten Test</h1>

				{/* Kartenrücken */}
				<section className="mb-12">
					<h2 className="mb-4 font-semibold text-xl">Kartenrücken</h2>
					<div className="flex gap-4">
						<div className="w-24">
							<CardImage backDesign="blue" showBack />
							<p className="mt-2 text-center text-sm">Standard</p>
						</div>
						<div className="w-24">
							<CardImage backDesign="pattern" showBack />
							<p className="mt-2 text-center text-sm">Alternativ</p>
						</div>
					</div>
				</section>

				{/* Joker */}
				<section className="mb-12">
					<h2 className="mb-4 font-semibold text-xl">Joker</h2>
					<div className="flex gap-4">
						<div className="w-24">
							<CardImage joker="red" />
							<p className="mt-2 text-center text-sm">Rot</p>
						</div>
						<div className="w-24">
							<CardImage joker="black" />
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
									<button
										className="w-full border-none bg-transparent p-0"
										key={cardId}
										onClick={() =>
											setSelectedCard(selectedCard === cardId ? null : cardId)
										}
										type="button"
									>
										<CardImage
											rank={rank}
											selected={selectedCard === cardId}
											suit={suit}
										/>
									</button>
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
							<CardImage rank="ace" suit="hearts" />
							<p className="mt-2 text-center text-sm">Normal</p>
						</div>
						<div className="w-24">
							<CardImage playable rank="king" suit="hearts" />
							<p className="mt-2 text-center text-sm">Spielbar</p>
						</div>
						<div className="w-24">
							<CardImage rank="queen" selected suit="hearts" />
							<p className="mt-2 text-center text-sm">Ausgewählt</p>
						</div>
						<div className="w-24">
							<CardImage disabled rank="jack" suit="hearts" />
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
