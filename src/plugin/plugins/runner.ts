import { exec, execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { Command, CommandEvent, CommandExecutor, CommandResponse } from "../../command/command";
import { empty, fail, get_command_manager } from "../../global";
import { log } from "../../logger";
import { get_file_extension } from "../../utils";
import { Plugin } from "../plugin";

function ensure_nsjail_installed() {
	if (!existsSync("./res/nsjail.elf")) {
		log("runner", "Installing NSJail...");

		// no idea why but newer commits wont compile
		writeFileSync("./tmp/nsjail-install.sh", "(cd ./tmp/; git clone https://github.com/google/nsjail.git; cd nsjail; git checkout b09ad5e91ce8e6ffee68a1df38f23792aaf9c51f; make; cp ./nsjail ../../res/nsjail.elf; cd ..; rm -rf nsjail)");
		execSync("chmod +x ./tmp/nsjail-install.sh");
		execSync("./tmp/nsjail-install.sh", { stdio: "inherit" });
	}
}

var default_jail = [
	"-l 0",
	"-Mo",
	"--user 0",
	"--group 99999",
	"-R /bin/",
	"-R /lib",
	"-R /usr/",
	"-R /sbin/",
	"-R " + process.cwd() + "/tmp/",
	"-T /dev/",
	"--keep_caps"
];

function do_jail(command: string): string {
	command = command.replace(/\'/g, "\"");
	var cmd = "echo \'" + command + "\' | " + process.cwd() + "/res/nsjail.elf " + default_jail.join(" ") + " -- /bin/bash";
	return cmd;
}

var filter = [
	"$",
	"(",
	")",
	"'",
	"\"",
	"|",
	"<",
	">",
	"`",
	"\\"
];

export function do_filter(str: string): void  {
	for (var i in filter) {
		if (str.indexOf(filter[i]) != -1) {
			throw new Error("This looks like code injection don't do that owo!");
		}
	}
}

var compilers: { [c: string]: { file_extension: string, flags: string, post_compile?: string, cleanup?: string, is_interpreted: boolean} } = {
	"gcc": {
		"file_extension": ".c",
		"flags": "-o %out%.o -c %in%",
		"post_compile": "gcc %out%.o -o %out%",
		"cleanup": "rm %out%.o %out%",
		"is_interpreted": false
	},
	"g++": {
		"file_extension": ".cpp",
		"flags": "-o %out%.o -c %in%",
		"post_compile": "g++ %out%.o -o %out%",
		"cleanup": "rm %out%.o %out%",
		"is_interpreted": false
	},
	"as": {
		"file_extension": ".S",
		"flags": "%in% -o %out%.o",
		"post_compile": "ld %out%.o -o %out%",
		"cleanup": "rm %out%.o %out%",
		"is_interpreted": false
	},
	"rustc": {
		"file_extension": ".rs",
		"flags": "%in% -o %out%",
		"post_compile": "exit #we don't need this",
		"cleanup": "rm %out%",
		"is_interpreted": false
	},
	"node": {
		"file_extension": ".js",
		"flags": "%in%",
		"is_interpreted": true
	},
	"python3": {
		"file_extension": ".py",
		"flags": "%in%",
		"is_interpreted": true
	},
	"go": {
		"file_extension": ".go",
		"flags": "run %in%",
		"is_interpreted": true
	},
	"bash": {
		"file_extension": ".sh",
		"flags": "%in%",
		"is_interpreted": true
	},
	"java": {
		"file_extension": ".java",
		"flags":"%in%",
		"is_interpreted": true
	}
}

export default {
	name: "runner",
	version: "0.0.1",

	load() {
		if (process.platform === "linux") {
			ensure_nsjail_installed();

			get_command_manager().add_command(new Command("exec", "Run a command!", "Use '#exec [what]' to execute a command!\n\nExampel: \n#exec ls", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (!(!(event.interface.args.length < 1) || Boolean(event.interface.quote_text))) {
						return fail;
					}
	
					var text = event.interface.quote_text ? event.interface.quote_text : event.interface.args.join(" ");

					var cmd = do_jail(text);
					//console.log(cmd);

					exec(cmd, (error, stdout, stderr) => {
						if (error) {
							event.interface.send_message(stderr);
						} else {
							var text = ""

							if (stderr) {
								text += "STDERR: " + stderr.toString() + "\nSTDOUT: ";
							}

							event.interface.send_message(text + stdout.toString());
						}
					});

					return empty;
				}
			} as CommandExecutor, undefined));

			get_command_manager().add_command(new Command("exec_nojail", "Run a command!", "Use '#exec-nojail [what]' to execute a command!\n\nExampel: \n#exec-nojail ls", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (!(!(event.interface.args.length < 1) || Boolean(event.interface.quote_text))) {
						return fail;
					}
	
					var text = event.interface.quote_text ? event.interface.quote_text : event.interface.args.join(" ");

					exec(text, (error, stdout, stderr) => {
						if (error) {
							event.interface.send_message(stderr);
						} else {
							var text = ""

							if (stderr) {
								text += "STDERR: " + stderr.toString() + "\nSTDOUT: ";
							}

							event.interface.send_message(text + stdout.toString());
						}
					});

					return empty;
				}
			} as CommandExecutor, "exec"));

			get_command_manager().add_command(new Command("compile", "Compile and run a file!", "Use '#compile' to compile the quoted file!", {
				execute: async (event: CommandEvent): Promise<CommandResponse> => {
					if (event.interface.args.length == 1) {
						if (event.interface.args[0] == "list") {
							return { 
								is_response: true,
								response: "Known compilers: " + Object.keys(compilers).join(", ") + "!"
							}
						} else {
							return fail;
						}
					}

					if (event.interface.files?.length == 0) {
						return fail;
					}

					event.interface.files?.forEach(file => {
						var compiler_to_use = Object.keys(compilers).find(compiler => compilers[compiler]?.file_extension == get_file_extension(file));
						if (compiler_to_use !== undefined) {
							var compiler = compilers[compiler_to_use];

							if (compiler.is_interpreted) {
								var exec_cmd = compiler_to_use + " " + compiler.flags;
								exec_cmd.replace(/%in%/g, file);
								log("runner", "Running command " + exec_cmd);

								exec(do_jail(exec_cmd), (error, stdout, stderr) => {
									if (error) {
										throw error;
									}

									event.interface.send_message(stdout);
								});
							} else {
								var step0_cmd = compiler_to_use + " " + compiler.flags;
								step0_cmd = step0_cmd.replace(/%in%/g, file);
								step0_cmd = step0_cmd.replace(/%out%/g, file + ".elf");
								log("runner", "Compiler step 0: " + step0_cmd);
								execSync(step0_cmd);

								var step1_cmd = compiler.post_compile;
								if (step1_cmd) {
									step1_cmd = step1_cmd.replace(/%in%/g, file);
									step1_cmd = step1_cmd.replace(/%out%/g, file + ".elf");
									log("runner", "Compiler step 1: " + step1_cmd);

									execSync(step1_cmd);
								}

								exec(do_jail(process.cwd() + "/" + file + ".elf"), (error, stdout, stderr) => {
									if (error) {
										throw error;
									}

									event.interface.send_message(stdout);

									var cleanup_cmd = compiler.cleanup;
									if (cleanup_cmd) {
										cleanup_cmd = cleanup_cmd.replace(/%in%/g, file);
										cleanup_cmd = cleanup_cmd.replace(/%out%/g, file + ".elf");
										log("runner", "Compiler cleanup: " + cleanup_cmd);
										execSync(cleanup_cmd);
									}
								});
							}
						}
					});
					
					return empty;
				}
			} as CommandExecutor, undefined));
		} else {
			log("runner", "Runner is only supported on linux!");
		}
	},

	reload() {

	}
} as Plugin;