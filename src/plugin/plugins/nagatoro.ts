import { Lexer } from "../../Nagatoro-files/lexer";
import { Token } from "../../Nagatoro-files/lexer";
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
        get_command_manager().add_command(new Command("nagator", "Just say Hey!", "#hey to get a hartwarming message!", {
            execute: async (event: CommandEvent): Promise<CommandResponse> => {
                // Return a response that gets printed
                if (event.interface.args.length < 1) {
                    return {
                        is_response: true,
                        response: "Error no code specified"
                    };
                } else {
                
                var lex: Lexer = new Lexer("sdjfbhjslhgd")
                var lexer: Array<Token> = lex.lex()
                var err: boolean = lex.got_err()
                
                return {
                    is_response: true,
                    response: ("" + lexer + "\n\n\n\n" + err)
                };
            }
        }
    }, undefined));
},
reload() {
}
} as Plugin;