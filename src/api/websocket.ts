import { Socket } from "net";
import WebSocket, * as ws from "ws";
import { Command } from "../command/command";
import { check_permission } from "../command/permission";
import { Config, export_configs, import_configs } from "../config";
import { get_command_manager, get_config_cache, get_server, get_starttime, set_ws_server } from "../global";
import { log } from "../logger";
import { do_soft_reload } from "../softreload";
import { AuthenticationRequest, lookup_token } from "./authentication";

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

interface WsCommandPrefix extends WsMessage {
	prefix: string;
}

interface DataSince extends WsMessage {
	since: Config["data_since"];
}

export interface PullPush extends WsMessage {
	token: string;
	data: object;
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

	add_route({
		route: "api/prefix",
		executer: function(message: WsCommandPrefix, socket: WebSocket) {
			message.prefix = get_command_manager().prefix;
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/data-since",
		executer: function(message: DataSince, socket: WebSocket) {
			message.since = (get_config_cache().file_cache as Config).data_since;
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/pull",
		executer: function(message: PullPush, socket: WebSocket) {
			var user = lookup_token(message.token);
			if (!check_permission(user.user, "status")) {
				return Promise.resolve({
					status: "no-permission"
				});
			}

			message.data = export_configs();
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/push",
		executer: function(message: PullPush, socket: WebSocket) {
			var user = lookup_token(message.token);
			if (!check_permission(user.user, "status")) {
				return Promise.resolve({
					status: "no-permission"
				});
			}

			import_configs(message.data as any);
			return Promise.resolve(message);
		}
	} as WsRoute);

	add_route({
		route: "api/soft-reload",
		executer: function(message: AuthenticationRequest, socket: WebSocket) {
			var user = lookup_token(message.token);
			if (!check_permission(user.user, "status")) {
				return Promise.resolve({
					status: "no-permission"
				});
			}

			do_soft_reload();
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

export class ConnectionSocket {

	socket_url: String;
	token: String | undefined;
	is_in_call: Boolean;
	websocket: WebSocket | undefined = undefined;


	constructor(socket_url: String, token: String | undefined) {
		this.socket_url = socket_url;
		this.token = token;
		this.is_in_call = true;
	}

	async initialize(): Promise<WebSocket> {
		return new Promise((resolve, reject) => {
			this.websocket = new WebSocket(this.socket_url as string);
			this.websocket.onopen = _ => {
				log("websocket-client", "Websocket for " + this.socket_url + " is ready!");
				this.is_in_call = false;
				resolve(this.websocket as WebSocket);
			};
		});
	}

	async socket_call(endpoint: String, data: Object): Promise<Object> {
		return new Promise((resolve, reject) => {
			if (this.is_in_call) {
				reject("Socket in call already!");
			}

			if(!!this.websocket) {
				this.websocket.onmessage = msg => {
					log("websocket-client", "Websocket did recive: " + msg.data);
					resolve(JSON.parse(msg.data as any));
				};

				this.websocket.send(JSON.stringify({
					...{
						route: endpoint,
						token: this.token
					},
					...data
				}));
			} else {
				reject("Call initialize first!");
			}
		});
	}

	async wait_for_message(): Promise<Object> {
		return new Promise((resolve, reject) => {
			if (this.is_in_call) {
				reject("Socket in call already!");
			}

			if(!!this.websocket) {
				this.websocket.onmessage = msg => {
					log("websocket-client", "Websocket did recive: " + msg.data);
					resolve(JSON.parse(msg.data as any));
				};
			} else {
				reject("Call initialize first!");
			}
		});
	}
}