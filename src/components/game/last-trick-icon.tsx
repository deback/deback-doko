import { useId } from "react";

interface LastTrickIconProps {
	className?: string;
}

export function LastTrickIcon({ className }: LastTrickIconProps) {
	const id = useId();
	const card1 = `${id}-card-1`;
	const card2 = `${id}-card-2`;
	const card3 = `${id}-card-3`;
	const card4 = `${id}-card-4`;
	const cut1 = `${id}-cut-1`;
	const cut2 = `${id}-cut-2`;
	const cut3 = `${id}-cut-3`;

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={1}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<rect
					height="8.8"
					id={card1}
					rx="1.3"
					transform="rotate(-26 6.8 13.3)"
					width="5.8"
					x="3.9"
					y="8.9"
				/>
				<rect
					height="8.8"
					id={card2}
					rx="1.3"
					transform="rotate(-12 9.6 11.9)"
					width="5.8"
					x="6.7"
					y="7.5"
				/>
				<rect
					height="8.8"
					id={card3}
					rx="1.3"
					transform="rotate(4 12.4 11.2)"
					width="5.8"
					x="9.5"
					y="6.8"
				/>
				<rect
					height="8.8"
					id={card4}
					rx="1.3"
					transform="rotate(18 15.2 11.9)"
					width="5.8"
					x="12.3"
					y="7.5"
				/>
				<mask id={cut1} maskUnits="userSpaceOnUse">
					<rect fill="white" height="24" width="24" x="0" y="0" />
					<use fill="black" href={`#${card2}`} stroke="black" strokeWidth="2" />
					<use fill="black" href={`#${card3}`} stroke="black" strokeWidth="2" />
					<use fill="black" href={`#${card4}`} stroke="black" strokeWidth="2" />
				</mask>
				<mask id={cut2} maskUnits="userSpaceOnUse">
					<rect fill="white" height="24" width="24" x="0" y="0" />
					<use fill="black" href={`#${card3}`} stroke="black" strokeWidth="2" />
					<use fill="black" href={`#${card4}`} stroke="black" strokeWidth="2" />
				</mask>
				<mask id={cut3} maskUnits="userSpaceOnUse">
					<rect fill="white" height="24" width="24" x="0" y="0" />
					<use fill="black" href={`#${card4}`} stroke="black" strokeWidth="2" />
				</mask>
			</defs>
			<use href={`#${card1}`} mask={`url(#${cut1})`} />
			<use href={`#${card2}`} mask={`url(#${cut2})`} />
			<use href={`#${card3}`} mask={`url(#${cut3})`} />
			<use href={`#${card4}`} />
		</svg>
	);
}
