import type {
	CardBackDesign,
	CardRenderMode,
	FullRank,
	Rank,
	Suit,
} from "@/types/game";

// Basis-Pfad für Karten-SVGs
export const SVG_CARDS_BASE_PATH = "/poker";

// Mapping von Suit zu Dateinamens-Code
const SUIT_TO_CODE: Record<Suit, string> = {
	hearts: "H",
	diamonds: "D",
	clubs: "C",
	spades: "S",
};

// Mapping von Rank zu Dateinamens-Code
const RANK_TO_CODE: Record<string, string> = {
	"2": "2",
	"3": "3",
	"4": "4",
	"5": "5",
	"6": "6",
	"7": "7",
	"8": "8",
	"9": "9",
	"10": "T",
	jack: "J",
	queen: "Q",
	king: "K",
	ace: "A",
};

// Erstellt den Pfad für eine Karte (z.B. "/poker/AH.svg" für Ace of Hearts)
export function getCardImagePath(suit: Suit, rank: Rank | FullRank): string {
	const rankCode = RANK_TO_CODE[rank] || rank;
	const suitCode = SUIT_TO_CODE[suit];
	return `${SVG_CARDS_BASE_PATH}/${rankCode}${suitCode}.svg`;
}

// Erstellt den Pfad für einen Kartenrücken
export function getCardBackPath(design: CardBackDesign): string {
	// 1B.svg = blau, 2B.svg = alternativ
	const backFile = design === "blue" ? "1B" : "2B";
	return `${SVG_CARDS_BASE_PATH}/${backFile}.svg`;
}

// Erstellt den Pfad für einen Joker
export function getJokerPath(color: "red" | "black"): string {
	// 1J.svg = rot, 2J.svg = schwarz
	const jokerFile = color === "red" ? "1J" : "2J";
	return `${SVG_CARDS_BASE_PATH}/${jokerFile}.svg`;
}

// Deutsche Rang-Bezeichnungen für die Anzeige
export const RANK_DISPLAY: Record<string, string> = {
	"2": "2",
	"3": "3",
	"4": "4",
	"5": "5",
	"6": "6",
	"7": "7",
	"8": "8",
	"9": "9",
	"10": "10",
	jack: "B", // Bube
	queen: "D", // Dame
	king: "K", // König
	ace: "A", // Ass
};

// Farb-Symbole
export const SUIT_SYMBOLS: Record<Suit, string> = {
	hearts: "♥",
	diamonds: "♦",
	clubs: "♣",
	spades: "♠",
};

// Standard-Konfiguration
export const defaultCardConfig = {
	renderMode: "svg" as CardRenderMode,
	backDesign: "blue" as CardBackDesign,
};

// Alle Ränge für ein volles 52-Karten-Deck
export const ALL_FULL_RANKS: FullRank[] = [
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"jack",
	"queen",
	"king",
	"ace",
];

// Alle Farben
export const ALL_SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
