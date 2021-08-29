import { existsSync, readFileSync, writeFileSync } from "fs";
import { Connection, createConnection, RowDataPacket } from "mysql2";
import { Command, CommandEvent, CommandResponse } from "../../command/command";
import { fail, get_command_manager } from "../../global";
import { Plugin } from "../plugin";

interface DataBaseStore {
	host: string;
	port: number;
	user: string;
	password: string;
	db: string;
	table: string;
}

var db: Connection|undefined;
var data_base_store: DataBaseStore;

export default {
	name: "db",
	version: "0.0.1",

	load() {
		if (existsSync("./config/db.json")) {
			data_base_store = JSON.parse(readFileSync("./config/db.json").toString()) as DataBaseStore;
		} else {
			data_base_store = {
				host: "localhost",
				port: 3306,
				user: "root",
				password: "",
				db: "infinite_search",
				table: "webs"
			};
			writeFileSync("./config/db.json", JSON.stringify(data_base_store, null, 4));
		}
		db = createConnection({
			host: data_base_store.host,
			port: data_base_store.port,
			user: data_base_store.user,
			password: data_base_store.password,
			database: data_base_store.db
		});

		get_command_manager().add_command(new Command("db_info", "See informations about the db!", "Use '#db_info' to see information's about the db", {
			execute: (event: CommandEvent): Promise<CommandResponse> => {
				return new Promise((resolve, reject) => {
					if (event.interface.args.length != 0) {
						resolve(fail);
					} else {
						if (db) {
							db?.query("SELECT * FROM " + data_base_store.table, (err, rows: RowDataPacket[]) => {
								if (err) {
									resolve(fail);
									db?.end();
									db = createConnection({
										host: data_base_store.host,
										port: data_base_store.port,
										user: data_base_store.user,
										password: data_base_store.password,
										database: data_base_store.db
									});
								} else {
									resolve({
										is_response: true,
										response: `The search engine knows ${rows.length} web pages!`
									});
								}
							});
						} else {
							resolve(fail);
						}
					}


				});
			}
		}, "infinite_search_member"));
	},

	reload() {
		if (db) {
			db.end();
			db = undefined;
		}
	}
} as Plugin;