import type {
	ContractType,
	GameState,
	PointAnnouncementType,
	ReservationType,
} from "@/types/game";

const POINT_ANNOUNCEMENT_ORDER: PointAnnouncementType[] = [
	"no90",
	"no60",
	"no30",
	"schwarz",
];

const TEAM_ANNOUNCEMENT_TEXT: Record<"re" | "kontra", string> = {
	re: "Re",
	kontra: "Kontra",
};

const POINT_ANNOUNCEMENT_TEXT: Record<PointAnnouncementType, string> = {
	no90: "Keine 90",
	no60: "Keine 60",
	no30: "Keine 30",
	schwarz: "Schwarz",
};

const CONTRACT_ANNOUNCEMENT_TEXT: Partial<Record<ContractType, string>> = {
	hochzeit: "Hochzeit",
	"solo-clubs": "Kreuz-Solo",
	"solo-spades": "Pik-Solo",
	"solo-hearts": "Herz-Solo",
	"solo-diamonds": "Karo-Solo",
	"solo-queens": "Damen-Solo",
	"solo-jacks": "Buben-Solo",
	"solo-aces": "Fleischloser",
};

type AnnouncementAudioEventType = "team" | "point" | "contract" | "bid";

export interface AnnouncementAudioEvent {
	type: AnnouncementAudioEventType;
	text: string;
}

const BID_ANNOUNCEMENT_TEXT: Record<ReservationType, string> = {
	gesund: "Gesund",
	vorbehalt: "Vorbehalt",
};

function getHighestNewPointAnnouncement(params: {
	prev: GameState["announcements"]["rePointAnnouncements"];
	next: GameState["announcements"]["rePointAnnouncements"];
}): PointAnnouncementType | null {
	const prevTypes = new Set(
		params.prev.map((announcement) => announcement.type),
	);
	const nextTypes = new Set(
		params.next.map((announcement) => announcement.type),
	);

	let highest: PointAnnouncementType | null = null;

	for (const pointType of POINT_ANNOUNCEMENT_ORDER) {
		if (!prevTypes.has(pointType) && nextTypes.has(pointType)) {
			highest = pointType;
		}
	}

	return highest;
}

function getContractEventText(
	prevContract: ContractType,
	nextContract: ContractType,
): string | null {
	if (prevContract !== "normal") return null;
	if (nextContract === "normal") return null;
	return CONTRACT_ANNOUNCEMENT_TEXT[nextContract] ?? null;
}

export function getAnnouncementAudioEvents(
	prevState: GameState | null,
	nextState: GameState,
): AnnouncementAudioEvent[] {
	if (!prevState) return [];

	const events: AnnouncementAudioEvent[] = [];

	const prevBids = prevState.biddingPhase?.bids ?? {};
	const nextBids = nextState.biddingPhase?.bids ?? {};

	for (const player of nextState.players) {
		const prevBid = prevBids[player.id];
		const nextBid = nextBids[player.id];
		if (!nextBid || prevBid === nextBid) continue;
		events.push({
			type: "bid",
			text: BID_ANNOUNCEMENT_TEXT[nextBid],
		});
	}

	const contractText = getContractEventText(
		prevState.contractType,
		nextState.contractType,
	);
	if (contractText) {
		events.push({
			type: "contract",
			text: contractText,
		});
	}

	if (
		!prevState.announcements.re.announced &&
		nextState.announcements.re.announced
	) {
		events.push({
			type: "team",
			text: TEAM_ANNOUNCEMENT_TEXT.re,
		});
	}

	if (
		!prevState.announcements.kontra.announced &&
		nextState.announcements.kontra.announced
	) {
		events.push({
			type: "team",
			text: TEAM_ANNOUNCEMENT_TEXT.kontra,
		});
	}

	const newRePoint = getHighestNewPointAnnouncement({
		prev: prevState.announcements.rePointAnnouncements,
		next: nextState.announcements.rePointAnnouncements,
	});
	if (newRePoint) {
		events.push({
			type: "point",
			text: POINT_ANNOUNCEMENT_TEXT[newRePoint],
		});
	}

	const newKontraPoint = getHighestNewPointAnnouncement({
		prev: prevState.announcements.kontraPointAnnouncements,
		next: nextState.announcements.kontraPointAnnouncements,
	});
	if (newKontraPoint) {
		events.push({
			type: "point",
			text: POINT_ANNOUNCEMENT_TEXT[newKontraPoint],
		});
	}

	return events;
}
