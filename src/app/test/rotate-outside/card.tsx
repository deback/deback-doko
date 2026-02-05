import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Card({
	file,
	angle,
	className,
}: {
	file: string;
	angle: number;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"absolute w-[30vw] max-w-56 aspect-5/7 origin-[50%_650%] xl:origin-[50%_850%]",
				className,
			)}
			style={{
				transform: `rotate(${angle}deg)`,
			}}
		>
			<Image alt={file} draggable={false} fill src={`/poker/${file}`} />
		</div>
	);
}
