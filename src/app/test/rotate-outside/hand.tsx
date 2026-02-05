"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Card from "./card";

export default function Hand({
	cards,
	position,
	opponent = false,
}: {
	cards: string[];
	position: "bottom" | "top" | "left" | "right";
	opponent?: boolean;
}) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	return (
		<div
			className={cn(
				"fixed",
				{
					"rotate-180 top-0 -translate-x-1/2 portrait:-translate-y-2/3 left-1/2 -translate-y-4/5 lg:-translate-y-2/3":
						position === "top",
				},

				{
					"left-0 top-1/2 -translate-y-1/2 rotate-90 -translate-x-4/5":
						position === "left",
				},
				{
					"right-0 top-1/2 -translate-y-1/2  -rotate-90 translate-x-4/5":
						position === "right",
				},
				{
					"bottom-0 translate-y-1/3 -translate-x-1/2 sm:translate-y-1/2 left-1/2 landscape:translate-y-2/3 lg:landscape:translate-y-1/2":
						position === "bottom",
				},
			)}
		>
			<div className="relative w-[30vw] max-w-40 lg:max-w-56 aspect-5/7">
				{cards.map((card, index) => {
					const t = index - (cards.length - 1) / 2;
					const angle = t * 1.2;
					return (
						<Card
							angle={angle}
							className="top-0 left-0 w-full h-full"
							file={`${opponent ? "1B.svg" : card}`}
							key={`${position}-${index}-${card}`}
							selected={!opponent && selectedIndex === index}
							onClick={
								opponent
									? undefined
									: () =>
											setSelectedIndex((prev) =>
												prev === index ? null : index,
											)
							}
						/>
					);
				})}
			</div>
		</div>
	);
}
