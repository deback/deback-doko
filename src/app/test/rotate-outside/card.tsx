import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Card({
	file,
	angle,
	className,
	selected = false,
	onClick,
}: {
	file: string;
	angle: number;
	className?: string;
	selected?: boolean;
	onClick?: () => void;
}) {
	const Component = onClick ? "button" : "div";
	return (
		<Component
			className={cn(
				"absolute w-[30vw] max-w-56 aspect-5/7 origin-[50%_650%] shadow-md rounded-[1cqw] xl:origin-[50%_850%] transition-transform duration-200",
				{ "cursor-pointer hover:-translate-y-[6%]": onClick },
				{
					"-translate-y-[10%] hover:-translate-y-[10%] ring-2 ring-primary":
						selected,
				},
				className,
			)}
			onClick={onClick}
			style={{
				transform: `rotate(${angle}deg)`,
			}}
			type={onClick ? "button" : undefined}
		>
			<Image alt={file} draggable={false} fill src={`/poker/${file}`} />
		</Component>
	);
}
