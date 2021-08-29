import { Socket } from "net";
import WebSocket, * as ws from "ws";
import { Command } from "../command/command";
import { get_command_manager, get_server, get_starttime, set_ws_server } from "../global";
import { log } from "../logger";

export interface WsMessage {
	route: string;
};

export interface WsRoute {
	route: string;
	executer(message: WsMessage, socket: WebSocket): Promise<object>;
}

interface WsUptime extends WsMessage {
	uptime: number;
}

interface WsReport extends WsMessage {
	report: string;
}
interface WsCommands extends WsMessage {
	commands: Command[];
}

var routes: WsRoute[] = [];

export function load_websocket_api(): void  {
	const ws_server = new ws.Server({ noServer: true });
	set_ws_server(ws_server);

	ws_server.on("connection", (websocket) => {
		websocket.on("message", async (message) => {
			var ws_message = JSON.parse(message.toString()) as WsMessage;

			log("websocket", "received message: " + message.toString());

			var route = routes.find(r => r.route == ws_message.route);

			if (route !== undefined) {
				var result = await route.executer(ws_message, websocket);
				if (result !== undefined) {
					websocket.send(JSON.stringify(result));
				}
			} else {
				websocket.send(JSON.stringify({
					status: "no-route"
				}));
			}
		});
	});

	get_server().on("upgrade", (req, socket, head) => {
		ws_server.handleUpgrade(req, socket as Socket, head, (websocket) => {
			ws_server.emit("connection", websocket, req);
		});
	});

	add_route({
		route: "api/echo",
		executer: function(message: WsMessage, socket: WebSocket) {
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/uptime",
		executer: function(message: WsUptime, socket: WebSocket) {
			message.uptime = new Date().getTime() - get_starttime();
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/report",
		executer: function(message: WsReport, socket: WebSocket) {
			log("report", message.report);
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/commands",
		executer: function(message: WsCommands, socket: WebSocket) {
			message.commands = get_command_manager().commands;
			return Promise.resolve(message);
		}
	} as WsRoute);
}

export function add_route(route: WsRoute): void  {
	var old_route = routes.find(r => r.route == route.route);
	if (old_route !== undefined) {
		log("websocket", "route " + route.route + " already exists, overwriting");
		routes[routes.indexOf(old_route)] = route;
	} else {
		log("websocket", "add route: " + route.route);
		routes.push(route);
	}
}