import { Config } from "../config";
import { get_config_cache, set_express, set_server } from "../global";
import * as express from "express";
import { random_id } from "../utils";
import { existsSync } from "node:fs";
import { copyFileSync, mkdirSync } from "fs";
import { log } from "../logger";
import fetch, { HeadersInit } from "node-fetch";

var app = express.default();

export function load_express_api(): void  {
	const port = (get_config_cache().file_cache as Config).api_port;
	
	app.use((req, res, next) => {
		log("express", JSON.stringify({
			url: req.url,
			body: req.body,
			ip: req.ip,
			ips: req.ips,
			headers: req.headers
		}));
		next();
	});

	app.use(async (req, res, next) => {
		if (req.headers.host?.includes("infinitesearch")) {
			if (req.url.includes("acme-challenge")) { 
				log("infinitesearch", "Time to proxy the acme-challenge request!");

				var result =  await fetch("http://localhost:8888/" + req.url, {
					headers: req.headers as HeadersInit
				});

				var text = await result.text();
				res.send(text);
			} else {
				log("infinitesearch", "Time to redirect the user " + req.ip + " to https (direct connection no proxy)!");
				res.redirect("https://" + req.headers.host + req.url);
			}
		} else {
			next();
		}
	});

	app.use(express.static(process.cwd() + "/src/host"));
	app.use(express.json());
	set_server(app.listen(port));
	set_express(app);
}

export function add_host_file(file: string): string {
	var file_id = random_id() + "." + file.split(".")[file.split(".").length - 1];

	if (!existsSync("./src/host/files")) {
		mkdirSync("./src/host/files");
	}

	log("express-host", "Adding file " + file + " to host!");

	copyFileSync(file, "./src/host/files/" + file_id);

	return file_id;
}