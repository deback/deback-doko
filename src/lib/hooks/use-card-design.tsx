"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

export type CardDesign = "doko" | "poker";
export type DarkModeCardStyle = "normal" | "dimmed" | "inverted" | "sepia";

const STORAGE_KEY = "deback-doko-card-design";
const DARK_MODE_STYLE_KEY = "deback-doko-dark-mode-style";
const DEFAULT_DESIGN: CardDesign = "doko";
const DEFAULT_DARK_MODE_STYLE: DarkModeCardStyle = "inverted";

interface CardDesignContextValue {
	cardDesign: CardDesign;
	setCardDesign: (design: CardDesign) => void;
	basePath: string;
	darkModeStyle: DarkModeCardStyle;
	setDarkModeStyle: (style: DarkModeCardStyle) => void;
}

const CardDesignContext = createContext<CardDesignContextValue | null>(null);

export function CardDesignProvider({ children }: { children: ReactNode }) {
	const [cardDesign, setCardDesignState] = useState<CardDesign>(DEFAULT_DESIGN);
	const [darkModeStyle, setDarkModeStyleState] =
		useState<DarkModeCardStyle>(DEFAULT_DARK_MODE_STYLE);

	// Load from localStorage on mount
	useEffect(() => {
		const storedDesign = localStorage.getItem(STORAGE_KEY);
		if (storedDesign === "doko" || storedDesign === "poker") {
			setCardDesignState(storedDesign);
		}

		const storedStyle = localStorage.getItem(DARK_MODE_STYLE_KEY);
		if (
			storedStyle === "normal" ||
			storedStyle === "dimmed" ||
			storedStyle === "inverted" ||
			storedStyle === "sepia"
		) {
			setDarkModeStyleState(storedStyle);
		}
	}, []);

	const setCardDesign = useCallback((design: CardDesign) => {
		setCardDesignState(design);
		localStorage.setItem(STORAGE_KEY, design);
	}, []);

	const setDarkModeStyle = useCallback((style: DarkModeCardStyle) => {
		setDarkModeStyleState(style);
		localStorage.setItem(DARK_MODE_STYLE_KEY, style);
	}, []);

	const basePath = cardDesign === "doko" ? "/doko" : "/poker";

	const value = useMemo(
		() => ({
			cardDesign,
			setCardDesign,
			basePath,
			darkModeStyle,
			setDarkModeStyle,
		}),
		[cardDesign, setCardDesign, basePath, darkModeStyle, setDarkModeStyle],
	);

	return (
		<CardDesignContext.Provider value={value}>
			{children}
		</CardDesignContext.Provider>
	);
}

export function useCardDesign() {
	const context = useContext(CardDesignContext);
	if (!context) {
		throw new Error("useCardDesign must be used within a CardDesignProvider");
	}
	return context;
}
