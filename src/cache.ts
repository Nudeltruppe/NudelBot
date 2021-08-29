import { FSWatcher, readFileSync, watch } from 'fs';
import { log } from './logger';

export class FileCache {
	file: string;
	file_cache: object;
	watch: FSWatcher;

	constructor(file: string) {
		this.file = file;

		this.file_cache = JSON.parse(readFileSync(this.file).toString());

		this.watch = watch(this.file, () => {
			log("cache", "Reloading file " + this.file);
			this.file_cache = JSON.parse(readFileSync(this.file).toString());
		});
	}
}