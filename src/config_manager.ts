import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { export_configs, import_configs } from "./config";
import { log } from "./logger";

if (process.argv.length != 4) {
	console.log("Usage: node config_manager.js [import/export][file]");
	process.exit(1);
}

switch (process.argv[2]) {
	case "import":
		{
			const file = process.argv[3];
			log("config_manager", `Importing config from ${file}`);

			if (file.startsWith("http")) {
				log("config_manager", "Downloading config from URL");
				fetch(file).then((res) => res.json()).then((json) => {
					import_configs(json);
				});
			} else {
				import_configs(JSON.parse(readFileSync(file).toString()));
			}
		}
		break;

	case "export":
		{
			const file = process.argv[3];
			log("config_manager", `Exporting config to ${file}`);

			writeFileSync(file, JSON.stringify(export_configs(), null, 4));
		}
		break;

	default:
		log("config_manager", "Unknown command: " + process.argv[2]);
		break;
}