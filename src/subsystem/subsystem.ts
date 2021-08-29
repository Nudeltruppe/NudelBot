interface Subsystem {
	name: string;
	load(): boolean;
	unload(): Promise<void>;
}