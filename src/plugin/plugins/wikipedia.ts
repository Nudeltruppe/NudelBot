// Generated by https://quicktype.io

import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { fail, get_command_manager } from "../../global";
import { Plugin } from "../plugin";

export interface WikipediaResult {
	type:               string;
	title:              string;
	displaytitle:       string;
	namespace:          Namespace;
	wikibase_item:      string;
	titles:             Titles;
	pageid:             number;
	thumbnail:          Originalimage;
	originalimage:      Originalimage;
	lang:               string;
	dir:                string;
	revision:           string;
	tid:                string;
	timestamp:          string;
	description:        string;
	description_source: string;
	content_urls:       ContentUrls;
	extract:            string;
	extract_html:       string;
}

export interface ContentUrls {
	desktop: Desktop;
	mobile:  Desktop;
}

export interface Desktop {
	page:      string;
	revisions: string;
	edit:      string;
	talk:      string;
}

export interface Namespace {
	id:   number;
	text: string;
}

export interface Originalimage {
	source: string;
	width:  number;
	height: number;
}

export interface Titles {
	canonical:  string;
	normalized: string;
	display:    string;
}

export default {
	name: "wikipedia",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("wikipedia", "Search wikipedia!", "Use '#wikipedia [what]' to search wikipedia!\n\nExample: \n#wikipedia minecraft", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1) {
					return fail;
				}

				var text = await (await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + event.interface.args.join(" "))).json() as WikipediaResult;

				return {
					is_response: true,
					response: text.extract
				};
			}
		} as CommandExecutor, undefined));
	},

	reload() {

	}
} as Plugin;