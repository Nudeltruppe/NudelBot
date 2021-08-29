import { ChildProcess, execSync, spawn } from "child_process";
import { Client, Message } from "discord.js";
import download from "download";
import { existsSync, mkdirSync } from "fs";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { fail, get_command_manager, get_subsystems } from "../../global";
import { log } from "../../logger";
import { DiscordSubsystem } from "../../subsystem/discord/discord";
import { Plugin } from "../plugin";

async function ensure_chatbot_installed() {
	if (!existsSync("./res/chatbot")) {
		mkdirSync("./res/chatbot");

		log("chatbot", "Downloading chatbot.jar...");
		await download("https://github.com/TheBot-core/chatbot/releases/download/1/chatbot.jar", "./res/chatbot", {
			filename: "chatbot.jar"
		});

		log("chatbot", "Downloading resources.zip...");
		await download("https://github.com/TheBot-core/chatbot/releases/download/1/resources.zip", "./res/chatbot", {
			filename: "chatbot.zip"
		});

		log("chatbot", "Extracting resources.zip...");
		execSync("mkdir ./res/chatbot/resources");
		execSync("unzip ./res/chatbot/chatbot.zip -d ./res/chatbot/resources");
	}
}

export default {
	name: "chatbot",
	version: "0.0.1",

	load() {
		ensure_chatbot_installed().then(async () => {
			try {
				var res = await (await fetch("http://localhost:5555/?chat=main&query=hi")).text();
				log("chatbot", "Chatbot response: " + res);
			} catch (e) {
				log("chatbot", "Launching chatbot.");

				spawn("java -jar " + process.cwd() + "/res/chatbot/chatbot.jar", {
					cwd: process.cwd() + "/res/chatbot/",
					stdio: "inherit",
					shell: true,
					detached: true
				});
			}
		});

		get_command_manager().add_command(new Command("b", "Talk to chatbot!", "Use '#b [what]' to talk to the chatbot!\n\nExample: \n#b Hi how is it going?", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (!(!(event.interface.args.length < 1) || Boolean(event.interface.quote_text))) {
					return fail;
				}

				var text = event.interface.quote_text ? event.interface.quote_text : event.interface.args.join(" ");

				var res = await (await fetch("http://localhost:5555/?chat=" + event.interface.chat_id +"&query=" + text)).text();

				return {
					is_response: true,
					response: res
				};
			}
		} as CommandExecutor, undefined));

		get_subsystems().forEach(subsystem => {
			if (subsystem.name == "discord") {
				var discord_subsystem = (subsystem as DiscordSubsystem);
				discord_subsystem.on("message", async (message: Message, client: Client) => {
					if ((message.channel as any).name != undefined) {
						if (((message.channel as any).name as string).indexOf("chatbot") != -1) {
							var res = await (await fetch("http://localhost:5555/?chat=" + message.channel.id +"&query=" + message.content)).text();
							message.channel.send(res);
						}
					}
				});
			}
			
		});
	},

	reload() {
		get_subsystems().forEach(subsystem => {
			if (subsystem.name == "discord") {
				var discord_subsystem = (subsystem as DiscordSubsystem);
				discord_subsystem.removeAllListeners();
			}
		});
	},
	noload: true
} as Plugin;
