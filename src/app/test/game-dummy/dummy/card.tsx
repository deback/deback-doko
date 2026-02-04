import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Card({
	cardId = "AH",
	faceDown = false,
	className,
	style,
}: {
	cardId?: string;
	faceDown?: boolean;
	className?: string;
	style?: React.CSSProperties;
}) {
	const src = faceDown ? "/poker/1B.svg" : `/poker/${cardId}.svg`;
	const alt = faceDown ? "Kartenrückseite" : `Karte ${cardId}`;

	return (
		<div
			className={cn("absolute w-[30vw] aspect-5/7 max-w-40", className)}
			style={style}
		>
			<Image alt={alt} fill src={src} />
		</div>
	);
}
