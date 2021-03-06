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

// Generated by https://quicktype.io

export interface ClassServicesResponse {
	classRoles:      ClassRole[];
	personKlasseMap: PersonKlasseMap;
}

export interface ClassRole {
	id:        number;
	personId:  number;
	klasse:    Klasse;
	foreName:  string;
	longName:  string;
	duty:      Duty;
	startDate: number;
	endDate:   number;
	text:      string;
}

export interface Duty {
	id:    number;
	label: string;
}

export interface Klasse {
	id:   number;
	name: string;
}

export interface PersonKlasseMap {
	"10605": number;
}


enum HaType {
	GERMAN = "d",
	MATH = "m",
	ENGLISH = "e",
	SPANISH = "sp",
	FRENCH = "fr",
	SPORT = "s",
	PHYSICS = "ph",
	CHEMISTRY = "ch",
	ECONOMY = "wk",
	HISTORY_AND_CULTURE = "ggk",
	RELIGION = "rel",
	ETHICS = "eth",
	IT_HW = "it_hw",
	IT_SW = "it_sw",
	IT_EXCEL = "inf",
};

var known_ha_types: HaType[] = [
	HaType.GERMAN,
	HaType.MATH,
	HaType.ENGLISH,
	HaType.SPANISH,
	HaType.FRENCH,
	HaType.SPORT,
	HaType.PHYSICS,
	HaType.CHEMISTRY,
	HaType.ECONOMY,
	HaType.HISTORY_AND_CULTURE,
	HaType.RELIGION,
	HaType.ETHICS,
	HaType.IT_HW,
	HaType.IT_SW,
	HaType.IT_EXCEL,
];

export interface HaStore {
	type: HaType;
	to_be_finished_by: {
		day: number;
		month: number;
		year: number;
	}
	notes: string;
}

var ha_store: HaStore[];

var untis_auth_store: UntisAuthStore;
var untis_config: GeneralUntisConfig;
var update_interval: NodeJS.Timeout;

export function merge_obj(obj1: any, obj2: any): any {
	for(var key in obj2) {
		if (typeof obj2[key] === 'object' && obj2[key] !== null && !(obj2[key] instanceof Array)) {
			console.log(`Merging sub-object ${key}`);
			if (obj1[key] === undefined) {
				obj1[key] = {};
			}
			obj1[key] = merge_obj(obj1[key], obj2[key]);
		} else {
			console.log(`Merging ${key}`);
			obj1[key] = obj2[key];
		}
	}

	return obj1;
}

async function getClassServicesFor(untis: any, rangeStart: Date, rangeEnd: Date, validateSession = true): Promise<ClassServicesResponse> {
	if (validateSession && !(await untis.validateSession())) throw new Error('Current Session is not valid');
	const response = await untis.axios({
		method: 'GET',
		url: `/WebUntis/api/classreg/classservices`,
		params: {
			startDate: untis.convertDateToUntis(rangeStart),
			endDate: untis.convertDateToUntis(rangeEnd),
		},
		headers: {
			Cookie: untis._buildCookies(),
		},
	});
	if (typeof response.data.data !== 'object') {
		throw new Error('Server returned invalid data.');
	}

	return response.data.data;
}

async function fetch_homework(): Promise<string> {
	var homework = {} as UntisHomeworks;
	var class_services = {} as ClassServicesResponse;

	for (let x of Object.keys(untis_auth_store)) {
		var untis = new WebUntis(untis_config.school, untis_auth_store[x].username, untis_auth_store[x].password, untis_config.weburl);

		log("untis", "Trying to authenticate with " + untis_auth_store[x].username + " credentials ...");

		try {
			await untis.login();

			homework = merge_obj(
				homework,
				await untis.getHomeWorksFor(new Date(), new Date(new Date().setDate(new Date().getDate() + 7)))
			);

			class_services = merge_obj(
				class_services,
				await getClassServicesFor(untis, new Date(), new Date(new Date().setDate(new Date().getDate() + 1)))
			);

			await untis.logout();

			log("untis", "Authentication successful!");
		} catch (e: any) {
			log("untis", "Error while authenticating with untis: " + e);
			// delete untis_auth_store[x]; // why did i think this is a good idea?????????
			writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
		}
	}

	var homework_string = "";

	for (let x of homework.homeworks) {
		var subject = homework.lessons.find(lesson => lesson.id == x.lessonId)?.subject;
		var due_date = WebUntis.convertUntisDate(x.dueDate).toLocaleDateString();

		homework_string += `**${subject}**: ${x.text} muss bis zum \`${due_date}\` erledigt sein!\n`;
	}

	for (let x of ha_store) {
		var now = new Date(Date.now());

		if (x.to_be_finished_by.year < now.getFullYear() || x.to_be_finished_by.month < now.getMonth() + 1 || x.to_be_finished_by.day < now.getDate()) {
			continue;
		}

		homework_string += `**${x.type}**: ${x.notes} muss bis zum \`${x.to_be_finished_by.day}/${x.to_be_finished_by.month}/${x.to_be_finished_by.year}\` erledigt sein!\n`;
	}

	if (homework_string == "") {
		homework_string = "Keine Aufgaben f??r heute!";
	}

	var class_services_string = "";
	for (let x of class_services.classRoles) {
		var due_date = WebUntis.convertUntisDate(x.endDate).toLocaleDateString();
		class_services_string += `**${x.duty.label}**: ${x.foreName} ${x.longName} bis ${due_date}\n`;
	}

	return homework_string + "\n\n" + class_services_string;
}

export default {
	name: "untis",
	version: "0.0.1",

	async load() {
		if (!existsSync("./config/untis.json")) {
			log("untis", "No untis.jpson found, creating one ...");
			untis_auth_store = {
			} as UntisAuthStore;

			writeFileSync("./config/untis.json", JSON.stringify(untis_auth_store, null, 4));
		}

		if (!existsSync("./config/ha.json")) {
			log("untis", "No ha.json found, creating one ...");

			ha_store = [];

			writeFileSync("./config/ha.json", JSON.stringify(ha_store, null, 4));
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
		ha_store = JSON.parse(readFileSync("./config/ha.json").toString()) as HaStore[];

		var channel: TextChannel;
		var message: Message;

		var subsystem: DiscordSubsystem = get_subsystems().find(subsystem => subsystem.name == "discord") as DiscordSubsystem;

		while (subsystem == null) {
			log("untis", "Discord not ready yet, waiting ...");
			await new Promise(resolve => setTimeout(resolve, 1000));
			subsystem = get_subsystems().find(subsystem => subsystem.name == "discord") as DiscordSubsystem;
		}

		while (!subsystem.init_done) {
			log("untis", "Discord not ready yet, waiting ...");
			await new Promise(resolve => setTimeout(resolve, 1000));
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
	
		get_command_manager().add_command(new Command("donate", "Donate your untis credentials.", "Use '#donate [username] [password]' to donate your untis credentials.\nKeep in mind more untis credentials from different groups and courses mean better and more accurate data.\nMake sure to donate your credentials in private", "donate 000000 11.11.1111", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {


				if ((event.interface.message_raw_object as any).channel) {
					if ((event.interface.message_raw_object as Message).channel.type != "dm") {
						if ((event.interface.message_raw_object as any).channel) {
							try {
								(event.interface.message_raw_object as Message).delete();
							} catch (e: any) {
								log("untis", "Error while deleting message: " + e);
							}
						}

						return {
							is_response: true,
							response: "Make sure to donate in private chat for data security reasons"
						}
					}
				}

				if (event.interface.args.length != 2) {
					return {
						is_response: true,
						response: "No args specified"
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


		get_command_manager().add_command(new Command("add-ha", "Add a homework!", "Use '#add-ha [date][" + known_ha_types.join("/") + "][note]' to add a homework", "add-ha 15/10/2021 d yeeeeeet!", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				if (event.interface.args.length < 3) {
					return {
						is_response: true,
						response: "No args specified"
					}
				}

				var date = event.interface.args.shift()?.split("/") as string[];
				var ha_type = event.interface.args.shift() as string;

				if (known_ha_types.indexOf(ha_type as HaType) == -1) {
					return {
						is_response: true,
						response: "Unknown ha type: " + ha_type
					};
				}

				var ha_note = event.interface.args.join(" ");

				
				var ha = {
					notes: ha_note,
					to_be_finished_by: {
						day: parseInt(date[0]),
						month: parseInt(date[1]),
						year: parseInt(date[2])
					},
					type: ha_type
				} as HaStore;

				ha_store.push(ha);

				writeFileSync("./config/ha.json", JSON.stringify(ha_store, null, 4));

				message.edit("Fetching data...");
				message.edit(await fetch_homework());

				return {
					is_response: true,
					response: `Added ${ha_type}: ${ha_note} to ${date[0]}/${date[1]}/${date[2]}`
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
