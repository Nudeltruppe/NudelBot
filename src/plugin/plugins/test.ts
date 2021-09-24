import { load_auth_api } from "../../api/authentication";
import { Command, CommandEvent, CommandResponse } from "../../command/command";
import { get_command_manager } from "../../global";
import { Plugin } from "../plugin";

// Export the plugin as such
export default {
    // Define the name and Version
    name: "Test script",
    version: "0.0.1",

    // load in async
    async load() {
        // Add a command with command tag (hey) command description short and long as well as the code that it executes
        get_command_manager().add_command(new Command("hey", "Just say Hey!", "#hey to get a hartwarming message!", {
            execute: async (): Promise<CommandResponse> => {
                // Return a response that gets printed
                return {
                    is_response: true,
                    response: "You suck lolololol"
                };
            }
        }, undefined));
    },
    reload() {
    }
} as Plugin;