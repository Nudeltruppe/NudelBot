import { ChildProcess, execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { fail, get_command_manager } from "../../global";
import { log } from "../../logger";
import { Plugin } from "../plugin";

function ensure_cpuminer_installed() {
	if (!existsSync("./res/cpuminer.elf")) {
		log("cpuminer", "Installing cpuminer...");

		writeFileSync("./tmp/cpuminer-install.sh", "(cd ./tmp/; git clone https://github.com/TheBot-core/cpuminer.git; cd cpuminer; node .; cp ./minerd.elf ../../res/cpuminer.elf; cd ..; rm -rf cpuminer)");
		execSync("chmod +x ./tmp/cpuminer-install.sh");
		execSync("./tmp/cpuminer-install.sh", { stdio: "inherit" });
	}
}

interface MinerConfig {
	url: string;
	user: string;
	pass: string;
	algo: string;
}

interface MinerInfo {
	opt_n_threads: number;
	num_processors: number;
	rpc_url: string;
	rpc_user: string;
	algo_name: string;
	khash_total: number;
	khash_thread_avg: number;
}


var miner_thread: ChildProcess|null = null;

export default {
	name: 'cpuminer',
	version: '0.0.1',

	load() {
		if (process.platform === "linux") {
			ensure_cpuminer_installed();

			if (!existsSync("./config/miner_config.json")) {
				log("cpuminer", "No config found, creating one...");
				writeFileSync("./config/miner_config.json", JSON.stringify({
					url: "",
					user: "",
					pass: "",
					algo: "",
				} as MinerConfig, null, 4));
			}

			get_command_manager().add_command(new Command("miner", "Control the miner!", "use #miner [start,stop,info] to manage the miner!", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (event.interface.args.length != 1) {
						return fail;
					}

					switch (event.interface.args[0]) {
						case "start":
							if (miner_thread !== null) {
								return {
									is_response: true,
									response: "Miner already running"
								};
							} else {
								miner_thread = spawn(process.cwd() + "/res/cpuminer.elf", ["-c", process.cwd() + "/config/miner_config.json"], {
									cwd: process.cwd() + "/tmp",
									stdio: "inherit"
								});
							}
							break;
						
						case "stop":
							if (miner_thread === null) {
								return {
									is_response: true,
									response: "Miner not running"
								};
							}

							miner_thread.kill();
							miner_thread = null;
							break;
						
						case "info":
							if (miner_thread === null) {
								return {
									is_response: true,
									response: "Miner not running"
								};
							} else {
								var miner_info = JSON.parse(readFileSync("./tmp/data.json").toString()) as MinerInfo;
								var text = `Mining on ${miner_info.opt_n_threads} threads with ${miner_info.khash_thread_avg} khash/s per thread and ${miner_info.khash_total} khash/s in total!`;

								return {
									is_response: true,
									response: text
								};
							}
						
						default:
							return fail;
					}

					return {
						is_response: true,
						response: "OK!"
					};
				}
			} as CommandExecutor, "miner"));
		} else {
			log("cpuminer", "cpuminer is only supported on Linux");
		}
	},

	reload() {
		if (miner_thread !== null) {
			miner_thread.kill();
			miner_thread = null;
		}
	}
} as Plugin;