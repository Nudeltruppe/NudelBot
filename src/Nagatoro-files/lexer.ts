// Consts
const DIGITS: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const NUMBERS: string = "0123456789"
const OPS: string = "=|&<>:'"

const TT_OP: string = "OP"    // not Done
const TT_ID: string = "ID"    // not Done
const TT_INT: string = "INT"    // not Done
const TT_FLOAT: string = "FLOAT"    // not Done
const TT_PLUS: string = "PLUS"    // not Done
const TT_MINUS: string = "MINUS"    // not Done
const TT_MUL: string = "MUL"    // not Done
const TT_DIV: string = "DIV"    // not Done
const TT_POW: string = "POW"    // not Done
const TT_LPAREN: string = "LPAREN"    // not Done
const TT_RPAREN: string = "RPAREN"    // not Done
const TT_NEWLN: string = "NEWLN"    // not Done
const TT_LCURL: string = "LCURL"    // not Done
const TT_RCURL: string = "RCURL"    // not Done
// !Consts

class Token {
    type: string;
    value: string;
    constructor(type: string, vlaue: string) {
        this.type = type;
        this.value = vlaue;
    }
}

class Lexer {
    // Initialize the text and idx
    private text: string;
    private idx: number;
    private current_char: string;
    private err: boolean;

    constructor(text: string, ) {
        this.text = text;
        this.idx = -1;
        // advance() once to set the current char and the idx
        this.current_char = "";
        this.err = false
        this.advance();
    }

    // Advances to the next char
    private advance() {
        this.idx += 1
        this.current_char = this.idx < this.text.length ? this.text[this.idx] : "";
    }

    public got_err() {
        return this.err;
    }

    public lex() {
        var tokens: Array<Token> = [];
        while (this.current_char != "") {
            this.advance()
            if (this.current_char == " " || this.current_char == "\t") {
                this.advance()
            }
            else if (this.is_digit(this.current_char)) {
                tokens.push(this.get_id())
            }
            else {
                this.err = true;
                break
            }
        }
        return tokens;
    }

    private is_digit(c_char: string) {
        for (var i: number = 0; i < DIGITS.length; i++) {
            if (c_char == DIGITS[i]) {
                return true;
            }
        }
        return false;
    }

    private get_id() {
        this.advance()
        var id_str: string = ""
        while (this.current_char != "" && this.is_digit(this.current_char)) {
            id_str += this.current_char;
            this.advance()
        }

        return new Token(TT_ID, id_str);
    }

}
export {Lexer}
export {Token}