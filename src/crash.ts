import { existsSync, mkdirSync, writeFileSync } from "fs";
import { CommandEvent } from "./command/command";
import { get_last_command_event, get_plugin_loader, set_last_command_event } from "./global";
import { log } from "./logger";
import { WatchEntry } from "./plugin/loader";
import { random_id } from "./utils";

export interface CrashDump {
	stack: string;
	event: CommandEvent|null;
	plugins: WatchEntry[];
}

function dump_crash(error: Error, event: CommandEvent|null): string {
	try {
		const dump = {
			stack: error.stack,
			event: null,
			plugins: get_plugin_loader().watches
		} as CrashDump;

		var crash_id = random_id();

		log("crash", `Something terrible happens D: saving crash dump with id ${crash_id}\n${error.stack}`);

		if (!existsSync("./crash")) {
			mkdirSync("./crash");
		}

		writeFileSync("./crash/" + crash_id + ".json", JSON.stringify(dump, null, 4));
	} catch (e) {
		log("crash", `Wow ok the crash handler did crash ._. ` + e);
		log("error", String(error));
		return "crash handler crashed";
	}

	return crash_id;
}

export function load_crash_handler(): void  {
	process.on('uncaughtException', (err) => {
		var last_event = get_last_command_event();
		const crash_id = dump_crash(err, last_event);

		if (last_event !== null && last_event != undefined) {
			last_event.interface.send_message("OMG something terrible happened D:\nThe crash id is " + crash_id + "\n" + err);
			set_last_command_event(null);
		}
	});
}