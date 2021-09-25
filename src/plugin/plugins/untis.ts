import { Message, Role, TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import WebUntis from "webuntis";
import WebSocket from "ws";
import { AuthenticationRequest, lookup_token } from "../../api/authentication";
import { add_route, WsMessage, WsRoute } from "../../api/websocket";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { empty, fail, get_command_manager, get_subsystems } from "../../global";
import { log } from "../../logger";
import { DiscordSubsystem } from "../../subsystem/discord/discord";
import { Plugin } from "../plugin";

interface UntisAuth {
	username: string;
	password: string;
}

interface UntisAuthStore {
	[key: string]: UntisAuth;
}

interface GeneralUntisConfig {
	guild: string;
	channel: string;
	message: string;
	role: string;
	school: string;
	weburl: string;
}

interface UntisDonateRequest extends WsMessage, AuthenticationRequest {
	username: string;
	password: string;
	error?: string;
}

// Generated by https://quicktype.io

export interface UntisHomeworks {
	records:   Record[];
	homeworks: Homework[];
	teachers:  Teacher[];
	lessons:   Lesson[];
}

export interface Homework {
	id:          number;
	lessonId:    number;
	date:        number;
	dueDate:     number;
	text:        string;
	remark:      string;
	completed:   boolean;
	attachments: any[];
}

export interface Lesson {
	id:         number;
	subject:    string;
	lessonType: string;
}

export interface Record {
	homeworkId: number;
	teacherId:  number;
	elementIds: number[];
}

export interface Teacher {
	id:   number;
	name: string;
}


var untis_auth_store: UntisAuthStore;
var untis_config: GeneralUntisConfig;
var update_interval: NodeJS.Timeout;

async function fetch_homework(): Promise<string> {
	var homework = {} as UntisHomeworks;

	for (let x of Object.keys(untis_auth_store)) {
		var untis = new WebUntis(untis_config.school, untis_auth_store[x].username, untis_auth_store[x].password, untis_config.weburl);

		log("untis", "Trying to authenticate with " + untis_auth_store[x].username + " credentials ...");

		try {
			await untis.login();

			homework =  {
				...homework,
				...await untis.getHomeWorksFor(new Date(), new Date(new Date().setDate(new Date().getDate() + 7)))
			};

			await untis.logout();

			log("untis", "Authentication successful!");
		} catch (e: any) {
			log("untis", "Error while authenticating with untis: " + e);
			delete untis_auth_store[x];
			writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
		}
	}

	var homework_string = "";

	for (let x of homework.homeworks) {
		var subject = homework.lessons.find(lesson => lesson.id == x.lessonId)?.subject;
		var due_date = WebUntis.convertUntisDate(x.dueDate).toLocaleDateString();

		
		homework_string += `**${subject}**: ${x.text} muss bis zum \`${due_date}\` erledigt sein!\n`;
	}

	if (homework_string == "") {
		homework_string = "Keine Aufgaben für heute!";
	}

	return homework_string;
}

export default {
	name: "untis",
	version: "0.0.1",

	async load() {
		if (!existsSync("./config/untis.json")) {
			log("untis", "No untis.json found, creating one ...");
			untis_auth_store = {
			} as UntisAuthStore;

			writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
		}

		if (!existsSync("./config/untis_config.json")) {
			log("untis", "No untis_config.json found, creating one ...");
			untis_config = {
				channel: "",
				message: "",
				guild: "",
				role: "",
				school: "GSZ Balingen",
				weburl: "neilo.webuntis.com"
			} as GeneralUntisConfig;

			writeFileSync("./config/untis_config.json", JSON.stringify(untis_config, null, 4));
			process.exit(0);
		}

		untis_auth_store = JSON.parse(readFileSync("./config/untis.json").toString()) as UntisAuthStore;
		untis_config = JSON.parse(readFileSync("./config/untis_config.json").toString()) as GeneralUntisConfig;

		var channel: TextChannel;
		var message: Message;

		var subsystem: DiscordSubsystem = get_subsystems().find(subsystem => subsystem.name == "discord") as DiscordSubsystem;

		while (subsystem == null) {
			log("untis", "Discord not ready yet, waiting ...");
			await new Promise(resolve => setTimeout(resolve, 1000));
			subsystem = get_subsystems().find(subsystem => subsystem.name == "discord") as DiscordSubsystem;
		}

		if (untis_config.channel != "" && untis_config.message == "") {
			channel = await subsystem.client.channels.fetch(untis_config.channel) as TextChannel;
			message = await channel.send("test");
			untis_config.message = message.id;
			writeFileSync("./config/untis_config.json", JSON.stringify(untis_config, null, 4));
		} else {
			channel = await subsystem.client.channels.fetch(untis_config.channel) as TextChannel;
			message = await channel.messages.fetch(untis_config.message);
		}

		message.edit("Fetching data...");
		message.edit(await fetch_homework());

		update_interval = setInterval(async () => {
			log("untis", "Fetching data...");
			message.edit("Fetching data...");
			message.edit(await fetch_homework());
		}, 1000 * 60 * 60);
	
		get_command_manager().add_command(new Command("donate", "Donate your untis credentials.", "Use '#donate [username] [password]' to donate your untis credentials.\nKeep in mind more untis credentials from different groups and courses mean better and more accurate data.\nMake sure to donate your credentials in private", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length != 2) {
					return fail;
				}

				if (event.interface.url_name != null) {
					if ((event.interface.url_name).includes("@me") != true) {
						return {
							is_response: true,
							response: "Please make sure to #donate in private chat for data security reasons!"
						}
					}
				}

				var username = event.interface.args[0];
				var password = event.interface.args[1];

				try {
					var test_untis = new WebUntis(untis_config.school, username, password, untis_config.weburl);
					await test_untis.login();
					await test_untis.logout();

					try {
						var guild = await subsystem.client.guilds.fetch(untis_config.guild);
						var user = await guild.members.fetch(event.interface.user);
						var role = await guild.roles.fetch(untis_config.role) as Role;

						user.roles.add(role);
					} catch (e: any) {
						log("untis", "Error while adding role: " + e);
					}


				} catch (e: any) {
					return {
						is_response: true,
						response: "Login failed: " + e
					};
				}

				untis_auth_store[event.interface.user] = {
					password: password,
					username: username,
				};

				writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));

				return {
					is_response: true,
					response: "Thanks for donating!"
				};
			}
		} as CommandExecutor, undefined));

		add_route({
			route: "untis/donate",
			executer: async function(message: UntisDonateRequest, socket: WebSocket): Promise<WsMessage> {
				try {
					var test_untis = new WebUntis(untis_config.school, message.username, message.password, untis_config.weburl);
					await test_untis.login();
					await test_untis.logout();

					var user = lookup_token(message.token);
					if (user == null) {
						message.error = "Invalid token";
					} else {
						untis_auth_store[user.user] = {
							password: message.password,
							username: message.username,
						};

						try {
							var guild = await subsystem.client.guilds.fetch(untis_config.guild);
							var _user = await guild.members.fetch(user.user);
							var role = await guild.roles.fetch(untis_config.role) as Role;
	
							_user.roles.add(role);
						} catch (e: any) {
							log("untis", "Error while adding role: " + e);
						}

						writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
					}
				} catch (e: any) {
					message.error = "Login failed: " + e;
				}

				return message;
			}
		} as WsRoute);
	},

	reload() {
		clearInterval(update_interval);
	}
} as Plugin;