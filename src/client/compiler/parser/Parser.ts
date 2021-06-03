import { timers } from "jquery";
import { Error, QuickFix, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token, TokenList, TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ASTNode, BracketsNode, SelectNode, TermNode, TableOrSubqueryNode, TableNode, SubqueryNode, GroupByNode, OrderByNode, LimitNode, IdentifierNode, DotNode, ListNode, ColumnNode } from "./AST.js";
import { Module } from "./Module.js";
import { Column } from "./SQLTable.js";

type ASTNodes = ASTNode[];

type TokenTreeNode = {
    type: "sequence" | "alternatives",
    children: (TokenTreeNode | TokenType)[]
} | TokenType;


export class Parser {

    static operatorPrecedence: TokenType[][] = [
        [TokenType.keywordOr], [TokenType.keywordAnd],
        [TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual, TokenType.equal, TokenType.notEqual],
        [TokenType.concatenation, TokenType.plus, TokenType.minus], [TokenType.multiplication, TokenType.division, TokenType.modulo],
        [TokenType.keywordIn, TokenType.keywordNotIn]
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

        m.completionHints = new Map();

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

    expect(tt: TokenType | TokenType[], skip: boolean = true, invokeSemicolonAngel: boolean = false): boolean {
        if (this.tt != tt && !(Array.isArray(tt) && tt.indexOf(this.tt) >= 0)) {
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

            if (Array.isArray(tt)) {
                let expectedTokens = tt.map(token => TokenTypeReadable[token]).join(", ");
                this.pushError("Erwartet wird eines der folgenden: " + expectedTokens + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            } else {
                this.pushError("Erwartet wird: " + TokenTypeReadable[tt] + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            }

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

        let afterLastStatement: TextPosition = {
            column: 0,
            line: 0,
            length: 0
        }

        while (!this.isEnd()) {

            let oldPos = this.pos;

            this.module.addCompletionHint(afterLastStatement, this.getCurrentPosition(),false, false,["select", "update", "create table", "insert into"]);

            let st = this.parseStatement();

            afterLastStatement = {
                line: this.lastToken.position.line,
                column: this.lastToken.position.column + this.lastToken.position.length,
                length: 0
            }
            
            while (this.tt == TokenType.semicolon) {
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

        this.module.addCompletionHint(afterLastStatement, {line: mainProgramEnd.line + 10, column: 0, length: 0},false, false,["select", "update", "create table", "insert into"]);

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

    parseSelect(): SelectNode {
        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "select"

        let columnListStart = this.getCurrentPosition();

        let node: SelectNode = {
            type: TokenType.keywordSelect,
            position: startPosition,
            endPosition: this.getCurrentPosition(),
            symbolTable: null,
            columnList: [],
            fromNode: null,
            whereNode: null,
            parentStatement: null
        }

        node.columnList = this.parseColumnList([TokenType.keywordFrom], true);

        let columnListKeywordArray = ["distinct", "as"];
        this.module.addCompletionHint(columnListStart, this.getCurrentPosition(), true, true, columnListKeywordArray)
        
        // parse from ...
        if (!this.expect(TokenType.keywordFrom, true)) {
            columnListKeywordArray.push("from");
            return null;
        }
        
        node.fromStartPosition = {line: this.lastToken.position.line, column: this.lastToken.position.column + this.lastToken.position.length, length: 0};
        node.fromNode = this.parseTableOrSubQuery();

        let fromListKeywordArray = ["join", "left", "right", "inner", "outer", "natural", "on", "as"];
        this.module.addCompletionHint(node.fromStartPosition, this.getCurrentPosition(), false, true, fromListKeywordArray)
        node.fromEndPosition = this.getCurrentPosition();

        // parse where...

        let whereKeywordArray = ["like"];
        if (this.tt == TokenType.keywordWhere) {
            let position = this.getCurrentPosition();
            let whereStart = this.getCurrentPosition();
            this.nextToken();
            node.whereNode = this.parseTerm();
            this.module.addCompletionHint(whereStart, this.getCurrentPosition(), true, true, whereKeywordArray)
                if (node.whereNode != null) node.whereNode.position = position;
        } else {
            fromListKeywordArray.push("where");
        }

        let groupKeywordArray = [];
        if (this.tt == TokenType.keywordGroup) {
            let groupStart = this.getCurrentPosition();
            node.groupByNode = this.parseGroupBy();
            this.module.addCompletionHint(groupStart, this.getCurrentPosition(), true, true, groupKeywordArray);
        } else {
            whereKeywordArray.push("group by");
        }

        if (this.tt == TokenType.keywordOrder) {
            let orderStart = this.getCurrentPosition();
            node.orderByNode = this.parseOrderBy();
            this.module.addCompletionHint(orderStart, this.getCurrentPosition(), true, true, ["asc", "desc"]);
        } else {
            whereKeywordArray.push("order by");
            groupKeywordArray.push("order by");
        }

        if (this.tt == TokenType.keywordLimit) {
            node.limitNode = this.parseLimit();
        } 

        node.endPosition = this.getCurrentPosition();

        return node;
    }

    parseLimit(): LimitNode {
        let position = this.getCurrentPosition();
        let numberOfRows: TermNode = this.parseTerm();
        let ln: LimitNode = {
            type: TokenType.keywordLimit,
            position: position,
            numberOfRows: numberOfRows
        }
        if (this.tt = TokenType.keywordOffset) {
            this.nextToken();
            ln.offset = this.parseTerm();
        }
        return ln;
    }

    parseGroupBy(): GroupByNode {
        let position = this.getCurrentPosition();
        this.expect(TokenType.keywordGroup, true);
        this.expect(TokenType.keywordBy, true);
        let gbn: GroupByNode = {
            type: TokenType.keywordGroup,
            columnList: [],
            position: position
        }
        let tokenTypesAfterGroupBy = [TokenType.keywordHaving, TokenType.keywordSelect, TokenType.keywordOrder, TokenType.keywordLimit, TokenType.rightBracket, TokenType.semicolon];
        gbn.columnList = this.parseColumnList(tokenTypesAfterGroupBy, false).map(columnNode => columnNode.term);
        if (this.tt == TokenType.keywordHaving) {
            this.nextToken();
            gbn.having = this.parseTerm();
        }
        return gbn;
    }

    parseOrderBy(): OrderByNode[] {
        this.expect(TokenType.keywordOrder, true);
        this.expect(TokenType.keywordBy, true);

        let obnList: OrderByNode[] = [];
        let first: boolean = true;

        do {
            if (first) {
                first = false;
            } else {
                this.expect(TokenType.comma, true);
            }
            let column: TermNode = this.parseTerm();
            let obn: OrderByNode = {
                type: TokenType.keywordOrder,
                position: this.getCurrentPosition(),
                column: column
            }
            if ([TokenType.keywordAscending, TokenType.keywordDescending].indexOf(this.tt) >= 0) this.nextToken();
            if (this.tt == TokenType.keywordNulls) {
                this.nextToken();
                this.expect([TokenType.keywordFirst, TokenType.keywordLast], true);
            }
            obnList.push(obn);
        } while (this.tt == TokenType.comma);

        return obnList;
    }

    parseTableOrSubQuery(): TableOrSubqueryNode {

        let leftSide: TableOrSubqueryNode = this.parseAtomicTableOrSubQuery();

        let position = this.getCurrentPosition();

        while (this.parseJoinOperator()) {

            let rightSide: TableOrSubqueryNode = this.parseAtomicTableOrSubQuery();

            leftSide = {
                type: TokenType.keywordJoin,
                firstOperand: leftSide,
                secondOperand: rightSide,
                position: position,
            }

            if (this.tt == TokenType.keywordOn) {
                leftSide.on = this.parseTerm();
            }

        }

        return leftSide;

    }

    parseJoinOperator(): boolean {
        if (this.tt == TokenType.comma){
            this.nextToken();
            return true;
        } 
        if (this.tt == TokenType.keywordNatural) this.nextToken();
        switch (this.tt) {
            case TokenType.keywordLeft:
                this.nextToken();
                //@ts-ignore
                if (this.tt == TokenType.keywordOuter) this.nextToken();
                return this.expect(TokenType.keywordJoin, true);
            case TokenType.keywordInner:
            case TokenType.keywordCross:
                this.nextToken();
                return this.expect(TokenType.keywordJoin, true);
            case TokenType.keywordJoin:
                this.nextToken();
                return true;
            default: return false;
        }
    }

    parseAtomicTableOrSubQuery(): TableOrSubqueryNode {

        if (!this.expect([TokenType.identifier, TokenType.leftBracket], false)) {
            return null;
        }

        if (this.tt == TokenType.leftBracket) {
            this.nextToken();
            let ret: TableOrSubqueryNode;
            //@ts-ignore
            if (this.tt == TokenType.keywordSelect) {
                let position = this.getCurrentPosition();
                let selectStatement = this.parseSelect();
                ret = {
                    type: TokenType.subquery,
                    alias: null,
                    position: position,
                    query: selectStatement
                }
            } else {
                ret = this.parseTableOrSubQuery();
            }
            this.expect(TokenType.rightBracket, true);


            //@ts-ignore
            if (this.tt == TokenType.keywordAs && ret.type == TokenType.subquery) {
                this.nextToken();
                if (this.expect(TokenType.identifier, false)) {
                    ret.alias = <string>this.cct.value;
                    this.nextToken();
                }
            }

            return ret;
        }

        if (this.tt == TokenType.identifier) {
            let node: TableNode = {
                type: TokenType.table,
                identifier: <string>this.cct.value,
                alias: null,
                position: this.getCurrentPosition()
            }
            this.nextToken();

            //@ts-ignore
            if (this.tt == TokenType.keywordAs) {
                this.nextToken();
                if (this.expect(TokenType.identifier, false)) {
                    node.alias = <string>this.cct.value;
                    this.nextToken();
                }
            }

            return node;
        }

    }


    parseColumnList(tokenTypesAfterListEnd: TokenType[], allowAliases: boolean): ColumnNode[] {
        let columns: ColumnNode[] = [];

        while ([TokenType.identifier, TokenType.multiplication, TokenType.leftBracket].indexOf(this.tt) >= 0) {
            if (this.tt == TokenType.multiplication) {
                columns.push({
                    term: null,
                    alias: null,
                    position: this.getCurrentPosition(),
                    type: TokenType.allColumns
                });
                this.nextToken();
            } else {
                let columnTerm = this.parseTerm();
                if (columnTerm != null) {
                    let column: ColumnNode = {
                        type: TokenType.column,
                        term: columnTerm,
                        position: columnTerm.position
                    }
                    columns.push(column);
                    if (this.comesToken(TokenType.keywordAs)) {
                        this.nextToken();
                        if (this.expect(TokenType.identifier, false)) {
                            column.alias = "" + this.cct.value;
                        }
                        this.nextToken();
                    }
                }
            }
            if (tokenTypesAfterListEnd.indexOf(this.tt) >= 0) {
                break;
            }
            this.expect(TokenType.comma, true);
        }

        if (columns.length == 0) {
            this.pushError("Es fehlt die kommaseparierte Liste der gewünschten Spalten.", "error");
        }

        return columns;
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
                return this.parseBracket();
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
                    if (this.tt == TokenType.dot) {
                        let position = this.getCurrentPosition();
                        this.nextToken();
                        this.expect(TokenType.identifier, false);
                        let secondIdentifier: IdentifierNode = {
                            type: TokenType.identifier,
                            identifier: <string>this.cct.value,
                            position: this.getCurrentPosition()
                        }
                        this.nextToken();
                        term = {
                            type: TokenType.dot,
                            identifierLeft: <IdentifierNode>term,
                            identifierRight: secondIdentifier,
                            position: position
                        }

                    }
                }

                return term;
            default:
                this.pushError("Erwartet wird eine Variable, ein Methodenaufruf oder eine Konstante. Gefunden wurde: " + this.cct.value);
                return null;
        }

    }

    parseList(): ListNode {
        let node: ListNode = {
            type: TokenType.list,
            position: this.getCurrentPosition(),
            elements: []
        }

        let constantTypes = [TokenType.charConstant, TokenType.stringConstant, TokenType.booleanConstant, TokenType.floatingPointConstant, TokenType.integerConstant];

        while (constantTypes.indexOf(this.tt) >= 0) {
            node.elements.push({
                type: TokenType.constantNode,
                constant: this.cct.value,
                constantType: this.tt,
                position: this.cct.position
            });
            this.nextToken();
            if (this.tt != TokenType.comma) {
                break;
            }
            this.nextToken();
        }

        return node;
    }

    parseBracket(): TermNode {

        let position = this.getCurrentPosition();
        let tokenBeforeBracket = this.lastToken;
        this.nextToken(); // consume (

        if (this.tt == TokenType.keywordSelect) {
            let selectNode = this.parseSelect();
            this.expect(TokenType.rightBracket, true);
            return selectNode;
        } else if ([TokenType.comma, TokenType.rightBracket].indexOf(this.ct[1].tt) >= 0 &&
            [TokenType.keywordIn, TokenType.keywordNotIn].indexOf(tokenBeforeBracket.tt) >= 0) {
            let listNode = this.parseList();
            this.expect(TokenType.rightBracket, true);
            return listNode;
        } else {
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

            if (this.tt == TokenType.multiplication) {
                this.nextToken();
                parameters.push({
                    type: TokenType.allColumns,
                    position: this.getCurrentPosition(),
                });
            } else {
                let parameter = this.parseTerm();
                if (parameter != null) {
                    parameters.push(parameter);
                }
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