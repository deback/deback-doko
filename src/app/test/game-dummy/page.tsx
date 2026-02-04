import Cards from "./dummy/cards";
import DropZone from "./dummy/drop-zone";
import OpponentCards from "./dummy/opponent-cards";

export default function GameDummyPage() {
	return (
		<div>
			<Cards opponent position="top" />
			<Cards opponent position="right" />
			<Cards opponent position="left" />
			<DropZone />
			<Cards />
		</div>
	);
}
