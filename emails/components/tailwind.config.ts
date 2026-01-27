import type { TailwindConfig } from "@react-email/components";
import { pixelBasedPreset } from "@react-email/components";

export const emailTailwindConfig: TailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		fontFamily: {
			sans: ["Poppins", "Helvetica", "sans-serif"],
			serif: ["Libre Baskerville", "Georgia", "serif"],
		},
		extend: {
			colors: {
				primary: "#854d0e",
			},
		},
	},
};
