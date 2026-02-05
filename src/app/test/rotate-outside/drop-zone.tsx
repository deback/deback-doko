"use client";

import Card from "./card";

const THROWN_CARDS: {
	file: string;
	angle: number;
	position: "bottom" | "top" | "left" | "right";
}[] = [
	{ file: "QH.svg", angle: -8, position: "bottom" },
	{ file: "QS.svg", angle: 175, position: "top" },
	{ file: "JD.svg", angle: 82, position: "left" },
	{ file: "TC.svg", angle: -95, position: "right" },
];

export default function DropZone() {
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
			<div className="relative w-full h-full flex items-center justify-center">
				{THROWN_CARDS.map((card) => (
					<Card
						angle={card.angle}
						className={[
							// Reset transform-origin from fan to center
							"origin-center!",
							// Position from center based on which player threw it
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
		</div>
	);
}
