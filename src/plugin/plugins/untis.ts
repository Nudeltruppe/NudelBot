import { existsSync, readFileSync, writeFileSync } from "fs";
import WebUntis from "webuntis";
import WebSocket from "ws";
import { AuthenticationRequest, lookup_token } from "../../api/authentication";
import { add_route, WsMessage, WsRoute } from "../../api/websocket";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { empty, fail, get_command_manager } from "../../global";
import { log } from "../../logger";
import { Plugin } from "../plugin";

interface UntisAuth {
	username: string;
	password: string;
}

interface UntisAuthStore {
	[key: string]: UntisAuth;
}

interface UntisDonateRequest extends WsMessage, AuthenticationRequest {
	username: string;
	password: string;
	error?: string;
}

var untis_auth_store: UntisAuthStore;

export default {
	name: "untis",
	version: "0.0.1",

	async load() {
		if (!existsSync("./config/untis.json")) {
			log("untis", "No untis.json found, creating one ...");
			untis_auth_store = {
			} as UntisAuthStore;

			writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
		}

		untis_auth_store = JSON.parse(readFileSync("./config/untis.json").toString()) as UntisAuthStore;

		//const untis = new WebUntis("GSZ Balingen", "400286", "18.04.2005", "neilo.webuntis.com");
	
		get_command_manager().add_command(new Command("donate", "", "", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 2) {
					return fail;
				}

				var username = event.interface.args[0];
				var password = event.interface.args[1];

				try {
					var test_untis = new WebUntis("GSZ Balingen", username, password, "neilo.webuntis.com");
					await test_untis.login();
					await test_untis.logout();
				} catch (e: any) {
					return {
						is_response: true,
						response: "Login failed: " + e
					};
				}

				untis_auth_store[event.interface.user] = {
					password: password,
					username: username,
				};

				writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));

				return {
					is_response: true,
					response: "Thanks for donating!"
				};
			}
		} as CommandExecutor, undefined));

		add_route({
			route: "untis/donate",
			executer: async function(message: UntisDonateRequest, socket: WebSocket): Promise<WsMessage> {
				try {
					var test_untis = new WebUntis("GSZ Balingen", message.username, message.password, "neilo.webuntis.com");
					await test_untis.login();
					await test_untis.logout();

					var user = lookup_token(message.token);
					if (user == null) {
						message.error = "Invalid token";
					} else {
						untis_auth_store[user.user] = {
							password: message.password,
							username: message.username,
						};

						writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
					}
				} catch (e: any) {
					message.error = "Login failed: " + e;
				}

				return message;
			}
		} as WsRoute);
	},

	reload() {

	}
} as Plugin;