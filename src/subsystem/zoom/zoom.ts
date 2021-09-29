import request from "request";
import { add_host_file } from "../../api/express";
import { CommandEvent, CommandEventInterface } from "../../command/command";
import { Config, since_message } from "../../config";
import { get_command_manager, get_config_cache, get_express, set_last_command_event } from "../../global";
import { log } from "../../logger";

export interface Payload {
	accountId: string;
	channelName: string;
	cmd: string;
	name: string;
	robotJid: string;
	timestamp: number;
	toJid: string;
	userId: string;
	userJid: string;
	userName: string;
}

export interface ZoomCommand {
	event: string;
	payload: Payload;
}

export interface ZoomToken {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
}

export class ZoomSubsystem implements Subsystem {
	name = "zoom";
	token = "";

	update_token_interval: NodeJS.Timer|undefined;

	load(): boolean {
		get_express().get("/zoom/auth", (req, res) => {
			res.redirect("https://zoom.us/launch/chat?jid=robot_" + (get_config_cache().file_cache as Config).zoom.jid);
		});

		get_express().post("/zoom/command", (req, res) => {
			if (req.query.token != (get_config_cache().file_cache as Config).zoom.token) {
				res.sendStatus(403);
				return;
			}

			var payload = (req.body as ZoomCommand).payload;

			log("zoom", `[${payload.toJid}] ${payload.cmd}`);

			since_message();

			if (payload.cmd.startsWith(get_command_manager().prefix)) {
				var command_interface = {
					message_raw_object: payload,

					message: payload.cmd,
					command: payload.cmd.split(" ")[0],

					user: payload.userJid,
					chat_id: payload.toJid,

					url_name: null,

					send_message: async (msg: string): Promise<void> => {
						if (Boolean(msg)) {
							msg = msg.replace(/%bold%/g, "");
							msg = msg.replace(/%italic%/g, "");
							msg = msg.replace(/%code%/g, "");
			
							await this.send_message(payload.toJid, payload.accountId, msg);
						}
					},

					send_picture_message: async (file: string): Promise<void> => {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);
						await this.send_media_message(payload.toJid, payload.accountId, url);
					},

					send_video_message: async (file: string): Promise<void> => {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);
						await this.send_media_message(payload.toJid, payload.accountId, url);
					},

					send_sticker_message: async (file: string): Promise<void> => {
						throw new Error("Zoom doesn't support stickers.");
					},

					send_audio_message: async (file: string): Promise<void> => {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);
						await this.send_media_message(payload.toJid, payload.accountId, url);
					},
					
					set_bot_status: async (status: string): Promise<void> => {
						throw new Error("Zoom doesn't support bot status.");
					},

					files: undefined,
					mentions: undefined,

					quote_text: undefined,

					args: payload.cmd.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, this);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, this);
			}
		});

		this.update_token_interval = setInterval(() => {
			this.update_token();
		}, 1000 * 60);

		this.update_token().then(() => {
			log("zoom", "Zoom ready!");
		});

		return true;
	}
	async unload(): Promise<void> {
		//throw new Error("Method not implemented.");
		if (this.update_token_interval) {
			clearInterval(this.update_token_interval);
			this.update_token_interval = undefined;
		}
	}
	
	update_token(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			request({
				url: "https://zoom.us/oauth/token?grant_type=client_credentials",
				method: "POST",
				headers: {
					"Authorization": "Basic " + Buffer.from(`${(get_config_cache().file_cache as Config).zoom.client_id}:${(get_config_cache().file_cache as Config).zoom.client_secret}`).toString("base64")
				}
			},  (error, httpResponse, body) => {
				if (error) {
					log("zoom", `Error: ${error}`);
					reject(error);
				} else {
					var token = JSON.parse(body) as ZoomToken;
					this.token = token.access_token;

					log("zoom", `Token updated.`);

					resolve();
				}
			});
		});
	}

	send_message(toJid: string, accountId: string, message: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			request({
				url: "https://api.zoom.us/v2/im/chat/messages",
				method: "POST",
				json: true,
				body: {
					"robot_jid": (get_config_cache().file_cache as Config).zoom.jid,
					"to_jid": toJid,
					"account_id": accountId,
					"content": {
						"head": {
							"text": "NudelBot"
						},
						"body": [{
							"type": "message",
							"text": message
						}]
					}
				},
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + this.token
				}
			}, (error, httpResponse, body) => {
				resolve();
			});	
		});
	}

	send_media_message(toJid: string, accountId: string, url: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			request({
				url: "https://api.zoom.us/v2/im/chat/messages",
				method: "POST",
				json: true,
				body: {
					"robot_jid": (get_config_cache().file_cache as Config).zoom.jid,
					"to_jid": toJid,
					"account_id": accountId,
					"content": {
						"head": {
							"text": "NudelBot"
						},
						"body": [{
							"type": "attachments",
							"img_url": url,
							"resource_url": url,
							"information": {
								"title": {
									"text": url.split("/")[url.split("/").length - 1]
								}
							}
						}]
					}
				},
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + this.token
				}
			}, (error, httpResponse, body) => {
				resolve();
			});	
		});
	}
}