/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	typescript: {
		// Disable TypeScript type checking during build
		// Type checking is handled separately in CI/CD pipeline
		ignoreBuildErrors: true,
	},
	eslint: {
		// Disable ESLint during build
		// Linting is handled separately in CI/CD pipeline
		ignoreDuringBuilds: true,
	},
};

export default config;
