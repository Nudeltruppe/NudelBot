import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { load_auth_api, lookup_token, lookup_user } from "./api/authentication";
import { load_express_api } from "./api/express";
import { ConnectionSocket, load_websocket_api } from "./api/websocket";
import { FileCache } from "./cache";
import { CommandManager } from "./command/command";
import { Config, export_configs, import_configs } from "./config";
import { get_config_cache, set_command_manager, set_config_cache } from "./global";
import { log } from "./logger";

function half_load() {
	// load enough stuff to use general config stuff
	set_config_cache(new FileCache("./config.json"));
	set_command_manager(new CommandManager("#"));

	load_express_api();
	load_websocket_api();
	load_auth_api();
}

if (process.argv.length != 4) {
	console.log("Usage: node config_manager.js [import/export/pull/push][file/url]");
	process.exit(1);
}

switch (process.argv[2]) {
	case "import":
		{
			const file = process.argv[3];
			log("config_manager", `Importing config from ${file}`);

			if (file.startsWith("http")) {
				log("config_manager", "Downloading config from URL");
				fetch(file).then((res) => res.json()).then((json) => {
					import_configs(json);
				});
			} else {
				import_configs(JSON.parse(readFileSync(file).toString()));
			}
		}
		break;

	case "export":
		{
			const file = process.argv[3];
			log("config_manager", `Exporting config to ${file}`);

			writeFileSync(file, JSON.stringify(export_configs(), null, 4));
		}
		break;
	
	case "pull":
		{
			half_load();
			var user = (get_config_cache().file_cache as Config).users.find((u) => u.perms.includes("status")) as Config["users"][0];
			var token = lookup_user(user.user);

			var s = new ConnectionSocket("wss://nudel-production.up.railway.app/", token);
			s.initialize().then(() => {
				s.socket_call("api/pull", {}).then((res: any) => {
					if (process.argv[3] == ".") {
						import_configs(res.data);
					} else {
						writeFileSync(process.argv[3], JSON.stringify(res.data, null, 4));
					}
					process.exit(0);
				});
			});
		}
		break;
	
	case "push":
		{
			half_load();
			var user = (get_config_cache().file_cache as Config).users.find((u) => u.perms.includes("status")) as Config["users"][0];
			var token = lookup_user(user.user);

			var s = new ConnectionSocket("wss://nudel-production.up.railway.app/", token);
			s.initialize().then(() => {
				s.socket_call("api/push", {
					data: process.argv[3] != "." ? JSON.parse(readFileSync(process.argv[3]).toString()) : export_configs()
				}).then((res: any) => {
					s.socket_call("api/soft-reload", {});
					process.exit(0);
				});
			});
		}
		break;

	default:
		log("config_manager", "Unknown command: " + process.argv[2]);
		break;
}