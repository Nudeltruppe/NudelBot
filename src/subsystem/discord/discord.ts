import { Client, VoiceConnection } from "discord.js";
import download from "download";
import { EventEmitter } from "stream";
import { Command, CommandEvent, CommandEventInterface, CommandExecutor, CommandResponse } from "../../command/command";
import { Config } from "../../config";
import { empty, fail, get_command_manager, get_config_cache, set_last_command_event } from "../../global";
import { log } from "../../logger";
import { random_id } from "../../utils";
import { inject_crazy_bot, push_role } from "crazy-bot";

export class DiscordSubsystem extends EventEmitter implements Subsystem {
	client: Client;
	status_timer: NodeJS.Timer|undefined;
	name = "discord";

	status = `${get_command_manager().prefix}help`;

	constructor() {
		super();
		this.client = new Client();
	}

	async unload(): Promise<void> {
		await this.client.destroy();

		if (this.status_timer) {
			clearInterval(this.status_timer);
		}
	}

	load(): boolean {
		var token = (get_config_cache().file_cache as Config).discord_token;
		//log("discord", "Discord token: " + token);

		this.client.on("ready", () => {
			log("discord", "Discord ready");

			//this.client.user?.setActivity(`${get_command_manager().prefix}help`, { type: "LISTENING" });
			this.client.user?.setActivity(this.status, { type: "STREAMING", url: "https://www.twitch.tv/glowman434" });

			this.status_timer = setInterval(async () => {
				log("discord", "Updating status...");
				this.client.user?.setActivity(this.status, { type: "STREAMING", url: "https://www.twitch.tv/glowman434" });
			}, 1000 * 60);

			log("discord", "Injecting crazy bot into discord client!");
			inject_crazy_bot(this.client, "-", (get_config_cache().file_cache as Config).giphy_token);

			get_command_manager().add_command(new Command("im_owner", "Tell crazy bot that you are a owner!", "Use '#im_owner' to tell crazy bot that you are a owner!", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (event.interface.args.length != 0) {
						return fail;
					}

					push_role(event.interface.user, "owner");
					return {
						is_response: true,
						response: "You are now a owner!"
					};
				}
			} as CommandExecutor, "im_owner"));
		});

		this.client.on("message", async (msg) => {
			if (msg.author.bot) {
				return;
			}

			this.emit("message", msg, this.client);

			log("discord", "[" + msg.author.username + "/" + msg.author.id + "] " + msg.content);

			if (msg.content.startsWith(get_command_manager().prefix)) {
				var files: string[] = [];

				for (var i of msg.attachments.keyArray()) {
					if (msg.attachments.get(i) !== undefined) {
						var name = msg.attachments.get(i)?.name;
						var url = msg.attachments.get(i)?.url;
						if (name !== undefined && name !== null && url !== undefined && url !== null) {
							var file_id = random_id() + "." + name.split(".")[name.split(".").length - 1];
							await download(url, "./tmp/", {
								filename: file_id
							});
							files.push("./tmp/" + file_id);
						}
					}
				}

				if (msg.reference) {
					var attachments = (await msg.channel.messages.fetch(msg.reference.messageID as any)).attachments;
					for (var i of attachments.keyArray()) {
						if (attachments.get(i) !== undefined) {
							var name = attachments.get(i)?.name;
							var url = attachments.get(i)?.url;
							if (name !== undefined && name !== null && url !== undefined && url !== null) {
								var file_id = random_id() + "." + name.split(".")[name.split(".").length - 1];
								await download(url, "./tmp/", {
									filename: file_id
								});
								files.push("./tmp/" + file_id);
							}
						}
					}
				}

				var mentions: string[] = [];

				msg.mentions.users.forEach((mention) => {
					mentions.push(mention.id);
				});

				var command_interface = {
					message_raw_object: msg,

					message: msg.content,
					command: msg.content.split(" ")[0],

					user: msg.author.id,
					chat_id: msg.channel.id,

					send_message: async (message: string): Promise<void> => {
						if (Boolean(message)) {
							message = message.replace(/%bold%/g, "**");
							message = message.replace(/%italic%/g, "*");
							message = message.replace(/%code%/g, "`");
		
							await msg.channel.send(message);
						}
					},
					send_picture_message: async (file: string): Promise<void> => {
						await msg.channel.send("", {
							files: [file]
						});
					},
					send_video_message: async (file: string): Promise<void> => {
						await msg.channel.send("", {
							files: [file]
						});
					},
					send_sticker_message: async (file: string): Promise<void> => {
						throw new Error("Discord doesn't support stickers!");
					},
					send_audio_message: (file: string): Promise<void> => {
						return new Promise<void>(async (resolve, reject) => {
							var message_sent = await msg.channel.send("", {
								files: [file]
							});

							if (msg.member) {
								if (msg.member.voice.channel) {
									log("discord-voice", "Going to play file " + file + " in voice channel " + msg.member.voice.channel?.name);
									message_sent.edit("I see you are in a voice chat. Im going to play it there!");

									log("discord-voice", "Joining voice channel " + msg.member.voice.channel?.name);
									var connection_buffer = await msg.member.voice.channel?.join();

									if (connection_buffer) {
										connection_buffer.play(file).on("finish", async () => {
											log("discord-voice", "Finished playing audio file " + file);
											message_sent.edit("Im done playing!");

											if (connection_buffer) {
												log("discord-voice", "Leaving voice channel " + msg.member?.voice.channel?.name);
												connection_buffer.disconnect();
											}

											resolve();
										});
									}
								} else {
									resolve();
								}
							} else {
								resolve();
							}
						});
					},

					set_bot_status: async (status: string): Promise<void> => {
						this.client.user?.setActivity(status, { type: "STREAMING", url: "https://www.twitch.tv/glowman434" });
						this.status = status;
					},

					files: files,
					mentions: mentions,

					quote_text: msg.reference ? (await msg.channel.messages.fetch(msg.reference.messageID as any)).content : undefined,

					args: msg.content.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			} else {
				msg.mentions.users.every(element => {
					if (element.id === this.client.user?.id) {
						var message = (get_config_cache().file_cache as Config).hello_msg;
						message = message.replace(/%bold%/g, "**");
						message = message.replace(/%italic%/g, "*");
						message = message.replace(/%code%/g, "`");
						message = message.replace(/%url%/g, (get_config_cache().file_cache as Config).url);
						message = message.replace(/%user%/g, msg.author.username);
	
						msg.channel.send(message);
						return false;
					}
	
					return true;
				});
			}
		});

		this.client.login(token);

		return true;
	}
}
