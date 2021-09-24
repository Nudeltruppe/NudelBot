import { existsSync, mkdirSync } from "fs";
import { FileCache } from "./cache";
import { CommandManager } from "./command/command";
import { write_default_config } from "./config";
import { load_crash_handler } from "./crash";
import { load_express_api } from "./api/express";
import { get_subsystems, set_command_manager, set_config_cache, set_plugin_loader, set_starttime } from "./global";
import { PluginLoader } from "./plugin/loader";
import { DiscordSubsystem } from "./subsystem/discord/discord";
import { load_websocket_api } from "./api/websocket";
import { log } from "./logger";
import { load_auth_api } from "./api/authentication";
import { WebSubsystem } from "./subsystem/web/web";
import { TelegramSubsystem } from "./subsystem/telegram/telegram";
import { ZoomSubsystem } from "./subsystem/zoom/zoom";
import { compile_changelogs, load_changelog_api } from "./api/changelog";

function main() {
	log("main", "Welcome NudelBot in the world of the internet!!\n\n");

	if (!existsSync("./config.json")) {
		log("main", "config.json not found, creating one...");
		write_default_config();
		process.exit(0);
	}

	if (!existsSync("./config")) {
		log("main", "config folder not found, creating one...");
		mkdirSync("./config");
	}

	if (!existsSync("./tmp")) {
		log("main", "tmp folder not found, creating one...");
		mkdirSync("./tmp");
	}

	if (!existsSync("./res")) {
		log("main", "res folder not found, creating one...");
		mkdirSync("./res");
	}

	load_crash_handler();

	set_config_cache(new FileCache("./config.json"));
	set_command_manager(new CommandManager("#"));

	load_express_api();
	load_websocket_api();
	load_auth_api();
	load_changelog_api();
	
	compile_changelogs();
	
	set_plugin_loader(new PluginLoader());
	set_starttime(new Date().getTime());

	// Start the bot
	var discord_subsystem = new DiscordSubsystem();
	discord_subsystem.load();
	get_subsystems().push(discord_subsystem);

	var web_subsystem = new WebSubsystem();
	web_subsystem.load();
	get_subsystems().push(web_subsystem);

	// var telegram_subsystem = new TelegramSubsystem();
	// telegram_subsystem.load();
	// get_subsystems().push(telegram_subsystem);

	// var zoom_subsystem = new ZoomSubsystem();
	// zoom_subsystem.load();
	// get_subsystems().push(zoom_subsystem);
}

main();
