"use client";

import { motion, type TargetAndTransition } from "framer-motion";
import Image from "next/image";
import type { Ref } from "react";
import { cn } from "@/lib/utils";

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
}: {
	file: string;
	angle: number;
	className?: string;
	selected?: boolean;
	onClick?: () => void;
	initial?: false | TargetAndTransition;
	animate?: TargetAndTransition;
	ref?: Ref<HTMLButtonElement>;
}) {
	return (
		<motion.button
			animate={animate}
			className={cn(
				"absolute w-[30vw] max-w-56 aspect-5/7 origin-[50%_650%] shadow-md rounded-[1cqw] xl:origin-[50%_850%] transition-[translate,box-shadow] duration-200",
				{ "cursor-pointer hover:-translate-y-[6%]": onClick },
				{
					"-translate-y-[10%] hover:-translate-y-[10%] ring-2 ring-primary":
						selected,
				},
				className,
			)}
			initial={initial}
			onClick={onClick}
			ref={ref}
			style={{ rotate: angle }}
			transition={THROW_TRANSITION}
			type="button"
		>
			<Image alt={file} draggable={false} fill src={`/poker/${file}`} />
		</motion.button>
	);
}
