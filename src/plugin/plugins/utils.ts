import { readdirSync, readFileSync, rmSync } from "fs";
import { existsSync } from "node:fs";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { Config } from "../../config";
import { CrashDump } from "../../crash";
import { empty, fail, get_command_manager, get_config_cache, get_plugin_loader, get_starttime, get_subsystems } from "../../global";
import { check_permission, get_roles, push_role, remove_role } from "../../command/permission";
import { random_id, secondsToDhms } from "../../utils";
import { Plugin } from "../plugin";
import fetch from "node-fetch";
import { log } from "../../logger";
import { execSync } from "child_process";

export default {
	name: "utils",
	version: "0.0.1",

	load() {
		get_command_manager().add_command(new Command("info", "Get information from a crash id!", "Use '#info [crash_id]' to see information about a crash!\n\nExample: \n#info vX06OoCJBw", "info sdjghjd5793", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				if (!existsSync("./crash/" + event.interface.args[0] + ".json")) {
					return fail;
				}

				const crash_file = JSON.parse(readFileSync("./crash/" + event.interface.args[0] + ".json").toString()) as CrashDump;

				var text = "%code%" + crash_file.stack + "%code%\n\nLoaded plugins:";

				crash_file.plugins.forEach((plugin) => {
					text += "\n" + plugin.plugin.name + "@" + plugin.plugin.version;
				});

				return {
					is_response: true,
					response: text
				};
			}
		} as CommandExecutor, "crash"));

		
		get_command_manager().add_command(new Command("load", "Load a plugin!", "Use #load [plugin] to load the plugin!", "load test_plug", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 1) {
					return fail;
				}

				var plugin = get_plugin_loader().load(event.interface.args[0]);

				if (!plugin) {
					return fail;
				}

				return {
					is_response: true,
					response: `Successfully loaded plugin ${plugin.name}@${plugin.version}!`
				};
			}
		} as CommandExecutor, "plugin"));

		get_command_manager().add_command(new Command("ping", "Ping the bot!", "Use '#ping' to ping the bot!", "ping",{
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				return {
					is_response: true,
					response: "Pong!"
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("say", "Say something!", "Use '#say [what]' to say something!\n\nExample: \n#say Hello world", "say Hello!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (!(!(event.interface.args.length < 1) || Boolean(event.interface.quote_text))) {
					return fail;
				}

				var text = event.interface.quote_text ? event.interface.quote_text : event.interface.args.join(" ");

				return {
					is_response: true,
					response: text
				};
			}
		} as CommandExecutor, undefined));

		/*get_command_manager().add_command(new Command("uptime", "See the bot uptime!", "Use '#uptime' to see the uptime of the bot!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				return {
					is_response: true,
					response: "Uptime: " + secondsToDhms((new Date().getTime() / 1000) - (get_starttime()) / 1000)
				};
			}
		} as CommandExecutor, undefined));*/

		get_command_manager().add_command(new Command("version", "Get the bot version!", "Use '#version' to get the bot version!", "version",{
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var text = "";

				get_plugin_loader().watches.forEach((plugin) => {
					text += "\n" + plugin.plugin.name + "@" + plugin.plugin.version;
				});

				return {
					is_response: true,
					response: `NudelBot@${execSync("git rev-parse --short HEAD").toString().replace("\n", "")}\n\nPlugins: ${text}`
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("role", "Manage roles!", "Use '#role [list, add, remove]' to manage roles! (Admin only)\n\nExample: \n#role list @somebody\n#role add @somebody eval\n#role remove @somebody eval", "role add @somebody", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 2) {
					return fail;
				}

				switch (event.interface.args[0]) {
					case "add":
						if (event.interface.args.length != 3) {
							return fail;
						}

						let user = event.interface.mentions;
						let role = event.interface.args[2];

						if (user == undefined) {
							return fail;
						}

						push_role(user[0], role);

						return {
							is_response: true,
							response: `Successfully added role ${role} to ${event.interface.args[1]}!`
						};
					
					case "list":
						if (event.interface.args.length != 2) {
							return fail;
						}

						let user2 = event.interface.mentions;

						if (user2 == undefined) {
							return fail;
						}

						let roles = get_roles(user2[0]);

						return {
							is_response: true,
							response: `${event.interface.args[1]} has the following roles: ${roles.join(", ")}`
						};

					case "remove":
						if (event.interface.args.length != 3) {
							return fail;
						}

						let user3 = event.interface.mentions;
						let role2 = event.interface.args[2];

						if (user3 == undefined) {
							return fail;
						}

						remove_role(user3[0], role2);

						return {
							is_response: true,
							response: `Successfully removed role ${role2} from ${event.interface.args[1]}!`
						};
				
					default:
						return fail;
				}
			}
		} as CommandExecutor, "role"));

		get_command_manager().add_command(new Command("status", "Set the bot status!", "Use '#status [what]' to set the bot status!", "#status playing help",{
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1) {
					return fail;
				}

				await event.interface.set_bot_status(event.interface.args.join(" "));

				return {
					is_response: true,
					response: `Setting status to '${event.interface.args.join(" ")}'`
				};
			},
			subsystems: ["discord", "whatsapp", "web"]
		} as CommandExecutor, "status"));

		get_command_manager().add_command(new Command("reset-status", "Reset the bot status!", "Use '#reset-status' to reset the bot status to the default!", "reset-status", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				await event.interface.set_bot_status(`${get_command_manager().prefix}help`);

				return {
					is_response: true,
					response: "Status reset!"
				};
			},
			subsystems: ["discord", "whatsapp", "web"]
		} as CommandExecutor, "status"));


		get_command_manager().add_command(new Command("suggest", "Suggest a feature!", "Use '#suggest [feature]' to suggest a feature!", "suggest test-feature", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1) {
					return fail;
				}

				log("suggestion", event.interface.user + ": " + event.interface.args.join(" "));

				return {
					is_response: true,
					response: "Thanks for the suggestion!"
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("im_18", "Say that you are 18+!", "Use '#im_18' to set your age to 18+!", "im_18", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				if (check_permission(event.interface.user, "is_18")) {
					return fail;
				}

				push_role(event.interface.user, "is_18");

				return {
					is_response: true,
					response: "You are now in the 18+ role!"
				};
			}
		} as CommandExecutor, undefined));

		get_command_manager().add_command(new Command("clear_tmp", "Clear the temporary files!", "Use '#clear_tmp' to clear the temporary files!", "clear_tmp", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 0) {
					return fail;
				}

				var dir = readdirSync("./tmp");
				dir.forEach(element => {
					log("utils", "Deleting element: " + element + "!");
					rmSync("./tmp/" + element, { recursive: true });
				});

				return {
					is_response: true,
					response: "Successfully cleared the temporary files!"
				};
			}
		} as CommandExecutor, "clear"));
	},


	reload() {

	}
} as Plugin;
