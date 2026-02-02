import { CardImage } from "@/components/cards";

export default function HandTestPage() {
	return (
		<div className="fixed bottom-0 max-w-[1200px] mx-auto left-0 right-0 bg-black flex items-center justify-center">
			<CardImage
				className=" absolute w-1/5 -translate-x-[125%] -rotate-10"
				rank="2"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 -translate-x-[100%] -rotate-8"
				rank="3"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 -translate-x-[75%] -rotate-6"
				rank="4"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 -translate-x-[50%] -rotate-4"
				rank="5"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 -translate-x-[25%] -rotate-2"
				rank="6"
				suit="hearts"
			/>
			<CardImage className="w-1/5" rank="ace" suit="hearts" />
			<CardImage
				className=" absolute w-1/5 translate-x-[25%] rotate-2 translate-y-[2%]"
				rank="7"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 translate-x-[50%] rotate-4 translate-y-[4%]"
				rank="8"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 translate-x-[75%] rotate-6 translate-y-[6%]"
				rank="9"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 translate-x-[100%] rotate-8 translate-y-[8%]"
				rank="10"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 translate-x-[125%] rotate-10 translate-y-[10%]"
				rank="jack"
				suit="hearts"
			/>
			<CardImage
				className=" absolute w-1/5 translate-x-[150%] rotate-12 translate-y-[12%]"
				rank="queen"
				suit="hearts"
			/>
		</div>
	);
}
