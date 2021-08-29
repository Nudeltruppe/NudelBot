export interface Plugin {
	name: string;
	version: string;

	load(): void;
	reload(): void;

	noload?: boolean;
}