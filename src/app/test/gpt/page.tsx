"use client";

import Image from "next/image";
import { useState } from "react";

const CARD_BASE_PATHS = ["/poker"] as const;

// Dateinamen anpassen, falls dein French-Deck anders benennt.
// Erwartetes Format (wie in /public/poker): "TH.svg", "QD.svg", ...
const CARD_FILES: string[] = [
	"TH.svg",
	"QD.svg",
	"KC.svg",
	"8C.svg",
	"9D.svg",
	"AS.svg",
	"9S.svg",
	"KH.svg",
	"AC.svg",
	"9C.svg",
	"QC.svg",
	"6C.svg",
];

function CardFan() {
	const maxAngle = 10; // Grad: Gesamt-"Fächer"-Breite über Rotation
	const spacing = 33; // px: horizontales Auffächern

	const mid = (CARD_FILES.length - 1) / 2;
	const [pathIndexByFile, setPathIndexByFile] = useState<
		Record<string, number>
	>({});

	return (
		<div className="relative w-full max-w-5xl">
			{CARD_FILES.map((file, idx) => {
				const t = mid === 0 ? 0 : (idx - mid) / mid; // -1..1
				const angle = t * maxAngle;
				const x = (idx - mid) * spacing;
				const y = Math.abs(t) * 11; // äußere Karten etwas nach unten schieben

				const pathIdx = pathIndexByFile[file] ?? 0;
				const basePath =
					CARD_BASE_PATHS[Math.min(pathIdx, CARD_BASE_PATHS.length - 1)];
				const src = `${basePath}/${file}`;

				return (
					<div
						className="absolute bottom-0 left-1/2 w-[110px] select-none"
						key={file}
						style={{
							transformOrigin: "50% 150%",
							transform: `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`,
						}}
					>
						<div className="relative aspect-5/7 w-full drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)]">
							<Image
								alt={file.replace(".svg", "")}
								className="object-contain"
								draggable={false}
								fill
								onError={() => {
									setPathIndexByFile((prev) => {
										const nextIdx = (prev[file] ?? 0) + 1;
										if (nextIdx >= CARD_BASE_PATHS.length) return prev;
										return { ...prev, [file]: nextIdx };
									});
								}}
								priority={false}
								sizes="110px"
								src={src}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function Page() {
	return (
		<main className="min-h-[calc(100dvh-4rem)]">
			<div className="relative min-h-[calc(100dvh-4rem)]">
				{/* Hintergrund (ähnlich Holz) */}
				<div className="absolute inset-0 -z-10">
					<div
						className="h-full w-full opacity-90"
						style={{
							backgroundImage: "url(/wood-pattern.png)",
							backgroundSize: "cover",
							backgroundPosition: "center",
						}}
					/>
					<div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/10 to-background" />
				</div>

				{/* Karten-Hand unten */}
				<div className="absolute inset-x-0 bottom-6 px-6">
					<CardFan />
				</div>
			</div>
		</main>
	);
}
