"use client";

import type {
	DraggableAttributes,
	DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { motion, type TargetAndTransition } from "framer-motion";
import Image from "next/image";
import type { Ref } from "react";
import { cn } from "@/lib/utils";

export const CARD_SIZE =
	"w-[30vw] max-w-40 lg:max-w-56 landscape:w-[30vh] landscape:max-w-28 lg:landscape:max-w-56 aspect-5/7";

const THROW_TRANSITION = {
	type: "tween" as const,
	duration: 0.5,
	ease: [0.25, 0.1, 0.25, 1] as const,
};

export default function Card({
	file,
	angle,
	className,
	selected = false,
	onClick,
	initial,
	animate,
	ref,
	style,
	dragListeners,
	dragAttributes,
}: {
	file: string;
	angle: number;
	className?: string;
	selected?: boolean;
	onClick?: () => void;
	initial?: false | TargetAndTransition;
	animate?: TargetAndTransition;
	ref?: Ref<HTMLButtonElement>;
	style?: React.CSSProperties;
	dragListeners?: DraggableSyntheticListeners;
	dragAttributes?: DraggableAttributes;
}) {
	// Hand cards: no animate prop → rotation via framer-motion animate for smooth interpolation.
	// DropZone cards with rotate in animate → framer-motion controls rotation, no style needed.
	// DropZone cards without rotate in animate → rotation via style (instant).
	const mergedAnimate = animate ?? { rotate: angle };
	const hasAnimatedRotation = animate != null && "rotate" in animate;
	const rotateStyle =
		hasAnimatedRotation || !animate ? undefined : { rotate: angle };
	const mergedStyle = { ...rotateStyle, ...style };

	return (
		<motion.button
			animate={mergedAnimate}
			className={cn(
				`absolute ${CARD_SIZE} origin-[50%_650%] select-none rounded-[5cqw] shadow-md transition-[translate,box-shadow] duration-200 xl:origin-[50%_850%]`,
				{ "cursor-pointer hover:-translate-y-[6%]": onClick },
				{
					"-translate-y-[10%] ring-2 ring-primary hover:-translate-y-[10%]":
						selected,
				},
				className,
			)}
			initial={initial ?? false}
			onClick={onClick}
			ref={ref}
			style={mergedStyle}
			transition={THROW_TRANSITION}
			type="button"
			{...dragListeners}
			{...dragAttributes}
		>
			<Image alt={file} draggable={false} fill src={`/doko/${file}`} />
		</motion.button>
	);
}
