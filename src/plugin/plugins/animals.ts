import { TextChannel, User } from "discord.js";
import download from "download";

// we need to patch furry-wrapper here because of a api change

require("fs").writeFileSync("node_modules/furry-wrapper/dist/furrybot.js", require("fs").readFileSync("node_modules/furry-wrapper/dist/furrybot.js").toString().replace(/https:\/\/yiff.rest\/v2\//g, "https://v2.yiff.rest/"));

import { FurryBot } from "furry-wrapper";
import { APIResponse, Options } from "furry-wrapper/dist/@types/Base";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { check_permission } from "../../command/permission";
import { empty, fail, get_command_manager, user_agent } from "../../global";
import { log } from "../../logger";
import { DiscordSubsystem } from "../../subsystem/discord/discord";
import { get_file_extension, random_id } from "../../utils";
import { Plugin } from "../plugin";

export default {
	name: "animals",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("cat", "Cuteness awaits!", "Use '#cat' to see a cute cat!", "cat", {
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

		get_command_manager().add_command(new Command("dog", "Cuteness awaits!", "Use '#dog' to see a cute dog!", "dog", {
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

		get_command_manager().add_command(new Command("fox", "Cuteness awaits!", "Use '#fox' to see a cute fox!", "fox", {
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

		get_command_manager().add_command(new Command("furry", "See something furry related!", "Use '#furry [what?/list?][count?]' to see something furry related!\n\nExample: \n#furry hug", "furry hug", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				var count = 1;
				if (event.interface.args.length != 1) {
					if (event.interface.args.length == 0) {
						event.interface.args.push("fursuit");
					} else if (event.interface.args.length == 2) {
						count = parseInt(event.interface.args[1]);
					} else {
						return fail;
					}
				}

				if (10 < count) {
					return {
						is_response: true,
						response: "I see you are a furry owo still get some help!"
					};
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

				for (let i = 0; i < count; i++) {
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

					try {
						await event.interface.send_picture_message("./tmp/" + file_id);
					} catch (e: any) {
						log("furry", "Failed to send picture message: " + e);
						i--;
					}
				}
				
				return empty;
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("furspam", "Spam the dm's with furs!", "Use '#furspam [count][@somebody]' to spam the chat with furs!\n\nExample: \n#furspam 10 @somebody", "furspam", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 2 || !event.interface.mentions || event.interface.mentions.length != 1) {
					return fail;
				}

				try {
					var user = await (event.subsystem as DiscordSubsystem).client.users.fetch(event.interface.mentions[0]);
				} catch (e: any) {
					return {
						is_response: true,
						response: "I can't find that user! (" + event.interface.mentions[0] + ")"
					}
				}

				if (!user.dmChannel) {
					await user.createDM();
					user = await (event.subsystem as DiscordSubsystem).client.users.fetch(event.interface.mentions[0]);
				}

				if (!user) {
					return {
						is_response: true,
						response: "I can't find that user or dm channel! (" + event.interface.mentions[0] + ")"
					}
				}

				if (!user.dmChannel) {
					return {
						is_response: true,
						response: "I can't find that user or dm channel! (" + event.interface.mentions[0] + ")"
					}
				}

				try {
					var channel = await (event.subsystem as DiscordSubsystem).client.channels.fetch(user.dmChannel.id) as TextChannel;
				} catch (e: any) {
					return {
						is_response: true,
						response: "I can't find that user's dm channel! (" + user.dmChannel.id + ")"
					}
				}

				if (!channel) {
					return fail;
				}

				event.interface.send_message("FURRY ATTACK!!!!");


				for (let i = 0; i < parseInt(event.interface.args[0]); i++) {
					try {
						var furry = (await FurryBot.furry.fursuit({ agent: user_agent })) as {
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

						try {
							await channel.send("", {
								files: ["./tmp/" + file_id]
							});
						} catch (e: any) {
							log("furry", "Failed to send picture message: " + e);
							i--;
						}
					} catch (e: any) {
						log("furry", "Failed to get furry: " + e);
						i--;
					}
				}

				return empty;
			},
			subsystems: ["discord"]
		} as CommandExecutor, "spam"));

		get_command_manager().add_command(new Command("yiff", "See yiff!", "Use '#yiff [what?/list?][count?]' to see yiff!", "yiff", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				var count = 1;
				if (event.interface.args.length != 1) {
					if (event.interface.args.length == 0) {
						event.interface.args.push("straight");
					} else if (event.interface.args.length == 2) {
						count = parseInt(event.interface.args[1]);
					} else {
						return fail;
					}
				}

				if (10 < count) {
					return {
						is_response: true,
						response: "You want too much yiff get help."
					};
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

				for (let i = 0; i < count; i++) {
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
	
					try {
						await event.interface.send_picture_message("./tmp/" + file_id);
					} catch (e: any) {
						log("furry", "Failed to send picture message: " + e);
						i--;
					}
				}


				
				return empty;
			}
		} as CommandExecutor, "is_18"));
	},

	reload() {

	}
} as Plugin;
