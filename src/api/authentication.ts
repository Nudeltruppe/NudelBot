import { existsSync, readFileSync, writeFileSync } from "fs";
import WebSocket from "ws";
import { FileCache } from "../cache";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../command/command";
import { get_roles } from "../command/permission";
import { fail, get_command_manager } from "../global";
import { random_id } from "../utils";
import { add_route, WsMessage, WsRoute } from "./websocket";

interface AuthenticationStorage {
	pending: {
		[id: string]: PendingToken;
	};
	tokens: {
		[user: string]: AuthenticationToken;
	};
}

interface PendingToken {
	state: string;
	token: string;
	auth_id: string;
}

interface AuthenticationToken {
	user: string;
	token: string;
	username: string;
}

interface AuthenticationResult extends WsMessage {
	result: AuthenticationToken;
}

export interface AuthenticationRequest extends WsMessage {
	token: string;
}

interface AuthenticationPermissions extends WsMessage {
	permissions: string[];
}

interface AuthenticationSetUsername extends AuthenticationRequest {
	username: string;
}

var _websocket_resolver: { [id: string]: (value: WsMessage | PromiseLike<WsMessage>) => void } = {};
var authentication_storage: FileCache;

export function load_auth_api(): void  {

	if (!existsSync("./config/authentication.json")) {
		var tmp = {
			pending: {},
			tokens: {}
		};
		writeFileSync("./config/authentication.json", JSON.stringify(tmp, null, 4));
		authentication_storage = new FileCache("./config/authentication.json");
	} else {
		authentication_storage = new FileCache("./config/authentication.json");
	}

	add_route({
		route: "auth/request",
		executer: function(message: WsMessage, socket: WebSocket) {
			var id = String(Math.floor(Math.random() * 99999999));
			var token = random_id();

			(authentication_storage.file_cache as AuthenticationStorage).pending[id] = {
				state: "pending",
				token: token,
				auth_id: id
			}
			writeFileSync("./config/authentication.json", JSON.stringify(authentication_storage.file_cache, null, 4));

			socket.send(JSON.stringify({
				id: id
			}));

			var resolver = new Promise<WsMessage>((resolve, reject) => {
				_websocket_resolver[id] = resolve;
			});

			return resolver;
		}

	} as WsRoute);

	add_route({
		route: "auth/username",
		executer: async function(message: AuthenticationSetUsername, socket: WebSocket): Promise<WsMessage> {
			var user = Object.keys((authentication_storage.file_cache as AuthenticationStorage).tokens).find(x => (authentication_storage.file_cache as AuthenticationStorage).tokens[x].token == message.token);
			if (user != undefined) {
				if ((authentication_storage.file_cache as AuthenticationStorage).tokens[user]) {
					(authentication_storage.file_cache as AuthenticationStorage).tokens[user].username = message.username;
					writeFileSync("./config/authentication.json", JSON.stringify(authentication_storage.file_cache, null, 4));
				}
			}
			return message;
		}
	} as WsRoute);


	add_route({
		route: "auth/info",
		executer: async function(message: AuthenticationRequest&AuthenticationResult, socket: WebSocket): Promise<WsMessage> {
			var user = Object.keys((authentication_storage.file_cache as AuthenticationStorage).tokens).find(x => (authentication_storage.file_cache as AuthenticationStorage).tokens[x].token == message.token);
			if (user != undefined) {
				message.result = (authentication_storage.file_cache as AuthenticationStorage).tokens[user];
			}
			return message;
		}
	} as WsRoute);

	add_route({
		route: "auth/perms",
		executer: async function(message: AuthenticationRequest&AuthenticationPermissions, socket: WebSocket): Promise<WsMessage> {
			message.permissions = get_roles(lookup_token(message.token).user);
			return message;
		}
	} as WsRoute);

	get_command_manager().add_command(new Command("auth", "Authenticate on the website!", "Use '#auth [id]' to authenticate on the website", "#auth 4985hg",{
		execute: async (event: CommandEvent): Promise<CommandResponse> => {
			if (event.interface.args.length != 1) {
				return fail;
			}

			if (_websocket_resolver[event.interface.args[0]] == undefined) {
				return fail;
			}

			var token_obj = {
				token: (authentication_storage.file_cache as AuthenticationStorage).tokens[event.interface.user] ? (authentication_storage.file_cache as AuthenticationStorage).tokens[event.interface.user].token : (authentication_storage.file_cache as AuthenticationStorage).pending[event.interface.args[0]].token,
				user: event.interface.user,
				username: (authentication_storage.file_cache as AuthenticationStorage).tokens[event.interface.user] ? (authentication_storage.file_cache as AuthenticationStorage).tokens[event.interface.user].username : event.interface.user
			} as AuthenticationToken;


			(authentication_storage.file_cache as AuthenticationStorage).tokens[event.interface.user] = token_obj;
			delete (authentication_storage.file_cache as AuthenticationStorage).pending[event.interface.args[0]];

			writeFileSync("./config/authentication.json", JSON.stringify(authentication_storage.file_cache, null, 4));

			var result = {
				result: token_obj,
				route: "auth/request"
			} as AuthenticationResult;

			_websocket_resolver[event.interface.args[0]](result);

			return {
				is_response: true,
				response: "Done, please look back in your browser the process will continue there!"
			}
		}
	} as CommandExecutor, undefined));
}

export function lookup_token(token: string): AuthenticationToken {
	var user = Object.keys((authentication_storage.file_cache as AuthenticationStorage).tokens).find(x => (authentication_storage.file_cache as AuthenticationStorage).tokens[x].token == token);
	if (user != undefined) {
		return (authentication_storage.file_cache as AuthenticationStorage).tokens[user];
	} else {
		throw new Error("Token not found");
	}
}