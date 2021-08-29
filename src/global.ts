import { Server } from "http";
import { FileCache } from "./cache";
import { CommandEvent, CommandManager, CommandResponse } from "./command/command";
import { PluginLoader } from "./plugin/loader";
import * as express from "express";
import WebSocket from "ws";


var _config_cache: FileCache;
var _command_manager: CommandManager;
var _plugin_loader: PluginLoader;
var _last_command_event: CommandEvent|null;
var _starttime: number;
var _server: Server;
var _express: express.Express;
var _subsystems: Subsystem[] = [];
var _ws_server: WebSocket.Server;

export function get_config_cache(): FileCache {
	return _config_cache;
}

export function set_config_cache(value: FileCache): void  {
	_config_cache = value;
}

export function get_command_manager(): CommandManager {
	return _command_manager;
}

export function set_command_manager(value: CommandManager): void  {
	_command_manager = value;
}

export function get_plugin_loader(): PluginLoader {
	return _plugin_loader;
}

export function set_plugin_loader(value: PluginLoader): void  {
	_plugin_loader = value;
}


export function get_last_command_event(): CommandEvent|null {
	return _last_command_event;
}

export function set_last_command_event(value: CommandEvent|null): void  {
	_last_command_event = value;
}


export function get_starttime(): number {
	return _starttime;
}

export function set_starttime(value: number): void  {
	_starttime = value;
}


export function get_server(): Server {
	return _server;
}

export function set_server(value: Server): void  {
	_server = value;
}


export function get_express(): express.Express {
	return _express;
}

export function set_express(value: express.Express): void  {
	_express = value;
}

export function get_subsystems(): Subsystem[] {
	return _subsystems;
}

export function set_subsystems(value: Subsystem[]): void  {
	_subsystems = value;
}


export function get_ws_server(): WebSocket.Server {
	return _ws_server;
}

export function set_ws_server(value: WebSocket.Server): void  {
	_ws_server = value;
}

export var fail = {
	is_response: true,
	response: "Something is wrong!"
} as CommandResponse;

export var empty = {
	is_response: false,
	response: undefined
} as CommandResponse;

export var user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36";