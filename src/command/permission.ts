import { writeFileSync } from "fs";
import { Config } from "../config";
import { get_config_cache } from "../global";

export function check_permission(user: string, permission: string|undefined): boolean {

	var loaded_user = (get_config_cache().file_cache as Config).users.find(u => u.user === user);

	if (loaded_user === undefined) {
		var tmp = get_config_cache().file_cache as Config;
		tmp.users.push({ user: user, perms: Object.assign([], tmp.default_perms) });
		writeFileSync(get_config_cache().file, JSON.stringify(tmp, null, 4));

		if (permission === undefined) {
			return true;
		}

		return tmp.default_perms.indexOf(permission) !== -1;
	} else {
		if (permission === undefined) {
			return true;
		}
		
		return loaded_user.perms.indexOf(permission) !== -1;
	}
}

export function get_roles(user: string): string[] {
	var loaded_user = (get_config_cache().file_cache as Config).users.find(u => u.user === user);

	if (loaded_user === undefined) {
		var tmp = get_config_cache().file_cache as Config;
		tmp.users.push({ user: user, perms: Object.assign([], tmp.default_perms) });
		writeFileSync(get_config_cache().file, JSON.stringify(tmp, null, 4));

		return tmp.default_perms;
	} else {
	
		return loaded_user.perms;
	}
}

export function push_role(user: string, permission: string): void  {
	var loaded_user = (get_config_cache().file_cache as Config).users.find(u => u.user === user);

	if (loaded_user === undefined) {
		var tmp = get_config_cache().file_cache as Config;
		var index = tmp.users.push({ user: user, perms: Object.assign([], tmp.default_perms) });
		tmp.users[index].perms.push(permission);
		writeFileSync(get_config_cache().file, JSON.stringify(tmp, null, 4));
	} else {
		loaded_user.perms.push(permission);
		writeFileSync(get_config_cache().file, JSON.stringify(get_config_cache().file_cache, null, 4));
	}
}

export function remove_role(user: string, permission: string): void  {
	var loaded_user = (get_config_cache().file_cache as Config).users.find(u => u.user === user);

	if (loaded_user === undefined) {
		var tmp = get_config_cache().file_cache as Config;
		var index = tmp.users.push({ user: user, perms: Object.assign([], tmp.default_perms) });

		var permission_to_remove = tmp.users[index].perms.indexOf(permission);

		if (permission_to_remove == -1) {
			throw new Error("Permission not found");
		}

		tmp.users[index].perms.splice(permission_to_remove, 1);

		writeFileSync(get_config_cache().file, JSON.stringify(tmp, null, 4));
	} else {
		var permission_to_remove = loaded_user.perms.indexOf(permission);
		if (permission_to_remove == -1) {
			throw new Error("Permission not found");
		}
		loaded_user.perms.splice(permission_to_remove, 1);
		
		writeFileSync(get_config_cache().file, JSON.stringify(get_config_cache().file_cache, null, 4));
	}
}