import { existsSync, FSWatcher, mkdirSync, readdirSync, watch } from "fs";
import { log } from "../logger";
import { Plugin } from "./plugin";

export interface WatchEntry {
	name: string;
	watch: FSWatcher;
	plugin: Plugin;
}

export class PluginLoader {
	watches: WatchEntry[] = [];
	constructor() {
		if (!existsSync(__dirname + "/plugins")) {
			mkdirSync(__dirname + "/plugins");
		}

		log("plugin", "Loading plugins...");

		readdirSync(__dirname + "/plugins").forEach(name => {
			if (name.indexOf("noload") == -1) {
				this.load(name);
			}
		});
	}

	unload(name: string): void  {
		var path = require.resolve(name);
		//log("plugin", `Unloading plugin ${path}`);

		if (require.cache[path]) {
			log("plugin", `Deleting plugin from cache ${path}`);
			delete require.cache[path];
		}
	}

	load(name: string): Plugin|null {
		try {
			log("plugin", `Loading plugin ${name}`);

			try {
				this.unload(__dirname + "/plugins/" + name);
			} catch (e) {
				log("plugin", `Plugin ${name} not found! Not unloading!`);
			}

			const plugin = require(__dirname + "/plugins/" + name).default as Plugin;

			if (plugin?.load == undefined || plugin == undefined || plugin.noload == true) {
				log("plugin", `Plugin ${name} has no load function or doesn't want to be loaded!`);
			} else {
				plugin.load();
			}

			log("plugin", `Plugin ${plugin.name}@${plugin.version} loaded!`);

			if (this.watches.find(x => x.name == name) === undefined) {
				log("plugin", `Adding watch for ${name}`);
				var watch_ = watch(__dirname + "/plugins/" + name, () => {
					log("plugin", `Plugin ${name} changed, reloading...`);

					var watch_entry = this.watches.find(x => x.name == name);

					watch_entry?.plugin.reload();

					this.load(name);
				});

				this.watches.push({
					name: name,
					watch: watch_,
					plugin: plugin
				} as WatchEntry);
			} else {
				this.watches[this.watches.findIndex(x => x.name == name)].plugin = plugin;
			}

			return plugin;
		} catch (e) {
			log("plugin", `Plugin ${name} failed to load!`);
			log("plugin", e);
			return null;
		}
	}

}