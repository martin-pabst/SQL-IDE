import { Error, QuickFix, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token, TokenList, TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ASTNode, BracketsNode, TermNode } from "./AST.js";
import { Module } from "./Module.js";

type ASTNodes = ASTNode[];

export class Parser {

    static operatorPrecedence: TokenType[][] = [
        [TokenType.keywordOr], [TokenType.keywordAnd],
        [TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual, TokenType.equal, TokenType.notEqual],
        [TokenType.concatenation, TokenType.plus, TokenType.minus], [TokenType.multiplication, TokenType.division, TokenType.modulo]
    ];

    module: Module;

    pos: number;
    tokenList: TokenList;

    errorList: Error[];

    lookahead = 4;
    ct: Token[];
    lastToken: Token;
    cct: Token;
    tt: TokenType;
    position: TextPosition;
    lastComment: Token;

    endToken: Token = {
        position: { line: 0, column: 0, length: 1 },
        tt: TokenType.endofSourcecode,
        value: "das Ende des Programms"
    };


    constructor(private isInConsoleMode: boolean) {

    }

    parse(m: Module) {

        this.module = m;

        this.tokenList = m.tokenList;
        this.errorList = [];

        if (this.tokenList.length == 0) {
            this.module.mainProgramAst = [];
            this.module.errors[1] = this.errorList;
            return;
        }

        this.pos = 0;
        this.initializeLookahead();


        let lastToken = this.tokenList[this.tokenList.length - 1];
        this.endToken.position = { line: lastToken.position.line, column: lastToken.position.column + lastToken.position.length, length: 1 };

        let astNodes = this.parseMain();
        this.module.mainProgramAst = astNodes.mainProgramAST;

        this.module.errors[1] = this.errorList;

    }

    initializeLookahead() {

        this.ct = [];

        for (let i = 0; i < this.lookahead; i++) {

            let token: Token = this.endToken;

            while (true) {

                if (this.pos >= this.tokenList.length) break;

                let token1 = this.tokenList[this.pos]
                if (token1.tt == TokenType.comment) {
                    this.lastComment = token1;
                }

                if (token1.tt != TokenType.newline && token1.tt != TokenType.space && token1.tt != TokenType.comment) {
                    token = token1;
                    if (this.lastComment != null) {
                        token.commentBefore = this.lastComment;
                        this.lastComment = null;
                    }
                    break;
                }

                this.pos++;

            }

            this.ct.push(token);

            if (i < this.lookahead - 1) {
                this.pos++;
            }

        }

        this.cct = this.ct[0];
        this.tt = this.cct.tt;
        this.position = this.cct.position;

    }

    nextToken() {

        let token: Token;
        this.lastToken = this.cct;

        while (true) {

            this.pos++;

            if (this.pos >= this.tokenList.length) {
                token = this.endToken;
                break;
            }

            token = this.tokenList[this.pos]
            if (token.tt == TokenType.comment) {
                this.lastComment = token;
            }

            if (token.tt != TokenType.newline && token.tt != TokenType.space && token.tt != TokenType.comment) {
                token.commentBefore = this.lastComment;
                this.lastComment = null;
                break;
            }

        }

        for (let i = 0; i < this.lookahead - 1; i++) {
            this.ct[i] = this.ct[i + 1];
        }

        this.ct[this.lookahead - 1] = token;

        this.cct = this.ct[0];
        this.tt = this.cct.tt;
        this.position = this.cct.position;

    }

    pushError(text: string, errorLevel: ErrorLevel = "error", position?: TextPosition, quickFix?: QuickFix) {
        if (position == null) position = Object.assign({}, this.position);
        this.errorList.push({
            text: text,
            position: position,
            quickFix: quickFix,
            level: errorLevel
        });
    }

    expect(tt: TokenType, skip: boolean = true, invokeSemicolonAngel: boolean = false): boolean {
        if (this.tt != tt) {
            if (tt == TokenType.semicolon && this.tt == TokenType.endofSourcecode) {
                return true;
            }

            let position: TextPosition = this.cct.position;
            if (tt == TokenType.semicolon && this.lastToken != null) {

                if (this.lastToken.position.line < position.line) {
                    position = {
                        line: this.lastToken.position.line,
                        column: this.lastToken.position.column + this.lastToken.position.length,
                        length: 1
                    }
                }
            }

            let quickFix: QuickFix = null;
            if (tt == TokenType.semicolon && this.lastToken.position.line < this.cct.position.line &&
                !this.isOperatorOrDot(this.lastToken.tt)
            ) {
                quickFix = {
                    title: 'Strichpunkt hier einfügen',
                    editsProvider: (uri) => {
                        return [{
                            resource: uri,
                            edit: {
                                range: {
                                    startLineNumber: position.line, startColumn: position.column, endLineNumber: position.line, endColumn: position.column,
                                    message: "",
                                    severity: monaco.MarkerSeverity.Error
                                },
                                text: ";"
                            }
                        }
                        ];
                    }
                }

                if (invokeSemicolonAngel) {
                    this.module.main.getSemicolonAngel().register(position, this.module);
                }
            }


            this.pushError("Erwartet wird: " + TokenTypeReadable[tt] + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            return false;
        }

        if (skip) {
            this.nextToken();
        }

        return true;
    }
    isOperatorOrDot(tt: TokenType): boolean {
        if (tt == TokenType.dot) return true;
        for (let op of Parser.operatorPrecedence) {
            for (let operator of op) {
                if (tt == operator) return true;
            }
        }
    }

    isEnd(): boolean {
        return this.cct == this.endToken;
    }

    comesToken(token: TokenType | TokenType[]): boolean {

        if (!Array.isArray(token)) {
            return this.tt == token;
        }

        return token.indexOf(this.tt) >= 0;

    }

    getCurrentPosition(): TextPosition {
        return Object.assign({}, this.position);
    }

    getEndOfCurrentToken(): TextPosition {

        let position = this.getCurrentPosition();
        position.column = position.column + this.position.length;
        position.length = 0;

        return position;
    }

    parseMain(): { mainProgramAST: ASTNodes, mainProgramEnd: TextPosition } {

        let mainProgram: ASTNodes = [];

        let mainProgramEnd: TextPosition = {
            column: 0,
            line: 10000,
            length: 1
        }

        while (!this.isEnd()) {

            let oldPos = this.pos;

            let st = this.parseStatement();

            if (st != null) {
                mainProgram = mainProgram.concat(st);
            }
            mainProgramEnd = this.getCurrentPosition();

            // emergency-forward:
            if (this.pos == oldPos) {
                this.pos++;
                this.initializeLookahead();
            }

        }

        return {
            mainProgramAST: mainProgram,
            mainProgramEnd: mainProgramEnd
        }

    }



    parseStatement(expectSemicolon: boolean = true): ASTNode[] {

        let retStatements: ASTNode[] = [];

        switch (this.tt) {
            case TokenType.keywordSelect:
                // restStatements = ...
                break;
            default:
                let s = TokenTypeReadable[this.tt];
                if (s != this.cct.value) s += "(" + this.cct.value + ")";
                s += " wird hier nicht erwartet.";
                this.pushError(s);
                this.nextToken();
                break;
        }


        return retStatements;

    }


    parseTerm(): TermNode {
        return this.parseTermBinary(0);
    }

    parseTermBinary(precedence: number): TermNode {

        let left: TermNode;
        if (precedence < Parser.operatorPrecedence.length - 1) {
            left = this.parseTermBinary(precedence + 1);
        } else {
            left = this.parseUnary();
        }

        let operators = Parser.operatorPrecedence[precedence];

        if (left == null || operators.indexOf(this.tt) < 0) {
            return left;
        }

        let first = true;

        while (first || operators.indexOf(this.tt) >= 0) {

            let operator: TokenType = this.tt;

            first = false;
            let position = this.getCurrentPosition();

            this.nextToken();

            let right: TermNode;
            if (precedence < Parser.operatorPrecedence.length - 1) {
                right = this.parseTermBinary(precedence + 1);
            } else {
                right = this.parseUnary();
            }

            left = {
                type: TokenType.binaryOp,
                position: position,
                operator: operator,
                firstOperand: left,
                secondOperand: right
            };
        }

        return left;

    }


    // -, not, this, super, a.b.c[][].d, a.b(), b() (== this.b()), super.b(), super()
    parseUnary(): TermNode {

        let term: TermNode;
        let position: TextPosition = this.getCurrentPosition();

        switch (this.tt) {
            case TokenType.leftBracket:
                return this.parseDotOrArrayChains(this.bracketOrCasting());
            case TokenType.minus:
                // case TokenType.not:
                position = position;
                let tt1 = this.tt;
                this.nextToken();
                term = this.parseUnary();

                return {
                    type: TokenType.unaryOp,
                    position: position,
                    operand: term,
                    operator: tt1
                };

            case TokenType.integerConstant:
            case TokenType.charConstant:
            case TokenType.floatingPointConstant:
            case TokenType.stringConstant:
            case TokenType.booleanConstant:
                term = {
                    type: TokenType.constantNode,
                    position: this.getCurrentPosition(),
                    constantType: this.tt,
                    constant: this.cct.value
                };
                let isStringConstant = this.tt == TokenType.stringConstant;
                this.nextToken();

                if (isStringConstant) return this.parseDotOrArrayChains(term);

                return term;
            case TokenType.identifier: // attribute of current class or local variable

                let identifier1 = <string>this.cct.value;
                let position1 = this.getCurrentPosition();

                this.nextToken();
                //@ts-ignore
                if (this.tt == TokenType.leftBracket) {
                    let parameters = this.parseMethodCallParameters();
                    let rightBracketPosition = parameters.rightBracketPosition;

                    term = {
                        type: TokenType.callMethod,
                        position: position1,
                        rightBracketPosition: rightBracketPosition,
                        operands: parameters.nodes,
                        identifier: identifier1,
                        commaPositions: parameters.commaPositions
                    }
                } else {
                    term = {
                        type: TokenType.identifier,
                        identifier: identifier1,
                        position: position
                    }
                }

                return this.parseDotOrArrayChains(term);
            default:
                this.pushError("Erwartet wird eine Variable, ein Methodenaufruf oder this oder super. Gefunden wurde: " + this.cct.value);
                return null;
        }

    }

    bracketOrCasting(): TermNode {

        let position = this.getCurrentPosition();

        this.nextToken(); // consume (


        let term = this.parseTerm();
        let rightBracketPosition = this.getCurrentPosition();
        this.expect(TokenType.rightBracket, true);

        let bracketsNode: BracketsNode = {
            position: rightBracketPosition,
            type: TokenType.rightBracket,
            termInsideBrackets: term
        }


        return bracketsNode;


    }


    parseMethodCallParameters(): { rightBracketPosition: TextPosition, nodes: TermNode[], commaPositions: TextPosition[] } {
        // Assumption: current token is (        
        this.nextToken();
        if (this.tt == TokenType.rightBracket) {
            let rightBracketPosition = this.getCurrentPosition();
            this.nextToken();
            return { rightBracketPosition: rightBracketPosition, nodes: [], commaPositions: [] };
        }

        let parameters: TermNode[] = [];
        let commaPositions: TextPosition[] = [];

        while (true) {
            let pos = this.pos;

            let parameter = this.parseTerm();
            if (parameter != null) {
                parameters.push(parameter);
            }

            if (this.tt != TokenType.comma) {
                break;
            } else {
                commaPositions.push(this.getCurrentPosition());
                this.nextToken(); // consume comma
            }

            // emergency-step:
            if (this.pos == pos) {
                this.nextToken();
            }

        }

        let position = this.getCurrentPosition();
        let rightBracketFound = this.expect(TokenType.rightBracket, true);

        return { rightBracketPosition: rightBracketFound ? position : null, nodes: parameters, commaPositions: commaPositions };

    }

    parseDotOrArrayChains(term: TermNode): TermNode {

        if (term == null) return null;

        while (this.comesToken([TokenType.dot, TokenType.leftSquareBracket])) {
            if (this.tt == TokenType.dot) {

                this.nextToken();
                //@ts-ignore
                if (this.tt != TokenType.identifier) {
                    this.pushError("Erwartet wird der Bezeichner eines Attributs oder einer Methode, gefunden wurde: " + this.cct.value);
                    return term;
                }

                let identifier = <string>this.cct.value;
                let position = this.getCurrentPosition();
                this.nextToken();
                //@ts-ignore
                if (this.tt == TokenType.leftBracket) {
                    let parameters = this.parseMethodCallParameters();
                    term = {
                        type: TokenType.callMethod,
                        position: position,
                        rightBracketPosition: parameters.rightBracketPosition,
                        operands: parameters.nodes,
                        identifier: identifier,
                        commaPositions: parameters.commaPositions
                    }
                } 
                // else {
                //     term = {
                //         type: TokenType.pushAttribute,
                //         position: position,
                //         identifier: identifier,
                //         object: term
                //     }
                // }

            }
        }

        return term;
    }


}