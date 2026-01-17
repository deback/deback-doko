import type { TailwindConfig } from "@react-email/components";
import { pixelBasedPreset } from "@react-email/components";

export const emailTailwindConfig: TailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		extend: {
			colors: {
				brand: "#233E91",
				primary: "#233E91",
			},
		},
	},
};
