import { readFileSync, writeFileSync } from "fs";
import { sync } from "glob";
import { Command } from "./command/command";
import { get_config_cache } from "./global";
import { log } from "./logger";

export interface Config {
	discord_token: string;
	telegram_token: string;
	giphy_token: string;
	zoom: {
		jid: string;
		token: string;
		client_id: string;
		client_secret: string;
	}

	url: string;

	api_port: number;

	hello_msg: string;

	default_perms: string[];

	version: string;

	users: {
		user: string;
		perms: string[];
	}[];

	data_since: {
		commands: {
			[key: string]: {
				num_uses: number;
				last_used: number;
			};
		}

		num_messages: number;
		num_commands_used: number;
		
		last_message_time: number;
		last_command_time: number;
	}
}

export function write_default_config(): void  {
	var config = {
		discord_token: "",
		giphy_token: "",
		telegram_token: "",
		zoom: {
			jid: "",
			token: "",
			client_id: "",
			client_secret: ""
		},
		api_port: 5051,
		url: "http://glowman554.duckdns.org/",
		hello_msg: "Hello %user% my name is NudelBot and I'm happy to meet you 👍!\nThe person who programs me does this mainly in his free time so don't expect too much from me 🤪!\nI'm mainly made to have fun 👾!\nYou can find more information about me here: %url% 😼.",
		default_perms: [],
		version: "0.0.1",
		users: [],
		data_since: {
			commands: {},
			last_command_time: 0,
			last_message_time: 0,
			num_commands_used: 0,
			num_messages: 0
		}
	} as Config;

	writeFileSync("./config.json", JSON.stringify(config, null, 4));
}

export function since_message() {
	(get_config_cache().file_cache as Config).data_since.last_message_time = Date.now();
	(get_config_cache().file_cache as Config).data_since.num_messages++;

	writeFileSync("./config.json", JSON.stringify(get_config_cache().file_cache, null, 4));
}

export function since_command(c: Command) {
	(get_config_cache().file_cache as Config).data_since.last_command_time = Date.now();
	(get_config_cache().file_cache as Config).data_since.num_commands_used++;

	if ((get_config_cache().file_cache as Config).data_since.commands[c.name] == undefined) {
		(get_config_cache().file_cache as Config).data_since.commands[c.name] = {
			num_uses: 1,
			last_used: Date.now()
		};
	} else {
		(get_config_cache().file_cache as Config).data_since.commands[c.name].num_uses++;
		(get_config_cache().file_cache as Config).data_since.commands[c.name].last_used = Date.now();
	}

	writeFileSync("./config.json", JSON.stringify(get_config_cache().file_cache, null, 4));
}

export function export_configs() {
	// find every json file in the current directory and subdirectories
	var files = sync("**/*.json", {
		nodir: true
	}) as string[];

	files = files.filter((v) => {
		return v.includes("config") && !v.includes("node_modules");
	});

	var configs = {} as {
		[key: string]: object;
	};

	for (let file of files) {
		log("config", `Exporting config from ${file}`);
		try {
			configs[file] = JSON.parse(readFileSync(file).toString());
		} catch (e: any) {
			log("config", `Failed to export config from ${file}`);
		}
	}

	return configs;
}

export function import_configs(configs: {
	[key: string]: object;
}) {
	for (let file in configs) {
		log("config", `Importing config to ${file}`);
		try {
			writeFileSync(file, JSON.stringify(configs[file], null, 4));
		} catch (e: any) {
			log("config", `Failed to import config to ${file}`);
		}
	}
}