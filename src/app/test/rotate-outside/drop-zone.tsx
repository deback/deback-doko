"use client";

import { useEffect, useRef, useState } from "react";
import Card from "./card";

const THROWN_CARDS: {
	file: string;
	position: "bottom" | "top" | "left" | "right";
}[] = [
	{ file: "QH.svg", position: "bottom" },
	{ file: "QS.svg", position: "top" },
	{ file: "JD.svg", position: "left" },
	{ file: "TC.svg", position: "right" },
];

function randomAngle() {
	return Math.random() * 40 - 20;
}

export default function DropZone() {
	const [mounted, setMounted] = useState(false);
	const anglesRef = useRef<number[]>([]);

	useEffect(() => {
		anglesRef.current = THROWN_CARDS.map((card) => {
			const base =
				card.position === "left" || card.position === "right" ? 90 : 0;
			return base + randomAngle();
		});
		setMounted(true);
	}, []);

	return (
		<div
			className={[
				"fixed border-2 border-red-500",

				// -- Top --
				"top-[calc(min(30vw,10rem)*1.4*0.2)]",
				"portrait:top-[calc(min(30vw,10rem)*1.4/3)]",
				"lg:top-[calc(min(30vw,14rem)*1.4/3)]",

				// -- Bottom --
				"bottom-[calc(min(30vw,10rem)*1.4*2/3)]",
				"sm:bottom-[calc(min(30vw,10rem)*1.4/2)]",
				"landscape:bottom-[calc(min(30vw,10rem)*1.4/3)]",
				"lg:bottom-[calc(min(30vw,14rem)*1.4*2/3)]",
				"lg:landscape:bottom-[calc(min(30vw,14rem)*1.4/2)]",

				// -- Left/Right --
				"left-[calc(min(30vw,10rem)*0.4)]",
				"right-[calc(min(30vw,10rem)*0.4)]",
				"lg:left-[calc(min(30vw,14rem)*0.4)]",
				"lg:right-[calc(min(30vw,14rem)*0.4)]",
			].join(" ")}
		>
			{mounted && (
				<div className="relative w-full h-full flex items-center justify-center">
					{THROWN_CARDS.map((card, i) => (
						<Card
							angle={anglesRef.current[i] ?? 0}
							className={[
								"origin-center!",
								card.position === "bottom" && "translate-y-[30%]",
								card.position === "top" && "-translate-y-[30%]",
								card.position === "left" && "-translate-x-[30%]",
								card.position === "right" && "translate-x-[30%]",
							]
								.filter(Boolean)
								.join(" ")}
							file={card.file}
							key={card.position}
						/>
					))}
				</div>
			)}
		</div>
	);
}
