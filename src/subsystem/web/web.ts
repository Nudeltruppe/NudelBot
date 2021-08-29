import WebSocket from "ws";
import { lookup_token } from "../../api/authentication";
import { add_host_file } from "../../api/express";
import { add_route, WsMessage, WsRoute } from "../../api/websocket";
import { CommandEvent, CommandEventInterface } from "../../command/command";
import { Config } from "../../config";
import { get_command_manager, get_config_cache, get_subsystems, set_last_command_event } from "../../global";
import { log } from "../../logger";

interface ShellExecuteRequest extends WsMessage {
	command: string;
	token: string;
}

interface ShellExecuteResponse extends WsMessage {
	result: string;
	type: WebMessageType;
}

enum WebMessageType {
	audio = "audio",
	image = "image",
	text = "text",
	video = "video",
	sticker = "sticker",
	title = "title"
}


export class WebSubsystem implements Subsystem {
	name = "web";
	async unload(): Promise<void> {
	}

	load(): boolean {
		add_route({
			route: "api/shell",
			executer: function(message: ShellExecuteRequest, socket: WebSocket) {
				var command_interface = {
					message_raw_object: message,

					message: message.command,
					command: message.command.split(" ")[0],

					user: lookup_token(message.token).user,
					chat_id: lookup_token(message.token).user,

					async send_message(msg: string): Promise<void> {
						if (Boolean(message)) {
							msg = msg.replace(/%bold%/g, "");
							msg = msg.replace(/%italic%/g, "");
							msg = msg.replace(/%code%/g, "");

							await socket.send(JSON.stringify({
								type: WebMessageType.text,
								result: msg,
								route: message.route
							} as ShellExecuteResponse));
						}
					},

					async send_picture_message(file: string): Promise<void> {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);

						await socket.send(JSON.stringify({
							type: WebMessageType.image,
							result: url,
							route: message.route
						} as ShellExecuteResponse));
					},

					async send_video_message(file: string): Promise<void> {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);

						await socket.send(JSON.stringify({
							type: WebMessageType.video,
							result: url,
							route: message.route
						} as ShellExecuteResponse));
					},

					async send_sticker_message(file: string): Promise<void> {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);

						await socket.send(JSON.stringify({
							type: WebMessageType.sticker,
							result: url,
							route: message.route
						} as ShellExecuteResponse));
					},

					async send_audio_message(file: string): Promise<void> {
						var url = (get_config_cache().file_cache as Config).url + "files/" + add_host_file(file);

						await socket.send(JSON.stringify({
							type: WebMessageType.audio,
							result: url,
							route: message.route
						} as ShellExecuteResponse));
					},

					set_bot_status: async (status: string): Promise<void> => {
						await socket.send(JSON.stringify({
							type: WebMessageType.title,
							result: status,
							route: message.route
						} as ShellExecuteResponse));
					},

					files: undefined,
					mentions: undefined,

					quote_text: undefined,

					args: message.command.split(" ")
				} as CommandEventInterface;

				var command_event = new CommandEvent(command_interface, get_subsystems().find(s => s.name === "web") as Subsystem);
				set_last_command_event(command_event);

				get_command_manager().on_command(command_event, get_subsystems().find(s => s.name === "web") as Subsystem);
				return Promise.resolve(message);
			}
		} as WsRoute);

		log("web", "Loaded");
		return true;
	}	
}