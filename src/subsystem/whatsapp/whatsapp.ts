import { writeFileSync } from "fs";
import { extension } from "mime-types";
import { generate } from "qrcode-terminal";
import { Client, Contact, MessageMedia } from "whatsapp-web.js";
import { CommandEvent, CommandEventInterface } from "../../command/command";
import { Config } from "../../config";
import { get_command_manager, get_config_cache, set_last_command_event } from "../../global";
import { log } from "../../logger";
import { get_file_extension, random_id } from "../../utils";

export class WhatsAppSubsystem implements Subsystem {
	client: Client;
	name = "whatsapp";

	constructor() {
		this.client = new Client({
			puppeteer: {
				headless: true,
				"args": [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-dev-shm-usage",
					"--disable-accelerated-2d-canvas",
					"--no-first-run",
					"--no-zygote",
					"--single-process",
					"--disable-gpu"
				]
			} as any,
			session: ((get_config_cache().file_cache as Config).whatsapp_session.WABrowserId != "") ? (get_config_cache().file_cache as Config).whatsapp_session : undefined
		});
	}
	async unload(): Promise<void> {
		await this.client.pupPage?.close();
		await this.client.pupBrowser?.close();
		await this.client.destroy();
	}

	load(): boolean {

		this.client.on("qr", qr => generate(qr, { small: true }));

		this.client.on("authenticated", session => {
			(get_config_cache().file_cache as Config).whatsapp_session = session;
			writeFileSync("./config.json", JSON.stringify(get_config_cache().file_cache as Config, null, 4));
		});

		this.client.on("ready", () => {
			log("whatsapp", "Whatsapp ready");
		});

		this.client.on("message", async message => {
			log("whatsapp", `[${message.from}] ${message.author ? "[" + message.author + "]" : ""} ${message.body}`);

			await this.client.sendSeen(message.from);

			if (message.body.startsWith(get_command_manager().prefix)) {
				var files: string[] = [];

				if (message.hasQuotedMsg) {
					var quote = await message.getQuotedMessage();
					if (quote.hasMedia) {
						var media = await quote.downloadMedia();
						var data = Buffer.from(media.data, "base64");

						var id = random_id() + (media.filename ? get_file_extension(media.filename as string) : ("." + extension(media.mimetype)));

						writeFileSync(`./tmp/${id}`, data);
						files.push(`./tmp/${id}`);
					}
				}

				if (message.hasMedia) {
					var media = await message.downloadMedia();
					var data = Buffer.from(media.data, "base64");

					var id = random_id() + (media.filename ? get_file_extension(media.filename as string) : ("." + extension(media.mimetype)));

					writeFileSync(`./tmp/${id}`, data);
					files.push(`./tmp/${id}`);
				}

				var command_interface = {
					message_raw_object: message,

					message: message.body,
					command: message.body.split(" ")[0],

					user: message.author ? message.author : message.from,
					chat_id: message.from,

					send_message: async (msg: string): Promise<void> => {
						msg = msg.replace(/%bold%/g, "*");
						msg = msg.replace(/%italic%/g, "_");
						msg = msg.replace(/%code%/g, "```");

						var mentions: Contact[] = [];

						for (let i in msg.split("@")) {
							if (parseInt(i) == 0) {
								continue; // first index isn't mention
							}
		
							var mention = msg.split("@")[i].split(" ")[0];
		
							if (isNaN(parseInt(mention)) || mention == "") {
								continue;
							}
							try {
								var contact = await this.client.getContactById(mention + "@c.us");
		
								mentions.push(contact);
							} catch (e) {
								log("whatsapp", `Error getting contact ${mention}`);
							}	
						}

						await this.client.sendMessage(message.from, msg, {
							mentions: mentions
						});
					},
					send_picture_message: async (file: string): Promise<void> => {
						await this.client.sendMessage(message.from, MessageMedia.fromFilePath(file));
					},
					send_video_message: async (file: string): Promise<void> => {
						await this.client.sendMessage(message.from, MessageMedia.fromFilePath(file));
					},
					send_sticker_message: async (file: string): Promise<void> => {
						await this.client.sendMessage(message.from, MessageMedia.fromFilePath(file), {
							sendMediaAsSticker: true
						});
					},
					send_audio_message: async (file: string): Promise<void> => {
						await this.client.sendMessage(message.from, MessageMedia.fromFilePath(file));
					},
					set_bot_status: async (status: string): Promise<void> => {
						await this.client.setStatus(status);
					},

					files: files,
					mentions: message.mentionedIds,

					quote_text: message.hasQuotedMsg ? (await message.getQuotedMessage()).body : undefined,

					args: message.body.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			} else {
				message.mentionedIds.every(async id => {
					if (id == message.to) {
						var msg = (get_config_cache().file_cache as Config).hello_msg;
						msg = msg.replace(/%bold%/g, "*");
						msg = msg.replace(/%italic%/g, "_");
						msg = msg.replace(/%code%/g, "```");
						msg = msg.replace(/%url%/g, (get_config_cache().file_cache as Config).url);
						msg = msg.replace(/%user%/g, (await message.getContact()).verifiedName as any);

						this.client.sendMessage(message.from, msg);
						return false;
					}
				});
			}
		});

		this.client.initialize();

		return true;
	}
	
}