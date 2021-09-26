import download from "download";
import { FurryBot } from "furry-wrapper";
import { APIResponse, Options } from "furry-wrapper/dist/@types/Base";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { check_permission } from "../../command/permission";
import { empty, fail, get_command_manager, user_agent } from "../../global";
import { get_file_extension, random_id } from "../../utils";
import { Plugin } from "../plugin";

export default {
	name: "animals",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("cat", "Cuteness awaits!", "Use '#cat' to see a cute cat!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var cat = await (await fetch("https://aws.random.cat/meow")).json() as {
					file: string;
				};

				var file_id = random_id() + get_file_extension(cat.file);

				await download(cat.file, "./tmp/", {
					filename: file_id
				});

				await event.interface.send_picture_message("./tmp/" + file_id);

				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("dog", "Cuteness awaits!", "Use '#dog' to see a cute dog!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}
				
				
				var dog = await (await fetch("https://dog.ceo/api/breeds/image/random")).json() as {
					message: string;
					status: string;
				};

				var file_id = random_id() + get_file_extension(dog.message);

				await download(dog.message, "./tmp/", {
					filename: file_id
				});

				await event.interface.send_picture_message("./tmp/" + file_id);

				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("fox", "Cuteness awaits!", "Use '#fox' to see a cute fox!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}
				
				
				var fox = await (await fetch("https://randomfox.ca/floof/?ref=apilist.fun")).json() as {
					image: string;
					link: string;
				};

				var file_id = random_id() + get_file_extension(fox.image);

				await download(fox.image, "./tmp/", {
					filename: file_id
				});

				await event.interface.send_picture_message("./tmp/" + file_id);

				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("furry", "See something furry related!", "Use '#furry [what?/list?]' to see something furry related!\n\nExample: \n#furry hug", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					if (event.interface.args.length == 0) {
						event.interface.args.push("fursuit");
					} else {
						return fail;
					}
				}

				var known_methods: { [func: string]: (options?: Options|undefined) => APIResponse } = {
					"boop": FurryBot.furry.boop,
					"cuddle": FurryBot.furry.cuddle,
					"fursuit": FurryBot.furry.fursuit,
					"hold": FurryBot.furry.hold,
					"howl": FurryBot.furry.howl,
					"hug": FurryBot.furry.hug,
					"kiss": FurryBot.furry.kiss,
					"lick": FurryBot.furry.lick,
					"propose": FurryBot.furry.propose
				};

				if (event.interface.args[0] == "list") {
					return {
						is_response: true,
						response: "I know: " + Object.keys(known_methods).join(", ") + "!"
					};
				}

				if (Object.keys(known_methods).indexOf(event.interface.args[0]) == -1) {
					return {
						is_response: true,
						response: "I only know: " + Object.keys(known_methods).join(", ") + "!"
					};
				}

				var furry = (await known_methods[event.interface.args[0]]({ agent: user_agent })) as {
					artists: string[];
					sources: string[];
					width: number;
					height: number;
					url: string;
					type: string;
					name: string;
					id: string;
					shortURL: string;
					ext: string;
					size: number;
					reportURL: string;
				};

				var file_id = random_id() + get_file_extension(furry.url);

				await download(furry.url, "./tmp/", {
					filename: file_id
				});

				await event.interface.send_picture_message("./tmp/" + file_id);
				
				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("yiff", "See yiff!", "Use '#yiff [what?/list?]' to see yiff!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					if (event.interface.args.length == 0) {
						event.interface.args.push("straight");
					} else {
						return fail;
					}
				}


				var known_methods: { [func: string]: (options?: Options|undefined) => APIResponse } = {
					"straight": FurryBot.yiff.straight,
					"gay": FurryBot.yiff.gay,
					"gynomorph": FurryBot.yiff.gynomorph,
					"lesbian": FurryBot.yiff.lesbian
				};

				if (event.interface.args[0] == "list") {
					return {
						is_response: true,
						response: "I know: " + Object.keys(known_methods).join(", ") + "!"
					};
				}

				if (Object.keys(known_methods).indexOf(event.interface.args[0]) == -1) {
					return {
						is_response: true,
						response: "I only know: " + Object.keys(known_methods).join(", ") + "!"
					};
				}

				var furry = (await known_methods[event.interface.args[0]]({ agent: user_agent })) as {
					artists: string[];
					sources: string[];
					width: number;
					height: number;
					url: string;
					type: string;
					name: string;
					id: string;
					shortURL: string;
					ext: string;
					size: number;
					reportURL: string;
				};

				var file_id = random_id() + get_file_extension(furry.url);

				await download(furry.url, "./tmp/", {
					filename: file_id
				});

				await event.interface.send_picture_message("./tmp/" + file_id);
				
				return empty;
			}
		} as CommandExecutor, "is_18"));
	},

	reload() {

	}
} as Plugin;
