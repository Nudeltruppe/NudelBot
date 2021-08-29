import fetch from "node-fetch";
import { log } from "../../logger";
import { BlockAt, ChatGet, Entity, Inventory, PathStatus, Slot } from "mc_server/src/types";
import { Plugin } from "../plugin";
import { fail, get_command_manager } from "../../global";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";

var is_running = false;
var callback_timer: NodeJS.Timer|undefined;
var api_host = "192.168.178.116";
var api_port = 8888;

async function api_call(api_host: string, api_port: number, api_method: string, params: string): Promise<object|null> {
	var result = await (await fetch(`http://${api_host}:${api_port}/${api_method}?${params}`)).json();
	return result;
}

async function api_call2(api_host: string, api_port: number, api_method: string, params: string): Promise<void> {
	await fetch(`http://${api_host}:${api_port}/${api_method}?${params}`);
}


async function apply_auto_totem(api_host: string, api_port: number) {
	var inventory = await api_call(api_host, api_port, "bot/inventory", "") as Inventory;
	if (inventory.slots[45]?.name !== "totem_of_undying") {
		var item = inventory.slots.find(slot => slot?.name === "totem_of_undying");
		if (item) {
			await api_call2(api_host, api_port, "function/equip", `item=totem_of_undying&hand=off-hand`);
		}
	}
}

async function apply_auto_pickaxe(api_host: string, api_port: number) {
	var current_item = await api_call(api_host, api_port, "function/equipped", "") as Slot|null;
	if (current_item && current_item.name.includes("pickaxe")) {
		return;
	}
	
	var inventory = await api_call(api_host, api_port, "bot/inventory", "") as Inventory;
	var item = inventory.slots.find(slot => slot?.name.includes("pickaxe"));
	if (item) {
		await api_call2(api_host, api_port, "function/equip", `item=${item.name}`);
	}
}

async function apply_pathing(api_host: string, api_port: number) {
	var path_status = await api_call(api_host, api_port, "user/path/status", "") as PathStatus;
	if (!path_status) {
		var player = await api_call(api_host, api_port, "bot/entity", "") as Entity;

		var new_position = {
			x: player.position.x + Math.floor(Math.random() * 100) - 50,
			y: player.position.y,
			z: player.position.z + Math.floor(Math.random() * 100) - 50
		};

		var block_at = await api_call(api_host, api_port, "function/blockat", `x=${new_position.x}&y=${new_position.y}&z=${new_position.z}`) as BlockAt;
		while (block_at.name != "air") {
			new_position.y++;
			if (new_position.y == 255) {
				log("minecraft", "Path invalid reason: y overflow");
				return;
			}

			block_at = await api_call(api_host, api_port, "function/blockat", `x=${new_position.x}&y=${new_position.y}&z=${new_position.z}`) as BlockAt;
		}

		new_position.y--;
		var block_at = await api_call(api_host, api_port, "function/blockat", `x=${new_position.x}&y=${new_position.y}&z=${new_position.z}`) as BlockAt;
		while (block_at.name == "air") {
			new_position.y--;
			if (new_position.y == 0) {
				log("minecraft", "Path invalid reason: y underflow");
				return;
			}

			block_at = await api_call(api_host, api_port, "function/blockat", `x=${new_position.x}&y=${new_position.y}&z=${new_position.z}`) as BlockAt;
		}

		var block_at = await api_call(api_host, api_port, "function/blockat", `x=${new_position.x}&y=${new_position.y}&z=${new_position.z}`) as BlockAt;
		if (block_at.name == "water") {
			log("minecraft", "Path invalid reason: water");
			return;
		}
		
		log("minecraft", "New position: " + new_position.x + " " + new_position.y + " " + new_position.z);

		await api_call2(api_host, api_port, "user/path/start", `x=${new_position.x}&y=${new_position.y + 1}&z=${new_position.z}`);
	}
}

async function send_help(api_host: string, api_port: number) {
	await api_call2(api_host, api_port, "user/chat/send", `message=I know: ${Object.keys(functions).join("," ).replace(/#/g, "%23")}`);
}

async function do_fish(api_host: string, api_port: number) {
	var inventory = await api_call(api_host, api_port, "bot/inventory", "") as Inventory;
	var item = inventory.slots.find(slot => slot?.name === "fishing_rod");
	if (item) {
		await api_call2(api_host, api_port, "function/equip", `item=fishing_rod&hand=off-hand`);

		var block = await api_call(api_host, api_port, "function/find_block", `matching=water`) as BlockAt|null;
		if (block) {
			await api_call2(api_host, api_port, "user/path/start", `x=${block.position.x}&y=${block.position.y}&z=${block.position.z}`);

			var is_running = true;
			while (is_running) {
				var path_status = await api_call(api_host, api_port, "user/path/status", "") as PathStatus;
				if (!path_status) {
					is_running = false;
				}

				await new Promise(resolve => setTimeout(resolve, 1000));
			}

			await api_call2(api_host, api_port, "function/lookat", `x=${block.position.x}&y=${block.position.y}&z=${block.position.z}`);
			await api_call2(api_host, api_port, "function/fish", ``);
		}
	}
}

var functions: {
	[name: string]: (api_host: string, api_port: number) => Promise<void>;
} = {
	"totem": apply_auto_totem,
	"pickaxe": apply_auto_pickaxe,
	"pathing": apply_pathing,
	"fish": do_fish,
	"help": send_help
}

async function main_loop() {
	if (is_running) {
		log("minecraft", "Looks like the server is overloaded!");
		return;
	}


	is_running = true;

	try {
	var chat_message = await api_call(api_host, api_port, "user/chat/get", "") as ChatGet|null;
	} catch (e) {
		log("minecraft", "Error: " + e);
		if (callback_timer) {
			clearInterval(callback_timer);
			callback_timer = undefined;
		}
		return;
	}

	if (chat_message) {
		log("minecraft", "Received chat message: " + chat_message.message + " from " + chat_message.username);

		if (functions[chat_message.message]) {
			await functions[chat_message.message](api_host, api_port).catch(e => {
				log("minecraft", "Error calling function: " + e);
				if (callback_timer) {
					clearInterval(callback_timer);
					callback_timer = undefined;
				}
			});
		} else {
			var res = await (await fetch("http://localhost:5555/?chat=mc&query=" + chat_message.message)).text();
			log("minecraft", "Received response: " + res);
			await api_call2(api_host, api_port, "user/chat/send", `message=${res}`);
		}
	}

	is_running = false;
}

export default {
	name: "minecraft",
	version: "0.0.1",

	load() {
		//callback_timer = setInterval(main_loop, 1000);

		get_command_manager().add_command(new Command("mc-connect", "Connect to a mc_server instance!", "Use '#mc-connect [url][port]' to connect to a mc_server instance", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 2) {
					return fail;
				}

				if (callback_timer) {
					return {
						is_response: true,
						response: "Already connected to a server!"
					}
				}

				try {
					api_host = event.interface.args[0];
					api_port = parseInt(event.interface.args[1]);

					if (isNaN(api_port)) {
						return fail;
					}

					await fetch(`http://${api_host}:${api_port}/`);

					log("minecraft", "Connected to " + api_host + ":" + api_port);

					callback_timer = setInterval(main_loop, 1000);

					return {
						is_response: true,
						response: "Connected to " + api_host + ":" + api_port
					};
				} catch (e) {
					log("minecraft", "Error connecting to " + api_host + ":" + api_port + ": " + e);
					return fail;
				}
			}
		} as CommandExecutor, "mc"));

		get_command_manager().add_command(new Command("mc-disconnect", "Disconnect from a mc_server instance!", "Use '#mc-disconnect' to disconnect from a mc_server instance", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				if (!callback_timer) {
					return {
						is_response: true,
						response: "Not connected to a server!"
					}
				}

				clearInterval(callback_timer);
				callback_timer = undefined;

				return {
					is_response: true,
					response: "Disconnected from " + api_host + ":" + api_port
				};
			}
		} as CommandExecutor, "mc"));

		get_command_manager().add_command(new Command("mc", "Send commands to the bot!", "Use '#mc [command]' to send a command to the minecraft bot!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				if (!callback_timer) {
					return {
						is_response: true,
						response: "Not connected to a server!"
					}
				}

				if (functions[event.interface.args[0]]) {
					await functions[event.interface.args[0]](api_host, api_port).catch(e => {
						log("minecraft", "Error calling function: " + e);
						if (callback_timer) {
							clearInterval(callback_timer);
							callback_timer = undefined;
						}
					});
				} 

				return {
					is_response: true,
					response: "Sending " + event.interface.args[0] + " to " + api_host + ":" + api_port
				};
			}
		} as CommandExecutor, "mc"));
	},

	reload() {
		if (callback_timer) {
			clearInterval(callback_timer);
			callback_timer = undefined;
		}
	}
} as Plugin;