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

const STORAGE_KEY = "deback-doko-card-design";
const DEFAULT_DESIGN: CardDesign = "doko";

interface CardDesignContextValue {
	cardDesign: CardDesign;
	setCardDesign: (design: CardDesign) => void;
	basePath: string;
}

const CardDesignContext = createContext<CardDesignContextValue | null>(null);

export function CardDesignProvider({ children }: { children: ReactNode }) {
	const [cardDesign, setCardDesignState] = useState<CardDesign>(DEFAULT_DESIGN);

	// Load from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "doko" || stored === "poker") {
			setCardDesignState(stored);
		}
	}, []);

	const setCardDesign = useCallback((design: CardDesign) => {
		setCardDesignState(design);
		localStorage.setItem(STORAGE_KEY, design);
	}, []);

	const basePath = cardDesign === "doko" ? "/doko" : "/poker";

	const value = useMemo(
		() => ({ cardDesign, setCardDesign, basePath }),
		[cardDesign, setCardDesign, basePath],
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
