import { load_auth_api } from "../../api/authentication";
import { Command, CommandEvent, CommandResponse } from "../../command/command";
import { get_command_manager } from "../../global";
import { Plugin } from "../plugin";

export default {
    name: "Test script",
    version: "0.0.1",

    async load() {
        get_command_manager().add_command(new Command("test", "Just a test", "i will say it once more... ITS A FUCKING TEST", {
            execute: async (): Promise<CommandResponse> => {
                return {
                    is_response: true,
                    response: "Hello sir!"
                };
            }
        }, undefined));
    },
    reload() {
    }
} as Plugin;