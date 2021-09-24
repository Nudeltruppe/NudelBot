import { writeFileSync } from "fs";

export interface Config {
	discord_token: string;
	telegram_token: string;
	giphy_token: string;
	zoom: {
		jid: string;
		token: string;
		client_id: string;
		client_secret: string;
	}

	url: string;

	api_port: number;

	hello_msg: string;

	default_perms: string[];

	version: string;

	users: {
		user: string;
		perms: string[];
	}[];
}

export function write_default_config(): void  {
	var config = {
		discord_token: "",
		giphy_token: "",
		telegram_token: "",
		zoom: {
			jid: "",
			token: "",
			client_id: "",
			client_secret: ""
		},
		api_port: 5051,
		url: "http://glowman554.duckdns.org/",
		hello_msg: "Hello %user% my name is NudelBot and I'm happy to meet you 👍!\nThe person who programs me does this mainly in his free time so don't expect too much from me 🤪!\nI'm mainly made to have fun 👾!\nYou can find more information about me here: %url% 😼.",
		default_perms: [],
		version: "0.0.1",
		users: []
	} as Config;

	writeFileSync("./config.json", JSON.stringify(config, null, 4));
}