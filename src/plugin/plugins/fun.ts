import { execSync } from "child_process";
import { getAudioUrl } from 'google-tts-api';
import { Message, VoiceChannel } from "discord.js";
import download from "download";
import { existsSync, readdirSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { exec } from "node:child_process";
import ytdl from "ytdl-core";
import { add_host_file } from "../../api/express";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { Config } from "../../config";
import { empty, fail, get_command_manager, get_config_cache, get_subsystems } from "../../global";
import { log } from "../../logger";
import { DiscordSubsystem } from "../../subsystem/discord/discord";
import { get_file_extension, random_id, secondsToDhms } from "../../utils";
import { Plugin } from "../plugin";

export default {
	name: "fun",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("coinflip", "Flip a coin!", "Use '#coinflip' to flip a coin!", "coinflip", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				const chance = Math.random();

				return {
					is_response: true,
					response: chance >= 0.5 ? "You've landed on heads!" : "You've landed on tails!"
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("commit", "Get a random commit message!", "Use '#commit' to get a random commit message!", "commit", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var msg = await (await fetch("http://whatthecommit.com/index.txt")).text();

				return {
					is_response: true,
					response:  msg
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("fact", "Get a useless fact!", "Use '#fact' to get a random and useless fact!", "fact", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var msg = await (await fetch("https://uselessfacts.jsph.pl/random.txt?language=en")).text();

				return {
					is_response: true,
					response:  msg.split("\n")[0]
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("joke", "Get a joke!", "Use '#joke' to get a bad joke!", "joke", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var msg = await (await fetch("https://icanhazdadjoke.com/", {
					headers: {
						"Accept": "text/plain"
					}
				})).text();

				return {
					is_response: true,
					response:  msg.split("\n")[0]
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("rickroll", "Rick roll somebody!", "Use '#rickroll [chanel_id]' to rick roll somebody! (Join a voice chat in discord and use that command!)", "rickroll test", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				var url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
				var channel = await ((await (event.subsystem as DiscordSubsystem).client.channels.fetch(event.interface.args[0])) as VoiceChannel).join();

				if (channel) {
					var stream = ytdl(url, { filter: "audioonly" });
					var dispatcher = channel.play(stream, { seek: 0, volume: true });

					dispatcher.on("end", () => {
						channel?.disconnect();
					});

					(event.interface.message_raw_object as Message).react("🛑");
					(event.interface.message_raw_object as Message).awaitReactions((reaction, user) => {
						if (reaction._emoji.name == "🛑" && !reaction.me) {
							dispatcher.destroy();
							stream.destroy();
							channel?.disconnect();
						}

						return reaction._emoji.name == "🛑" && !reaction.me;
					});
						
				}

				return empty;
			},

			subsystems: ["discord"]
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("play", "Play a a youtube video in a vc!", "Use '#play [url]' to play a youtube video in a vc!", "play https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				if (!/^(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/gm.test(event.interface.args[0])) {
					throw new Error("Not a valid url!");
				}

				var url = event.interface.args[0];

				if ((event.interface.message_raw_object as Message).member?.voice.channel) {
					var channel = await (event.interface.message_raw_object as Message).member?.voice.channel?.join();
					if (channel) {
						var stream = ytdl(url, { filter: "audioonly" });
						var dispatcher = channel.play(stream, { seek: 0, volume: true });

						dispatcher.on("end", () => {
							channel?.disconnect();
						});

						(event.interface.message_raw_object as Message).react("🛑");
						(event.interface.message_raw_object as Message).awaitReactions((reaction, user) => {
							if (reaction._emoji.name == "🛑" && !reaction.me) {
								dispatcher.destroy();
								stream.destroy();
								channel?.disconnect();
							}

							return reaction._emoji.name == "🛑" && !reaction.me;
						});
						
					}

				} else {
					return {
						is_response: true,
						response: "Please join a voice channel first!"
					};
				}

				return empty;
			},

			subsystems: ["discord"]
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("year", "See how much of this year is left!", "Use '#year' to see how much of this year is left!", "year", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				const now = new Date();
				const next = new Date(now);
				next.setFullYear(now.getFullYear() + 1);
				next.setHours(0, 0, 0, 0);
				next.setMonth(0, 1);

				return {
					is_response: true,
					response: `There are ${secondsToDhms((next.getTime() - now.getTime()) / 1000)} left of this year!`
				}
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("nick", "Set the bot nickname!", "Use '#nick [what]' to set the bot nickname!", "nick NudelBot", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1) {
					return fail;
				}

				(event.interface.message_raw_object as Message).guild?.members.resolve((event.subsystem as DiscordSubsystem).client?.user?.id as string)?.setNickname(event.interface.args.join(" "));

				return {
					is_response: true,
					response: `Nickname set to ${event.interface.args.join(" ")}`
				}
			}
		} as CommandExecutor, "nick"));

		get_command_manager().add_command(new Command("tts", "Send a tts message!", "Use '#tts [what]' to send a tts message!", "tts hey", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (!(!(event.interface.args.length < 1) || Boolean(event.interface.quote_text))) {
					return fail;
				}

				var text = event.interface.quote_text ? event.interface.quote_text : event.interface.args.join(" ");

				var id = random_id() + ".mp3";
				var url = getAudioUrl(text);

				await download(url, "./tmp/", {
					filename: id
				});

				await event.interface.send_audio_message("./tmp/" + id);

				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("thonksun", "Thonksun!", "Use '#thonksun' to thonksun!", "thonksun", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				return {
					is_response: true,
					response: "<a:thonksun_1_1:877219954041180180><a:thonksun_1_2:877219953961480212><a:thonksun_1_3:877219947246399579><a:thonksun_1_4:877219940569067622>\n<a:thonksun_2_1:877219947653267536><a:thonksun_2_2:877219952044703775><a:thonksun_2_3:877219952380239943><a:thonksun_2_4:877219949964304384>"
				}
			},
			subsystems: ["discord"]
		} as CommandExecutor, undefined));

	},

	reload() {

	}
} as Plugin;
