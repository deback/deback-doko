"use client";
import DropZone from "./drop-zone";
import Hand from "./hand";

const CARD_FILES: string[] = [
	"TH.svg",
	"QD.svg",
	"KC.svg",
	"8C.svg",
	"9D.svg",
	"AS.svg",
	"9S.svg",
	"KH.svg",
	"AC.svg",
	"9C.svg",
	"QC.svg",
	"6C.svg",
];
export default function RotateOutsidePage() {
	return (
		<>
			<Hand cards={CARD_FILES} position="bottom" />
			<Hand cards={CARD_FILES} opponent position="top" />
			<Hand cards={CARD_FILES} opponent position="left" />
			<Hand cards={CARD_FILES} opponent position="right" />
			<DropZone />
		</>
	);
}
