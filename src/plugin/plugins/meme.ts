import download from "download";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandResponse } from "../../command/command";
import { empty, fail, get_command_manager } from "../../global";
import { log } from "../../logger";
import { get_file_extension, random_id } from "../../utils";
import { Plugin } from "../plugin";

export interface MemeRequest {
	postLink: string;
	subreddit: string;
	title: string;
	url: string;
	nsfw: boolean;
	spoiler: boolean;
	author: string;
	ups: number;
	preview: string[];
}

var old_urls: string[] = [];

export default {
	name: "meme",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("meme", "See memes!", "Use '#meme [count?]' to see memes!", "meme 5",{
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					if (event.interface.args.length == 0) {
						event.interface.args.push("1");
					} else {
						return fail;
					}
				}


				if (10 < parseInt(event.interface.args[0])) {
					return {
						is_response: true,
						response: "You want too many memes get help."
					};
				} else {
					for (let i = 0; i < parseInt(event.interface.args[0]); i++) {
						var meme = await (await fetch("https://meme-api.herokuapp.com/gimme")).json() as MemeRequest;

						if (get_file_extension(meme.url) == ".gif" || old_urls.indexOf(meme.url) != -1) {
							log("meme", "Skipping gif or duplicate url: " + meme.url);
							i--;
							continue;
						}

						old_urls.push(meme.url);

						var id = random_id() + get_file_extension(meme.url);
						await download(meme.url, "./tmp/", {
							filename: id,
						});

						await event.interface.send_picture_message("./tmp/" + id);
					}
				}

				return empty;
			}
		}, undefined));
	},

	reload() {

	}
} as Plugin;