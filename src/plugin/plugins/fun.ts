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
import { do_filter } from "./runner";

function ensure_rick_roll_downloaded() {
	if (!existsSync("./res/rick_roll.mp3")) {
		log("fun", "Downloading rick_roll.mp3...");
		execSync("youtube-dl -x --audio-format mp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ -o ./res/rick_roll.mp3", { stdio: "inherit" });
	}
}

export default {
	name: "fun",
	version: "0.0.1",

	load() {
		ensure_rick_roll_downloaded();

		get_command_manager().add_command(new Command("coinflip", "Flip a coin!", "Use '#coinflip' to flip a coin!", {
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

		get_command_manager().add_command(new Command("commit", "Get a random commit message!", "Use '#commit' to get a random commit message!", {
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

		get_command_manager().add_command(new Command("fact", "Get a useless fact!", "Use '#fact' to get a random and useless fact!", {
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

		get_command_manager().add_command(new Command("joke", "Get a joke!", "Use '#joke' to get a bad joke!", {
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

		get_command_manager().add_command(new Command("sticker", "Make a sticker from an url or picture or download telegram sticker packs!", "Use '#sticker [what]' convert a url / picture into a sticker!\nYou can send a picture yourself ot quote a message with a sticker!\n\nExample: \n#sticker https://losmejores.top/imagenes/ffmpeg.png", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length == 1) {
					if (event.interface.args[0].startsWith("http")) {
						if (event.interface.args[0].startsWith("https://t.me/addstickers")) {
							writeFileSync("./tmp/env", (get_config_cache().file_cache as Config).telegram_token);
							do_filter(event.interface.args[0]);

							execSync("echo '" + event.interface.args[0] + "\\n\\n' | python3 -m tstickers", {
								cwd: "./tmp/",
								stdio: "inherit"
							});

							var name = event.interface.args[0].replace("https://t.me/addstickers/", "").toLowerCase();

							readdirSync("./tmp/downloads/" + name + "/webp/").forEach(file => {
								event.interface.send_sticker_message("./tmp/downloads/" + name + "/webp/" + file);
							});

							return empty;
						}

						var file_id = random_id() + get_file_extension(event.interface.args[0]);
						await download(event.interface.args[0], "./tmp/", {
							filename: file_id
						});
						await event.interface.send_sticker_message("./tmp/" + file_id);

						return empty;
					}
				}

				if (event.interface.files?.length != 0 && event.interface.files != undefined) {
					await event.interface.send_sticker_message(event.interface.files[0]);

					return empty;
				}

				return fail;
			},
			subsystems: ["whatsapp", "telegram", "web"]
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("youtube", "Download a youtube video!", "Use '#youtube [url]' to download a youtube video!\n\nExample: \n#youtube https://www.youtube.com/watch?v=YwlJZ91zEjo\n#youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ mp3", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1 || event.interface.args.length > 2) {
					return fail;
				}

				if (!/^(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/gm.test(event.interface.args[0])) {
					throw new Error("Not a valid url!");
				} else {
					do_filter(event.interface.args[0]);

					var id = random_id();
					await event.interface.send_message("Note: Downloading youtube videos takes some time. So please give me enough time.");


					if (event.interface.args.length == 2 && event.interface.args[1] == "mp3") {
						var extra_args = "-x --audio-format mp3";
						exec(`youtube-dl ${extra_args} ` + event.interface.args[0] + " -o ./tmp/" + id + ".mp3 > ./tmp/ytdl.log", (error, stdout, stderr) => {
							readdirSync("./tmp/").forEach(element => {
								if (element.indexOf(id) != -1) {
									event.interface.send_audio_message("./tmp/" + element);
								}
							});
						});
					} else {
						exec(`youtube-dl ` + event.interface.args[0] + " -o ./tmp/" + id + ".mp4 > ./tmp/ytdl.log", (error, stdout, stderr) => {
							//fs.writeFileSync("./tmp/" + id + ".log", error + stdout + stderr);
				
							readdirSync("./tmp/").forEach(element => {
								if (element.indexOf(id) != -1) {
									event.interface.send_message("Your video is ready: " + (get_config_cache().file_cache as Config).url + "files/" + add_host_file("./tmp/" + element));
								}
								//event.send_message(element);
							});
				
						});
					}
				}

				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("rickroll", "Rick roll somebody!", "Use '#rickroll [chanel_id]' to rick roll somebody! (Join a voice chat in discord and use that command!)", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				
				var channel = (await (event.subsystem as DiscordSubsystem).client.channels.fetch(event.interface.args[0]));
				if (channel.type != "voice") {
					return fail;
				} else {
					var connection = await (channel as VoiceChannel).join();
					connection.play("./res/rick_roll.mp3").on("finish", () => {
						connection.disconnect()
					});
				}

				return empty;
			},

			subsystems: ["discord"]
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("play", "Play a a youtube video in a vc!", "Use '#play [url]' to play a youtube video in a vc!", {
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

		get_command_manager().add_command(new Command("year", "See how much of this year is left!", "Use '#year' to see how much of this year is left!", {
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

		get_command_manager().add_command(new Command("nick", "Set the bot nickname!", "Use '#nick [what]' to set the bot nickname!", {
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

		get_command_manager().add_command(new Command("tts", "Send a tts message!", "Use '#tts [what]' to send a tts message!", {
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

		get_command_manager().add_command(new Command("magic", "Send something magic!", "Use '#magic' to send something magic!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				return {
					is_response: true,
					response: `<a:thonksun_1_1:877219954041180180><a:thonksun_1_2:877219953961480212><a:thonksun_1_3:877219947246399579><a:thonksun_1_4:877219940569067622>\n<a:thonksun_2_1:877219947653267536><a:thonksun_2_2:877219952044703775><a:thonksun_2_3:877219952380239943><a:thonksun_2_4:877219949964304384>`
				}
			},

			subsystems: ["discord"]
		} as CommandExecutor, undefined));
	},

	reload() {

	}
} as Plugin;