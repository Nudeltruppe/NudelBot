import { existsSync, readFileSync, writeFileSync } from "fs";
import { add_host_file } from "../../api/express";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { Config } from "../../config";
import { fail, get_command_manager, get_config_cache } from "../../global";
import { Plugin } from "../plugin";

interface UploadLimitList {
	[user: string]: number;
}

var upload_limit_list: UploadLimitList;

export default {
	name: "upload",
	version: "0.0.1",

	load() {
		if (existsSync("./config/upload_limit.json")) {
			upload_limit_list = JSON.parse(readFileSync("./config/upload_limit.json").toString()) as UploadLimitList;
		} else {
			upload_limit_list = {};
			writeFileSync("./config/upload_limit.json", JSON.stringify(upload_limit_list, null, 4));
		}

		get_command_manager().add_command(new Command("upload", "Upload a file!", "Use '#upload' to upload a file!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				if (event.interface.files?.length == 0 || event.interface.files == undefined) {
					return fail;
				}

				if (upload_limit_list[event.interface.user] == undefined) {
					upload_limit_list[event.interface.user] = 5;
					writeFileSync("./config/upload_limit.json", JSON.stringify(upload_limit_list, null, 4));
				} else {
					if (upload_limit_list[event.interface.user] == 0) {
						return {
							is_response: true,
							response: "You have no more upload left! Ask the bot owner to get more."
						};
					}
					upload_limit_list[event.interface.user]--;
					writeFileSync("./config/upload_limit.json", JSON.stringify(upload_limit_list, null, 4));
				}

				var text = "";
				
				for(let file of event.interface.files) {
					var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);
					text += `Your file is ready ad ${url}!\n`;
				}

				text += "\nYou have " + upload_limit_list[event.interface.user] + " uploads left!";

				return {
					is_response: true,
					response: text
				}
			},
			subsystems: ["telegram", "whatsapp", "discord"]
		} as CommandExecutor, undefined));
	},

	reload() {
	
	}
} as Plugin;