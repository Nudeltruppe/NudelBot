import { existsSync, readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { fail, get_command_manager } from "../../global";
import { log } from "../../logger";
import { Plugin } from "../plugin";

interface _2b2w_config {
	port: number;
	host: string;
};

interface _2b2w_update {
	ETA: string;
	queuePlace: number;
	isInQueue: boolean;
	restartQueue: boolean;
	password: string;
	place: number;
}

var callback_timer: NodeJS.Timer|null = null;
var config: _2b2w_config;

export default {
	name: '2b2w',
	version: '0.0.1',

	load() {

		if (!existsSync("./config/2b2w.json")) {
			config = {
				port: 8080,
				host: "localhost"
			} as _2b2w_config;
			writeFileSync("./config/2b2w.json", JSON.stringify(config, null, 4));
		} else {
			config = JSON.parse(readFileSync("./config/2b2w.json").toString());
		}

		get_command_manager().add_command(new Command("2b2w", "Manage a 2bored2wait instance!", "Use '#2b2w [start,stop,update]' to mange a 2b2w instance!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				switch (event.interface.args[0]) {
					case "start":
						if (callback_timer !== null) {
							return {
								is_response: true,
								response: "2b2w is already running"
							}
						}

						await fetch(`http://${config.host}:${config.port}/start`);

						callback_timer = setInterval(async () => {
							try {
								var data = await (await fetch(`http://${config.host}:${config.port}/update`)).json() as _2b2w_update;
								await event.interface.set_bot_status(`ETA: ${data.ETA}, Place in queue: ${data.place}`);

								log("2b2w", `ETA: ${data.ETA}, Place in queue: ${data.place}`);
							} catch (e) {
								log("2b2w", "Error: " + e);

								if (callback_timer !== null) {
									clearInterval(callback_timer);
									callback_timer = null;
								}

								await fetch(`http://${config.host}:${config.port}/stop`);
							}
						}, 1000 * 5);

						return {
							is_response: true,
							response: "2b2w started"
						}

					case "stop":
						if (callback_timer === null) {
							return {
								is_response: true,
								response: "2b2w is not running"
							}
						}

						await fetch(`http://${config.host}:${config.port}/stop`);

						clearInterval(callback_timer);
						callback_timer = null;

						return {
							is_response: true,
							response: "2b2w stopped"
						}

					case "update":
						if (callback_timer === null) {
							return {
								is_response: true,
								response: "2b2w is not running"
							}
						}

						var data = await (await fetch(`http://${config.host}:${config.port}/update`)).json() as _2b2w_update;

						return {
							is_response: true,
							response: `ETA: ${data.ETA}, Place in queue: ${data.place}`
						}
					
					default:
						return fail;
				}
			},
			subsystems: ["discord", "whatsapp", "web"]
		} as CommandExecutor, "2b2w"));
	},

	reload() {
		if (callback_timer) {
			clearInterval(callback_timer);
			callback_timer = null;
		}

		fetch(`http://${config.host}:${config.port}/stop`);
	}
} as Plugin;
