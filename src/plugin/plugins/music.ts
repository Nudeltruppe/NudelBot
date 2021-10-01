import { Client, Message, StreamDispatcher, VoiceChannel } from "discord.js";
import EventEmitter from "events";
import { existsSync, readFileSync, writeFileSync } from "fs";
import ytdl from "ytdl-core";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { empty, get_command_manager } from "../../global";
import { DiscordSubsystem } from "../../subsystem/discord/discord";
import { Plugin } from "../plugin";
import { playlistInfo } from "youtube-ext";

interface MusicStore {
	[key: string]: Playlist;
}

var music_store: MusicStore;

export interface Song {
	yt_link: string;
}

export class Playlist {
	constructor(public name: string, public songs: Song[]) {
		this.name = name;
		this.songs = songs;
	}
}

function write_config() {
	writeFileSync("./config/music.json", JSON.stringify(music_store, null, 4));
}

class Player extends EventEmitter {
	dispatcher: StreamDispatcher|undefined;
	vc: VoiceChannel|undefined;
	msg: Message|undefined;

	constructor(public channel: string, public queue: Song[], public discord: Client, public message: Message) {
		super();

		this.channel = channel;
		this.queue = queue;
		this.discord = discord;
		this.message = message;

		this.on("play", async () => {
			var channel = await this.discord.channels.fetch(this.channel) as VoiceChannel;
			this.vc = channel;
			var connection = await channel.join();

			if (this.msg) {
				try {
					await this.msg.delete();
				} catch (e) {

				}

				delete this.msg;
			}

			this.msg = await this.message.channel.send("Now playing: " + this.queue[0].yt_link);

			await this.msg.react("🛑");
			await this.msg.react("▶️");

			this.msg.awaitReactions((reaction, user) => {
				switch (reaction._emoji.name) {
					case "🛑":
						{
							this.dispatcher?.end();
							this.msg?.delete();
							delete this.msg;
							this.vc?.leave();
						}
						break;
					
					case "▶️":
						{
							this.emit("queue_changed");
						}
						break;
				}
				return (reaction._emoji.name == "🛑" || reaction._emoji.name == "▶️") && !reaction.me;
			});

			var dispatcher = connection.play(ytdl(this.queue[0].yt_link, { filter: "audioonly", quality: "lowestaudio" }));

			dispatcher.on("finish", () => {
				var element = this.queue.shift();
				this.queue.push(element as Song);

				if (this.queue.length > 0) {
					this.emit("play");
				} else {
					channel.leave();
				}
			});

			dispatcher.on("error", (e) => {
				console.log(e);
				message.channel.send("Error playing song: " + e);
			});

			this.dispatcher = dispatcher;
		});

		this.on("queue_changed", () => {
			this.dispatcher?.end();
		});
	}
}

var players: Player[] = [];

export default {
	name: "music",
	version: "0.0.1",

	load() {
		if (!existsSync("./config/music.json")) {
			music_store = {};
			writeFileSync("./config/music.json", JSON.stringify(music_store, null, 4));
		}

		music_store = JSON.parse(readFileSync("./config/music.json").toString());

		get_command_manager().add_command(new Command("playlist", "Manage playlists!", "Use '#playlist [new|delete|add|list|remove][name][song?]' to manage playlists!", "playlist new testing",{
			execute: async (event: CommandEvent): Promise<CommandResponse> => {

				var command = event.interface.args.shift();

				switch (command) {
					case "new":
						{
							var name = event.interface.args.shift();
							if (name === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist new <name>"
								};
							} else {
								var playlist = new Playlist(name, []);
								music_store[name] = playlist;
								write_config();

								return {
									is_response: true,
									response: "Created playlist " + name
								}
							}
						}
						break;
					
					case "delete":
						{
							var name = event.interface.args.shift();
							if (name === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist delete <name>"
								};
							} else {
								if (music_store[name] === undefined) {
									return {
										is_response: true,
										response: "Playlist not found."
									};
								} else {
									delete music_store[name];
									write_config();

									return {
										is_response: true,
										response: "Deleted playlist " + name
									};
								}
							}
						}
						break;
					
					case "add":
						{
							var name = event.interface.args.shift();
							var song = event.interface.args.shift();

							if (name === undefined || song === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist add <name> <song>"
								};
							} else {
								var playlist = music_store[name];
								if (playlist === undefined) {
									return {
										is_response: true,
										response: "Playlist not found."
									};
								} else {
									playlist.songs.push({
										yt_link: song
									});
									write_config();

									return {
										is_response: true,
										response: "Added song to playlist " + name
									};
								}
							}
						}
						break;
					
					case "list":
						{
							var name = event.interface.args.shift();

							if (name === undefined) {
								var response = "";
								for (var key in music_store) {
									response += key + "\n";
								}

								return {
									is_response: true,
									response: response
								}
							} else {
								var playlist = music_store[name];
								if (playlist === undefined) {
									return {
										is_response: true,
										response: "Playlist not found."
									};
								} else {
									var response = "";
									for (var i = 0; i < playlist.songs.length; i++) {
										response += `${i + 1}. ${playlist.songs[i].yt_link}\n`;
									}

									if (response.length > 2000) {
										const numChunks = Math.ceil(response.length / 2000)
								
										for (let i = 0, o = 0; i < numChunks; ++i) {
											let x = 2000;
											while (response[o + x] != "\n") {
												x--;
											}

											await event.interface.send_message(response.substr(o, x + 1));
											o += x;
										}
	
										return empty;
									} else {
										return {
											is_response: true,
											response: response
										};
									}
								}
							}
						}
						break;
					
					case "remove":
						{
							var name = event.interface.args.shift();
							var song = event.interface.args.shift();

							if (name === undefined || song === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist remove <name> <song>"
								};
							} else {
								var playlist = music_store[name];
								if (playlist === undefined) {
									return {
										is_response: true,
										response: "Playlist not found."
									};
								} else if (isNaN(parseInt(song))) {
									for (var i = 0; i < playlist.songs.length; i++) {
										if (playlist.songs[i].yt_link === song) {
											playlist.songs.splice(i, 1);
											write_config();
											return {
												is_response: true,
												response: "Song removed."
											};
										}
									}
									return {
										is_response: true,
										response: "Song not found."
									};
								} else {
									var song_index = parseInt(song);
									if (song_index > playlist.songs.length) {
										return {
											is_response: true,
											response: "Song not found."
										};
									} else {
										playlist.songs.splice(song_index - 1, 1);
										write_config();
										return {
											is_response: true,
											response: "Song removed."
										};
									}
								}
							}
						}
						break;

					case "load":
						{
							var name = event.interface.args.shift();
							
							if (name === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist load <name>"
								};
							} else {
								var playlist = music_store[name];
								if (playlist === undefined) {
									return {
										is_response: true,
										response: "Playlist not found."
									};
								} else {
									//queue = playlist.songs;
									if ((event.interface.message_raw_object as Message).member?.voice.channel) {
										var channel = (event.interface.message_raw_object as Message).member?.voice.channel as VoiceChannel;
										var player = players.find(p => p.channel === channel?.id);

										if (player === undefined) {
											player = new Player(channel.id, playlist.songs, (event.subsystem as DiscordSubsystem).client, event.interface.message_raw_object as Message);
											players.push(player);
										}

										player.queue = Object.assign([], playlist.songs);
									} else {
										return {
											is_response: true,
											response: "You must be in a voice channel to use this command."
										};
									}
									return {
										is_response: true,
										response: "Playlist loaded."
									};
								}
							}
						}
						break;
					
					case "import":
						{
							var playlist_name = event.interface.args.shift();
							var playlist_s = event.interface.args.shift();

							if (playlist_s === undefined || playlist_name === undefined) {
								return {
									is_response: true,
									response: "Usage: playlist import <playlist> <yt playlist>"
								};
							}

							if (music_store[playlist_name] !== undefined) {
								return {
									is_response: true,
									response: "Playlist already exists."
								};
							} else {
								var videos: string[] = [];
								var fetched_playlist = await playlistInfo(playlist_s);

								fetched_playlist.videos.forEach(video => {
									videos.push("https://www.youtube.com/watch?v=" + video.id);
								});

								var songs = videos.map(v => {
									return {
										yt_link: v,
									} as Song;
								});

								music_store[playlist_name] = new Playlist(playlist_name, songs);
								write_config();

								return {
									is_response: true,
									response: "Imported " + fetched_playlist.videos.length + " songs."
								};
							}
						}
						break;

					default:
						return {
							is_response: true,
							response: "Usage: playlist <new|delete|add|list|remove> <name> <song?>"
						};
				}
			},

			subsystems: ["discord"]
		}, undefined));

		get_command_manager().add_command(new Command("queue", "Manage the queue!", "Use '#queue [play/list/clear/skip/stop/add/save][name?/link?]' to manage the queue!", "queue list", {
			execute: async (event: CommandEvent): Promise<CommandResponse> => {
				var command = event.interface.args.shift();

				switch (command) {
					case "list":
						{
							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								var queue = player.queue;
								var response = "";
								for (var i = 0; i < queue.length; i++) {
									response += (i + 1) + ". " + queue[i].yt_link + "\n";
								}

								if (response.length > 2000) {
									const numChunks = Math.ceil(response.length / 2000)
							
									for (let i = 0, o = 0; i < numChunks; ++i) {
										let x = 2000;
										while (response[o + x] != "\n") {
											x--;
										}

										await event.interface.send_message(response.substr(o, x + 1));
										o += x;
									}

									return empty;
								} else {
									return {
										is_response: true,
										response: response
									};
								}
							}
						}
						break;
					
					case "clear":
						{
							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								player.queue = [];
								player.emit("queue_changed");
								return {
									is_response: true,
									response: "Queue cleared."
								};
							}
						}
						break;

					case "play":
						{
							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								player.emit("play");
							}
						}
						break;

					case "skip":
						{
							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								var element = player.queue.shift();
								player.queue.push(element as Song);

								player.emit("queue_changed");
								return {
									is_response: true,
									response: "Skipped."
								};
							}
						}
						break;

					case "stop":
						{
							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								player.dispatcher?.end();
								player.vc?.leave();

								return {
									is_response: true,
									response: "Stopped."
								};
							}
						}
						break;
					
					case "add":
						{
							var song = event.interface.args.shift();
							if (song === undefined) {
								return {
									is_response: true,
									response: "Usage: add <youtube link>"
								};
							}

							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								player = new Player((event.interface.message_raw_object as Message).member?.voice.channel?.id as string, [
									{
										yt_link: song
									}
								], (event.subsystem as DiscordSubsystem).client, event.interface.message_raw_object as Message);

								players.push(player);
							} else {
								player.queue.push({
									yt_link: song
								});

								return {
									is_response: true,
									response: "Added to queue."
								};
							}
						}
						break;
					
					case "save":
						{
							var name = event.interface.args.shift();
							if (name === undefined) {
								return {
									is_response: true,
									response: "Usage: queue save <name>"
								};
							}

							var player = players.find(p => p.channel === (event.interface.message_raw_object as Message).member?.voice.channel?.id);
							if (player === undefined) {
								return {
									is_response: true,
									response: "Please join a voice channel to use this command or load a playlist."
								};
							} else {
								var playlist = new Playlist(name, player.queue);
								music_store[name] = playlist;
								write_config();
								return {
									is_response: true,
									response: "Playlist saved."
								};
							}
						}
						break;
					
					default:
						return {
							is_response: true,
							response: "Usage: queue <play/list/clear/skip/stop/add/save> <name?/link?>"
						};
				}

				return empty;
			}
		} as CommandExecutor, undefined));
	},

	reload() {

	}
} as Plugin;