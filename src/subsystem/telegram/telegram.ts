import download from "download";
import fetch from "node-fetch";
import { Telegraf } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";
import { CommandEvent, CommandEventInterface } from "../../command/command";
import { Config } from "../../config";
import { get_command_manager, get_config_cache, set_last_command_event } from "../../global";
import { log } from "../../logger";
import { get_file_extension, random_id } from "../../utils";

export interface Result {
	file_id: string;
	file_unique_id: string;
	file_size: number;
	file_path: string;
}

export interface TelegramGetFileResult {
	ok: boolean;
	result: Result;
}

export class TelegramSubsystem implements Subsystem {
	client: Telegraf;
	name = "telegram";

	constructor() {
		this.client = new Telegraf((get_config_cache().file_cache as Config).telegram_token);
	}
	
	async unload(): Promise<void> {
		await this.client.stop();
	}

	load(): boolean {

		this.client.on("text", async (ctx) => {
			log("telegram", "[" + ctx.from.username + "/" + ctx.from.id + "] " + ctx.message.text);

			if (ctx.message.text.startsWith(get_command_manager().prefix)) {
				var files: string[] = [];

				if (ctx.message.reply_to_message) {
					if ((ctx.message.reply_to_message as Message.PhotoMessage).photo) {
						for (var i in (ctx.message.reply_to_message as Message.PhotoMessage).photo) {
							var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.PhotoMessage).photo[i].file_id)).json() as TelegramGetFileResult;							
							var id = random_id() + get_file_extension(data.result.file_path);

							await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
								filename: id
							})
							files.push("./tmp/" + id);
						}
					}

					if ((ctx.message.reply_to_message as Message.DocumentMessage).document) {
						var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.DocumentMessage).document.file_id)).json() as TelegramGetFileResult;							
						var id = random_id() + get_file_extension(data.result.file_path);

						await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
							filename: id
						})
						files.push("./tmp/" + id);
					}
				}

				var mentions: string[] = [];

				for (let i in ctx.message.entities) {
					if (ctx.message.entities[parseInt(i)].type == "mention") {

						var substr = ctx.message.text.substring(ctx.message.entities[parseInt(i)].offset, ctx.message.entities[parseInt(i)].offset + ctx.message.entities[parseInt(i)].length);
						mentions.push(substr);
					}
				}

				var command_interface = {
					message_raw_object: ctx,

					message: ctx.message.text,
					command: ctx.message.text.split(" ")[0],

					user: ctx.from.username ? "@" + ctx.from.username : ctx.from.id.toString(),
					chat_id: ctx.message.chat.id.toString(),

					url_name: ctx.message.chat.type == "private" ? "@me" : ctx.message.chat.title,

					async send_message(msg: string): Promise<void> {
						if (Boolean(msg)) {
							if (msg.indexOf("%bold%") == -1 && msg.indexOf("%italic%") == -1 && msg.indexOf("%code%") == -1) {
								await ctx.reply(msg);
							} else {
								msg = msg.replace(/%bold%/g, "*");
								msg = msg.replace(/%italic%/g, "_");
								msg = msg.replace(/%code%/g, "`");
		
								await ctx.replyWithMarkdown(msg);
							}
						}
					},

					async send_picture_message(file: string): Promise<void> {
						await ctx.replyWithPhoto({ source: file });
					},

					async send_video_message(file: string): Promise<void> {
						await ctx.replyWithVideo({ source: file });
					},

					async send_sticker_message(file: string): Promise<void> {
						await ctx.replyWithSticker({ source: file });
					},

					async send_audio_message(file: string): Promise<void> {
						await ctx.replyWithAudio({ source: file });
					},

					async set_bot_status(status: string): Promise<void> {
						try {
							await ctx.setChatDescription(status);
						} catch (e) {
						}
					},

					files: files,
					mentions: mentions,

					quote_text: ctx.message.reply_to_message ? (ctx.message.reply_to_message as Message.TextMessage).text : undefined,

					args: ctx.message.text.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			} else {
				for (let i in ctx.message.entities) {
					if (ctx.message.entities[parseInt(i)].type == "mention") {

						var substr = ctx.message.text.substring(ctx.message.entities[parseInt(i)].offset, ctx.message.entities[parseInt(i)].offset + ctx.message.entities[parseInt(i)].length);
						if (substr == "@" + ctx.botInfo.username) {
							var message = (get_config_cache().file_cache as Config).hello_msg;
							message = message.replace(/%bold%/g, "*");
							message = message.replace(/%italic%/g, "_");
							message = message.replace(/%code%/g, "`");
							message = message.replace(/%url%/g, (get_config_cache().file_cache as Config).url);
							message = message.replace(/%user%/g, String(ctx.message.from.username));

							ctx.replyWithMarkdown(message);
							return;
						}
					}
				}
			}
		});

		this.client.on("photo", async (ctx) => {
			log("telegram", "[" + ctx.from.username + "/" + ctx.from.id + "] " + ctx.message.caption);

			if (ctx.message.caption?.startsWith(get_command_manager().prefix)) {
				var files: string[] = [];

				for (var i in ctx.message.photo) {
					var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + ctx.message.photo[i].file_id)).json() as TelegramGetFileResult;							
					var id = random_id() + get_file_extension(data.result.file_path);

					await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
						filename: id
					})
					files.push("./tmp/" + id);
				}

				if (ctx.message.reply_to_message) {
					if ((ctx.message.reply_to_message as Message.PhotoMessage).photo) {
						for (var i in (ctx.message.reply_to_message as Message.PhotoMessage).photo) {
							var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.PhotoMessage).photo[i].file_id)).json() as TelegramGetFileResult;							
							var id = random_id() + get_file_extension(data.result.file_path);

							await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
								filename: id
							})
							files.push("./tmp/" + id);
						}
					}

					if ((ctx.message.reply_to_message as Message.DocumentMessage).document) {
						var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.DocumentMessage).document.file_id)).json() as TelegramGetFileResult;							
						var id = random_id() + get_file_extension(data.result.file_path);

						await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
							filename: id
						})
						files.push("./tmp/" + id);
					}
				}

				var command_interface = {
					message_raw_object: ctx,

					message: ctx.message.caption,
					command: ctx.message.caption.split(" ")[0],

					user: ctx.from.username ? "@" + ctx.from.username : ctx.from.id.toString(),
					chat_id: ctx.message.chat.id.toString(),

					url_name: ctx.message.chat.type == "private" ? "@me" : ctx.message.chat.title,

					async send_message(msg: string): Promise<void> {
						if (Boolean(msg)) {
							if (msg.indexOf("%bold%") == -1 && msg.indexOf("%italic%") == -1 && msg.indexOf("%code%") == -1) {
								await ctx.reply(msg);
							} else {
								msg = msg.replace(/%bold%/g, "*");
								msg = msg.replace(/%italic%/g, "_");
								msg = msg.replace(/%code%/g, "`");
		
								await ctx.replyWithMarkdown(msg);
							}
						}
					},

					async send_picture_message(file: string): Promise<void> {
						await ctx.replyWithPhoto({ source: file });
					},

					async send_video_message(file: string): Promise<void> {
						await ctx.replyWithVideo({ source: file });
					},

					async send_sticker_message(file: string): Promise<void> {
						await ctx.replyWithSticker({ source: file });
					},

					async send_audio_message(file: string): Promise<void> {
						await ctx.replyWithAudio({ source: file });
					},
					async set_bot_status(status: string): Promise<void> {
						try {
							await ctx.setChatDescription(status);
						} catch (e) {
						}
					},

					files: files,
					mentions: undefined,

					quote_text: ctx.message.reply_to_message ? (ctx.message.reply_to_message as Message.TextMessage).text : undefined,

					args: ctx.message.caption.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			}
		});

		this.client.on("document", async (ctx) => {
			log("telegram", "[" + ctx.from.username + "/" + ctx.from.id + "] " + ctx.message.caption);

			if (ctx.message.caption?.startsWith(get_command_manager().prefix)) {
				var files: string[] = [];

				var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + ctx.message.document.file_id)).json() as TelegramGetFileResult;							
				var id = random_id() + get_file_extension(data.result.file_path);

				await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
					filename: id
				});

				files.push("./tmp/" + id);

				if (ctx.message.reply_to_message) {
					if ((ctx.message.reply_to_message as Message.PhotoMessage).photo) {
						for (var i in (ctx.message.reply_to_message as Message.PhotoMessage).photo) {
							var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.PhotoMessage).photo[i].file_id)).json() as TelegramGetFileResult;							
							var id = random_id() + get_file_extension(data.result.file_path);

							await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
								filename: id
							})
							files.push("./tmp/" + id);
						}
					}

					if ((ctx.message.reply_to_message as Message.DocumentMessage).document) {
						var data = await (await fetch("https://api.telegram.org/bot" + (get_config_cache().file_cache as Config).telegram_token + "/getFile?file_id=" + (ctx.message.reply_to_message as Message.DocumentMessage).document.file_id)).json() as TelegramGetFileResult;							
						var id = random_id() + get_file_extension(data.result.file_path);

						await download(`https://api.telegram.org/file/bot${(get_config_cache().file_cache as Config).telegram_token}/${data.result.file_path}`, "./tmp/", {
							filename: id
						})
						files.push("./tmp/" + id);
					}
				}

				var command_interface = {
					message_raw_object: ctx,

					message: ctx.message.caption,
					command: ctx.message.caption.split(" ")[0],

					user: ctx.from.username ? "@" + ctx.from.username : ctx.from.id.toString(),
					chat_id: ctx.message.chat.id.toString(),


					async send_message(msg: string): Promise<void> {
						if (Boolean(msg)) {
							if (msg.indexOf("%bold%") == -1 && msg.indexOf("%italic%") == -1 && msg.indexOf("%code%") == -1) {
								await ctx.reply(msg);
							} else {
								msg = msg.replace(/%bold%/g, "*");
								msg = msg.replace(/%italic%/g, "_");
								msg = msg.replace(/%code%/g, "`");
		
								await ctx.replyWithMarkdown(msg);
							}
						}
					},

					async send_picture_message(file: string): Promise<void> {
						await ctx.replyWithPhoto({ source: file });
					},

					async send_video_message(file: string): Promise<void> {
						await ctx.replyWithVideo({ source: file });
					},

					async send_sticker_message(file: string): Promise<void> {
						await ctx.replyWithSticker({ source: file });
					},

					async send_audio_message(file: string): Promise<void> {
						await ctx.replyWithAudio({ source: file });
					},

					async set_bot_status(status: string): Promise<void> {
						try {
							await ctx.setChatDescription(status);
						} catch (e) {
						}
					},

					files: files,
					mentions: undefined,

					quote_text: ctx.message.reply_to_message ? (ctx.message.reply_to_message as Message.TextMessage).text : undefined,

					args: ctx.message.caption.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			}
		});

		this.client.launch().then(() => {
			log("telegram", "Telegram subsystem loaded")
		});

		return true;
	}
	
}