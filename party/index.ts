import type * as Party from "partykit/server";
import Server from "./server/game-lifecycle";

export default Server;

Server satisfies Party.Worker;
