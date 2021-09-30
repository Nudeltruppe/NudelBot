import { get_config_cache, get_plugin_loader, get_server, get_starttime, get_subsystems, get_ws_server } from "./global";
import { log } from "./logger";
import { secondsToDhms } from "./utils";

export async function do_soft_reload() {
	log("soft-reload", "Soft restarting...");
	log("soft-reload", "Removing all event listeners from process!! If a crash happens now you are fucked!");
	process.removeAllListeners();

	log("soft-reload", "Adding temporary crash handler!");
	process.on("uncaughtException", (err: Error) => {
		log("soft-reload", "Uncaught exception: " + err.message);
	});

	var uptime = get_starttime();
	log("soft-reload", "Uptime: " + secondsToDhms((new Date().getTime() / 1000) - (uptime / 1000)));

	log("soft-reload", "Unloading all subsystems!");
	for (let i of get_subsystems()) {
		try {
			log("soft-reload", "Unloading subsystem: " + i.name);
			await i.unload();
		} catch (err: any) {
			log("soft-reload", "Error unloading subsystem: " + err.message);
		}
	}

	log("soft-reload", "Unloading websocket and express server!");
	try {
		get_ws_server().close();
	} catch (err: any) {
		log("soft-reload", "Error unloading websocket server: " + err.message);
	}
	try {
		get_server().close();
	} catch (err: any) {
		log("soft-reload", "Error unloading express server: " + err.message);
	}

	log("soft-reload", "Unloading config!");
	try {
		get_config_cache().watch.close();
	} catch (err: any) {
		log("soft-reload", "Error unloading config cache: " + err.message);
	}

	log("soft-reload", "Unloading plugin loader!");
	get_plugin_loader().watches.forEach((watch) => {
		log("soft-reload", "Unloading plugin: " + watch.plugin.name);
		try {
			watch.plugin.reload();
			watch.watch.close();
		} catch (err: any) {
			log("soft-reload", "Error unloading plugin: " + err.message);
		}
	});

	log("soft-reload", "Deleting require cache!");
	for (var i in require.cache) {
		delete require.cache[i];
	}
	
	log("soft-reload", "Removing all event listeners from process (again)!! If a crash happens now you are fucked (again)!");
	process.removeAllListeners();

	log("soft-reload", "Restarting!");
	require("./index");

	require("./logger").log("soft-reload", "Resetting uptime to old one!");
	require("./global").set_starttime(uptime);

	require("./logger").log("soft-reload", "Soft restarted!");
}