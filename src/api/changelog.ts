import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import MarkdownIt from "markdown-it";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItContainer from "markdown-it-container";
import { get_express } from "../global";
import { log } from "../logger";
import { get_file_extension } from "../utils";
import * as express from "express";
import { add_route, WsMessage, WsRoute } from "./websocket";
import WebSocket from "ws";

var __template = `
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="css/style.css">
		<script type="module" src="js/script.js" defer></script>

		<title>NudelBot - Changelog</title>
	</head>
	<body>
		<div class="top">
			<div class="bar black card left-align large">
				<a href="/" class="bar-item button padding-large dark-grey hover-grey">Home</a>
				<a href="commands.html" class="bar-item button padding-large dark-grey hover-grey">Commands</a>
				<a href="changelog.html" class="bar-item button padding-large dark-grey hover-grey">Changelogs</a>
				<a href="auth.html" class="bar-item button padding-large dark-grey hover-grey" id="login_button">LogIn</a>
				<p class="bar-itme black padding-large right-align" style="margin-top: 0px;" id="login_text"></p>
			</div>
		</div>
		<header class="container black center" style="padding:50px 16px">
			<h1 class="margin jumbo">NudelBot</h1>
			<p class="xlarge">Welcome to the NudelBot changelog site!</p>
		</header>
		<div id="changelog" class="row-padding dark-grey padding-64 container">
%changelog%
		</div>

		<footer class="bar black card left-align">
			<p style="display: inline-flexbox;">Copyright (c) 2021 Glowman554</p>
		</footer>
	</body>
</html>
`;

export function compile_changelogs(): void  {
	if (!existsSync("changelogs")) {
		mkdirSync("changelogs");
	}

	readdirSync("changelogs").forEach(file => {
		if (!(get_file_extension(file) == ".md")) {
			return;
		}

		log("changelog", "compiling changelog " + file);

		var text = readFileSync("changelogs/" + file).toString();
		text = __template.replace("%changelog%", MarkdownIt({
			linkify: true,
			typographer: true
		}).use(MarkdownItEmoji).use(MarkdownItContainer).render(text).split("\n").map(line => { return "\t\t\t" + line}).join("\n"));
		writeFileSync("changelogs/" + file.replace(".md", ".html"), text);
	});

	get_express().use(express.static(process.cwd() + "/changelogs"));
}

interface ChangelogResponse extends WsMessage {
	changelogs: string[];
}

export function load_changelog_api(): void  {
	add_route({
		route: "changelog/all",
		executer: async function(message: WsMessage&ChangelogResponse, socket: WebSocket): Promise<ChangelogResponse> {
			message.changelogs = readdirSync("changelogs").filter(file => get_file_extension(file) == ".html");
			return message;
		}
	} as WsRoute);
}