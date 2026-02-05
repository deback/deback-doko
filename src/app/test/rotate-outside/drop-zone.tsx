export default function DropZone() {
	// Card: w-[30vw] max-w-40 (lg:max-w-56), aspect 5/7
	// max-w-40 = 10rem → cardH = 14rem
	// max-w-56 = 14rem → cardH = 19.6rem
	return (
		<div
			className={[
				"fixed left-0 right-0 border-2 border-red-500",

				// -- Top: sichtbarer Anteil der oberen Hand --
				// default: translate-y-4/5 → 1/5 sichtbar → 14rem * 0.2 = 2.8rem
				"top-[2.8rem]",
				// portrait: translate-y-2/3 → 1/3 sichtbar → 14rem * 0.33 ≈ 4.67rem
				"portrait:top-[4.67rem]",
				// lg: translate-y-2/3 → 1/3 sichtbar → 19.6rem * 0.33 ≈ 6.5rem
				"lg:top-26",

				// -- Bottom: sichtbarer Anteil der unteren Hand --
				// default: translate-y-1/3 → 2/3 sichtbar → 14rem * 0.67 ≈ 9.33rem
				"bottom-[9.33rem]",
				// sm: translate-y-1/2 → 1/2 sichtbar → 14rem * 0.5 = 7rem
				"sm:bottom-28",
				// landscape: translate-y-2/3 → 1/3 sichtbar → 14rem * 0.33 ≈ 4.67rem
				"landscape:bottom-[4.67rem]",
				// lg: translate-y-1/3 → 2/3 sichtbar → 19.6rem * 0.67 ≈ 13rem
				"lg:bottom-52",
				// lg:landscape: translate-y-1/2 → 1/2 sichtbar → 19.6rem * 0.5 = 9.8rem
				"lg:landscape:bottom-[9.8rem]",
			].join(" ")}
		/>
	);
}
