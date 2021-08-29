import { appendFileSync, existsSync, mkdirSync } from "fs";

export function log(module: string, message: string): void  {
	console.log(`[${module}] ${message}`);
	if (!existsSync("./logs/")) {
		mkdirSync("./logs/");
	}

	appendFileSync(`./logs/${module}.txt`, `[${new Date().toLocaleString()}] ${message}\n`);
}