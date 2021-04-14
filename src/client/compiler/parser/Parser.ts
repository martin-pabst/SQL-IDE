import { Error, QuickFix, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token, TokenList, TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ASTNode, BracketsNode, SelectNode, TermNode } from "./AST.js";
import { Module } from "./Module.js";
import { Column } from "./SQLTable.js";

type ASTNodes = ASTNode[];

export class Parser {

    static operatorPrecedence: TokenType[][] = [
        [TokenType.keywordJoin, TokenType.keywordLeft, TokenType.keywordRight, TokenType.keywordOuter, TokenType.keywordInner],
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
            this.module.sqlStatements = [];
            this.module.errors[1] = this.errorList;
            return;
        }

        this.pos = 0;
        this.initializeLookahead();


        let lastToken = this.tokenList[this.tokenList.length - 1];
        this.endToken.position = { line: lastToken.position.line, column: lastToken.position.column + lastToken.position.length, length: 1 };

        let astNodes = this.parseMain();
        this.module.sqlStatements = astNodes.mainProgramAST;

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

            while(this.tt == TokenType.semicolon){
                this.nextToken();
            }

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



    parseStatement(expectSemicolon: boolean = true): ASTNode {

        let retStatements: ASTNode = null;

        switch (this.tt) {
            case TokenType.keywordSelect:
                return this.parseSelect();
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

    parseSelect(): ASTNode {
        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "select"

        // Parse Column List
        let columnList: TermNode[] = [];

        while ([TokenType.identifier, TokenType.multiplication, TokenType.leftBracket].indexOf(this.tt) >= 0) {
            if (this.tt == TokenType.multiplication) {
                columnList.push({
                    type: TokenType.multiplication,
                    position: this.getCurrentPosition(),
                });
                this.nextToken();
            } else {
                let column = this.parseTerm();
                if (column != null) {
                    columnList.push(column);
                }
            }
            if (this.tt == TokenType.keywordFrom) {
                break;
            }
            this.expect(TokenType.comma, true);
        }

        if(columnList.length == 0){
            this.pushError("Es fehlt die kommaseparierte Liste der gewünschten Spalten.", "error");
        }

        // parse from ...
        if (!this.expect(TokenType.keywordFrom, true)) {
            return null;
        }

        let tableList: TermNode[] = [];
        while ([TokenType.identifier, TokenType.leftBracket].indexOf(this.tt) >= 0) {
            let table = this.parseTerm();
            if (table != null) {
                tableList.push(table);
            }
            if (this.tt == TokenType.keywordWhere || this.tt == TokenType.semicolon) {
                break;
            }
            this.expect(TokenType.comma, true);
        }

        // parse where...

        let whereNode: TermNode = null;
        if(this.tt == TokenType.keywordWhere){
            this.nextToken();
            whereNode = this.parseTerm();
        }

        // TODO: Group by, having, order


        let node: SelectNode = {
            type: TokenType.keywordSelect,
            position: startPosition,
            endPosition: this.getCurrentPosition(),
            symbolTable: null,
            columnList: columnList,
            tableList: tableList,
            whereNode: whereNode,
            parentStatement: null,
            subQueries: []
        }

        return node;
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

            if (precedence == 0) {

                left = {
                    type: TokenType.keywordJoin,
                    position: position,
                    firstOperand: left,
                    secondOperand: null
                }

                let keywordJoinFound: boolean = false;
                while (Parser.operatorPrecedence[0].indexOf(this.tt) >= 0) {
                    switch (this.tt) {
                        case TokenType.keywordLeft:
                        case TokenType.keywordRight:
                            if (left.leftRight == null) {
                                left.leftRight = this.tt;
                            } else {
                                this.pushError("Ein Join kann nicht gleichzeitig left join und right join sein.", "error");
                            }
                            break;
                        case TokenType.keywordOuter:
                        case TokenType.keywordInner:
                            if (left.innerOuter == null) {
                                left.innerOuter = this.tt;
                            } else {
                                this.pushError("Ein Join kann nicht gleichzeitig inner join und outer join sein.", "error");
                            }
                            break;
                        case TokenType.keywordJoin:
                            if(keywordJoinFound){
                                this.pushError("Das Schlüsselwort join darf hier nicht doppelt vorkommen.", "error");
                            }
                            keywordJoinFound = true;
                            break;
                    }
                    this.nextToken();
                }

                left.secondOperand = this.parseUnary();   // only Table allowed

                if (this.tt == TokenType.keywordOn) {
                    this.nextToken();
                    left.on = this.parseTermBinary(1);
                }

            } else {
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



        }

        return left;

    }


    // -, not, this, super, a.b.c[][].d, a.b(), b() (== this.b()), super.b(), super()
    parseUnary(): TermNode {

        let term: TermNode;
        let position: TextPosition = this.getCurrentPosition();

        switch (this.tt) {
            case TokenType.leftBracket:
                return this.bracketOrCasting();
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
                    //@ts-ignore
                    if(this.tt == TokenType.dot){
                        if(this.expect(TokenType.identifier, false)){
                            
                        }

                    }
                }

                return term;
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