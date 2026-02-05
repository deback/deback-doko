export default function DropZone() {
	// Card container: w-[30vw] max-w-40 (lg:max-w-56), aspect 5/7
	// cardW = min(30vw, 10rem)       (default, max-w-40 = 160px = 10rem)
	// cardW = min(30vw, 14rem)       (lg, max-w-56 = 224px = 14rem)
	// cardH = cardW * 1.4
	//
	// Top hand visible = cardH * (1 - translateFraction)
	// Bottom hand visible = cardH * (1 - translateFraction)
	//
	// Left/Right hands: rotate-90, translate-x-4/5
	//   visible from edge ≈ cardW * 0.4
	return (
		<div
			className={[
				"fixed border-2 border-red-500",

				// -- Top --
				// default: translate-y-4/5 → 1/5 of cardH visible
				"top-[calc(min(30vw,10rem)*1.4*0.2)]",
				// portrait: translate-y-2/3 → 1/3 visible
				"portrait:top-[calc(min(30vw,10rem)*1.4/3)]",
				// lg: translate-y-2/3 → 1/3 visible, max-w-56 (14rem)
				"lg:top-[calc(min(30vw,14rem)*1.4/3)]",

				// -- Bottom --
				// default: translate-y-1/3 → 2/3 visible
				"bottom-[calc(min(30vw,10rem)*1.4*2/3)]",
				// sm: translate-y-1/2 → 1/2 visible
				"sm:bottom-[calc(min(30vw,10rem)*1.4/2)]",
				// landscape: translate-y-2/3 → 1/3 visible
				"landscape:bottom-[calc(min(30vw,10rem)*1.4/3)]",
				// lg: translate-y-1/3 → 2/3 visible
				"lg:bottom-[calc(min(30vw,14rem)*1.4*2/3)]",
				// lg:landscape: translate-y-1/2 → 1/2 visible
				"lg:landscape:bottom-[calc(min(30vw,14rem)*1.4/2)]",

				// -- Left/Right --
				// visible ≈ cardW * 0.4 (from rotate-90 + translate-x-4/5 geometry)
				"left-[calc(min(30vw,10rem)*0.4)]",
				"right-[calc(min(30vw,10rem)*0.4)]",
				"lg:left-[calc(min(30vw,14rem)*0.4)]",
				"lg:right-[calc(min(30vw,14rem)*0.4)]",
			].join(" ")}
		/>
	);
}
