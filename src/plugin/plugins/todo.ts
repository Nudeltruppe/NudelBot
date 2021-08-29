import { readFileSync, writeFileSync } from "fs";
import { existsSync } from "node:fs";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { fail, get_command_manager } from "../../global";
import { Plugin } from "../plugin";

interface TodoStore {
	[user: string]: string[];
}

var todo: TodoStore;

export default {
	name: "todo",
	version: "0.0.1",

	load() {
		if (existsSync("./config/todo.json")) {
			todo = JSON.parse(readFileSync("./config/todo.json").toString()) as TodoStore;
		} else {
			todo = {};
			writeFileSync("./config/todo.json", JSON.stringify(todo, null, 4));
		}

		get_command_manager().add_command(new Command("todo", "Manage your todo list!", "Use '#todo [add, remove, clear, list]' to manage your todo list!\n\nExample: \n#todo add something\n#todo remove 0\n#todo clear\n#todo list", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 1) {
					return fail;
				}

				var user = event.interface.user;

				if (!todo[user]) {
					todo[user] = [];
				}

				switch (event.interface.args.shift()) {
					case "add":
						if (event.interface.args.length < 1) {
							return fail;
						}

						todo[user].push(event.interface.args.join(" "));
						writeFileSync("./config/todo.json", JSON.stringify(todo, null, 4));
						break;
					
					case "remove":
						if (event.interface.args.length != 1) {
							return fail;
						}

						todo[user].splice(parseInt(event.interface.args[0]), 1);
						writeFileSync("./config/todo.json", JSON.stringify(todo, null, 4));
						break;
				
					case "clear":
						if (event.interface.args.length != 0) {
							return fail;
						}

						todo[user] = [];
						writeFileSync("./config/todo.json", JSON.stringify(todo, null, 4));
						break;
					
					case "list":
						if (event.interface.args.length != 0) {
							return fail;
						}

						var text = "Your todo list: \n";
						for (let i in todo[user]) {
							text += i + ": " + todo[user][i] + "\n";
						}

						return {
							is_response: true,
							response: text
						};
					
					default:
						return fail;
				}

				return {
					is_response: true,
					response: "Your todo list is now " + todo[user].length + " entry's long!"
				}
			}
		} as CommandExecutor, undefined));
	},

	reload() {

	}
} as Plugin;