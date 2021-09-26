import { existsSync } from "node:fs";
import { empty, fail, get_command_manager, get_config_cache, get_express } from "../../global";
import { log } from "../../logger";
import { Plugin } from "../plugin";
import { stringify } from "querystring";
import { readFileSync, writeFileSync } from "fs";
import { Config } from "../../config";
import request from "request";
import fetch from "node-fetch";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { get_file_extension, random_id } from "../../utils";
import download from "download";

interface SpotifyClientOptions {
	clientId: string;
	clientSecret: string;
}

// Generated by https://quicktype.io

export interface SpotifyAuth {
	access_token:  string;
	token_type:    string;
	expires_in:    number;
	refresh_token: string;
}

var spotify: SpotifyAuth;
var interval: NodeJS.Timer;

function refresh_token(current_auth: SpotifyAuth, spotifyClient: SpotifyClientOptions): Promise<SpotifyAuth> {
	var auth_options = {
		url: "https://accounts.spotify.com/api/token",
		form: {
			grant_type: "refresh_token",
			refresh_token: current_auth.refresh_token
		},
		headers: {
			"Authorization": "Basic " + Buffer.from(spotifyClient.clientId + ":" + spotifyClient.clientSecret).toString("base64")
		},
		json: true
	};

	return new Promise<SpotifyAuth>((resolve, reject) => {
		request.post(auth_options, (error, response, body) => {
			if (error) {
				reject(error);
			} else {
				resolve(body as SpotifyAuth);
			}
		});
	});
}

async function call_spotify(url: string) {
	const data_fetched = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": "Bearer " + spotify.access_token
		}
	});
	return data_fetched.json();
}

// Generated by https://quicktype.io

export interface SpotifyAPISearchResult {
	tracks: Tracks;
}

export interface Tracks {
	href:     string;
	items:    Item[];
	limit:    number;
	next:     string;
	offset:   number;
	previous: null;
	total:    number;
}

export interface Item {
	album:             Album;
	artists:           Artist[];
	available_markets: string[];
	disc_number:       number;
	duration_ms:       number;
	explicit:          boolean;
	external_ids:      ExternalIDS;
	external_urls:     ExternalUrls;
	href:              string;
	id:                string;
	is_local:          boolean;
	name:              string;
	popularity:        number;
	preview_url:       string;
	track_number:      number;
	type:              string;
	uri:               string;
}

export interface Album {
	album_type:             string;
	artists:                Artist[];
	available_markets:      string[];
	external_urls:          ExternalUrls;
	href:                   string;
	id:                     string;
	images:                 Image[];
	name:                   string;
	release_date:           string;
	release_date_precision: string;
	total_tracks:           number;
	type:                   string;
	uri:                    string;
}

export interface Artist {
	external_urls: ExternalUrls;
	href:          string;
	id:            string;
	name:          string;
	type:          string;
	uri:           string;
}

export interface ExternalUrls {
	spotify: string;
}

export interface Image {
	height: number;
	url:    string;
	width:  number;
}

export interface ExternalIDS {
	isrc: string;
}


export default {
	name: "spotify",
	version: "0.0.1",

	load() {
		if (!existsSync("./config/spotify-client.json")) {
			log("spotify", "No spotify-client.json found, creating one ...");
			let spotifyClient = {
				clientId: "",
				clientSecret: ""
			} as SpotifyClientOptions;

			writeFileSync("./config/spotify-client.json", JSON.stringify(spotifyClient, null, 4));
			process.exit(0);
		}

		var spotifyClient = JSON.parse(readFileSync("./config/spotify-client.json").toString()) as SpotifyClientOptions;

		if (!existsSync("./config/spotify.json")) {
			log("spotify", "Spotify login not found please do it now!");
			
			get_express().get("/login", (req, res) => {
				res.redirect("https://accounts.spotify.com/authorize?" + stringify({
					response_type: "code",
					client_id: spotifyClient.clientId,
					redirect_uri: "http://localhost:" + (get_config_cache().file_cache as Config).api_port + "/callback"
				}));
			});

			get_express().get("/callback", (req, res) => {
				var code = req.query.code;

				if (code) {
					var auth_options = {
						url: "https://accounts.spotify.com/api/token",
						form: {
							grant_type: "authorization_code",
							code: code,
							redirect_uri: "http://localhost:" + (get_config_cache().file_cache as Config).api_port + "/callback",
						},
						headers: {
							"Authorization": "Basic " + Buffer.from(spotifyClient.clientId + ":" + spotifyClient.clientSecret).toString("base64")
						},
						json: true
					};

					request.post(auth_options, (err, response, body) => {
						writeFileSync("./config/spotify.json", JSON.stringify(body, null, 4));

						res.send("Big success!");

						process.exit(0);
					});
				}
			});
		} else {
			log("spotify", "Spotify login found, using it!");

			spotify = JSON.parse(readFileSync("./config/spotify.json").toString()) as SpotifyAuth;

			refresh_token(spotify, spotifyClient).then((auth) => {
				spotify.access_token = auth.access_token;
				writeFileSync("./config/spotify.json", JSON.stringify(spotify, null, 4));
			});

			interval = setInterval(() => {
				log("spotify", "Refreshing token ...");
				refresh_token(spotify, spotifyClient).then((auth) => {
					spotify.access_token = auth.access_token;
					writeFileSync("./config/spotify.json", JSON.stringify(spotify, null, 4));
				});
			}, 1000 * 60);

			get_command_manager().add_command(new Command("spotify", "Search spotify for songs!", "Use '#spotify [what]' to get a list of songs and small previews of them!\n\nExample: \n#spotify don't hide", "#spotify never gonna give you up", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (event.interface.args.length  < 1) {
						return fail;
					}

					call_spotify("https://api.spotify.com/v1/search?q=" + event.interface.args.join(" ") + "&type=track&limit=5").then(async (data: SpotifyAPISearchResult) => {
						for(let i of data.tracks.items) {
							if (i.preview_url !== null) {
								var id = random_id() + ".mp3";

								await download(i.preview_url, "./tmp/", {
									filename: id,
								});

								await event.interface.send_message("Maybe you like " + i.name + "\n" + i.external_urls.spotify);
								await event.interface.send_audio_message("./tmp/" + id);
							}
						}
					});

					return empty;
				}
			} as CommandExecutor, undefined));
		}
	},

	reload() {
		clearInterval(interval);
	}
} as Plugin;