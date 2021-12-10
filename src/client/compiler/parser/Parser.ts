import { param, timers } from "jquery";
import { Error, QuickFix, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token, TokenList, TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ASTNode, BracketsNode, SelectNode, TermNode, TableOrSubqueryNode, TableNode, SubqueryNode, GroupByNode, OrderByNode, LimitNode, IdentifierNode, DotNode, ListNode, ColumnNode, InsertNode, ConstantNode, UnaryOpNode, CreateTableNode, CreateTableColumnNode, ForeignKeyInfo, UpdateNode, DeleteNode, DropTableNode, AlterTableNode, AlterTableKind } from "./AST.js";
import { Module } from "./Module.js";
import { Column } from "./SQLTable.js";
import { SQLBaseType } from "./SQLTypes.js";

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
            this.module.addCompletionHint({ line: 0, column: 0, length: 0 }, { line: 20, column: 100, length: 0 }, false, false, ["select", "insert into", "update", "create table", "delete from", "alter table", "drop table"]);
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

            let expectedValuesArray: string[];

            if (Array.isArray(tt)) {
                expectedValuesArray = tt.map(token => TokenTypeReadable[token]);
                let expectedTokens = expectedValuesArray.join(", ");
                this.pushError("Erwartet wird eines der folgenden: " + expectedTokens + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            } else {
                expectedValuesArray = [TokenTypeReadable[tt]];
                this.pushError("Erwartet wird: " + TokenTypeReadable[tt] + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            }

            if (tt != TokenType.identifier) {
                this.module.addCompletionHint(this.getEndOfPosition(this.lastToken.position), this.getCurrentPositionPlus(1), false, false, expectedValuesArray);
            }

            return false;
        }

        if (skip) {
            this.nextToken();
        }

        return true;
    }

    getEndOfPosition(p: TextPosition): TextPosition {
        return {
            line: p.line,
            column: p.column + p.length,
            length: 0
        }
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

    comesToken(token: TokenType | TokenType[], skip: boolean = false): boolean {

        if (!Array.isArray(token)) {
            let ret: boolean = this.tt == token;
            if (ret && skip) this.nextToken();
            return ret;
        }

        return token.indexOf(this.tt) >= 0;

    }

    getCurrentPosition(): TextPosition {
        return Object.assign({}, this.position);
    }

    getCurrentPositionPlus(deltaColumns: number): TextPosition {
        let pos = this.getCurrentPosition();
        pos.column += deltaColumns;
        return pos;
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

            this.module.addCompletionHint(afterLastStatement, this.getCurrentPosition(), false, false, ["select", "update", "create table", "insert into"]);

            let st = this.parseStatement();

            afterLastStatement = {
                line: this.lastToken.position.line + 1,
                column: 0,
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
                let beginStatementTokens: TokenType[] =
                    [TokenType.keywordSelect, TokenType.keywordUpdate, TokenType.keywordCreate, TokenType.keywordInsert,
                    TokenType.keywordDelete, TokenType.keywordDrop, TokenType.keywordAlter];
                while (!this.isEnd() && beginStatementTokens.indexOf(this.tt) < 0) {
                    this.nextToken();
                }
            }

        }

        this.module.addCompletionHint(afterLastStatement, { line: mainProgramEnd.line + 10, column: 0, length: 0 }, false, false, ["select", "update", "create table", "insert into"]);

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
            case TokenType.keywordInsert:
                return this.parseInsert();
            case TokenType.keywordCreate:
                return this.parseCreateTable();
            case TokenType.keywordUpdate:
                return this.parseUpdate();
            case TokenType.keywordDelete:
                return this.parseDelete();
            case TokenType.keywordDrop:
                return this.parseDropTable();
            case TokenType.keywordAlter:
                return this.parseAlterTable();
            default:
                let s = TokenTypeReadable[this.tt];
                if (s == null) s = "";
                if (s != this.cct.value) s += "(" + this.cct.value + ")";
                s += " wird hier nicht erwartet.";
                this.pushError(s);
                this.nextToken();
                break;
        }


        return retStatements;

    }


    parseAlterTable(): AlterTableNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "Delete"

        let node: AlterTableNode = {
            type: TokenType.keywordAlter,
            kind: null,
            position: startPosition,
            endPosition: this.getEndOfPosition(this.getCurrentPosition()),
            symbolTable: null,
            tableIdentifier: null,
            tableIdentifierPosition: null,
        }

        if (!this.expect(TokenType.keywordTable, true)) {
            this.addCompletionHintHere(false, false, ["table"], 1);
        }

        this.addCompletionHintHere(false, true, [], 1);
        if (!this.expect(TokenType.identifier, false)) return node;

        node.tableIdentifier = <string>this.cct.value;
        node.tableIdentifierPosition = this.getCurrentPosition();
        this.nextToken();
        node.endPosition = this.getCurrentPosition();

        this.addCompletionHintHere(false, false, ["rename to", "rename column", "add column", "drop column"], 1);

        switch (this.tt) {
            case TokenType.keywordRename: this.parseRenameTableOrColumn(node); break;
            case TokenType.keywordAdd: this.parseAddColumn(node); break;
            case TokenType.keywordDrop: this.parseDropColumn(node); break;
            default:
                this.pushError("Erwartet wird rename to, rename column, add column oder drop column");
        }

        return node;
    }

    parseRenameTableOrColumn(node: AlterTableNode) {

        this.nextToken();
        if(!this.comesToken(TokenType.keywordTo)){
            this.addCompletionHintHere(node.tableIdentifier, false, ["column", "to"], 3);
        } 
        node.endPosition = this.getEndOfCurrentToken();

        switch (this.tt) {
            case TokenType.keywordTo:
                this.nextToken();
                node.endPosition = this.getEndOfCurrentToken();
                node.kind = "renameTable";
                if (this.comesToken(TokenType.identifier)) {
                    node.newTableName = <string>this.cct.value;
                    this.nextToken();
                    node.endPosition = this.getEndOfCurrentToken();
                } else {
                    this.pushError("Erwartet wird der neue Tabellenname.");
                }
                return;
            case TokenType.keywordColumn:
                this.nextToken();
                node.endPosition = this.getEndOfCurrentToken();
                this.addCompletionHintHere(node.tableIdentifier, false, [], 3);
                if (!this.comesToken(TokenType.identifier)) {
                    this.pushError("Erwartet wird der Name einer Spalte der Tabelle " + node.tableIdentifier + ".");
                    return;
                }
            case TokenType.identifier:
                node.kind = "renameColumn";
                node.oldColumnName = <string>this.cct.value;
                node.oldColumnPosition = this.getCurrentPosition();
                this.addCompletionHintHere(false, false, ["to"], 3);
                this.nextToken();
                node.endPosition = this.getEndOfCurrentToken();
                if (!this.expect(TokenType.keywordTo, true)) return;
                node.endPosition = this.getEndOfCurrentToken();
                if (this.comesToken(TokenType.identifier)) {
                    node.newColumnName = <string>this.cct.value;
                    this.nextToken();
                    node.endPosition = this.getEndOfCurrentToken();
                } else {
                    this.pushError("Erwartet wird der neue Spaltenname.");
                }
                return;
            default:
                this.pushError("Erwartet wird das Schlüsselwort 'to' (zum Umbenennen der Tabelle) oder das Schlüsselwor 'column' (zum Umbenennen einer Spalte).")
                return;
        }



    }


    parseDropColumn(node: AlterTableNode) {
        this.nextToken(); // skip 'drop'
        this.comesToken(TokenType.keywordColumn, true);
        node.oldColumnPosition = this.getCurrentPosition();
        this.addCompletionHintHere(node.tableIdentifier, false, [], 3);

        node.kind = "dropColumn";
        node.endPosition = this.getEndOfCurrentToken();

        if (this.comesToken(TokenType.identifier)) {
            node.oldColumnName = <string>this.cct.value;
            this.nextToken();
        } else {
            this.pushError("Erwartet wird der Bezeichner der Spalte, die gelöscht werden soll.");
        }

    }

    parseAddColumn(node: AlterTableNode) {
        this.nextToken(); // skip 'add'
        node.kind = "addColumn";
        this.comesToken(TokenType.keywordColumn, true);
        node.columnDefBegin = this.getCurrentPosition();
        node.columnDef = this.parseColumnDefinition(false);
    }

    parseDropTable(): DropTableNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "Delete"

        let node: DropTableNode = {
            type: TokenType.keywordDrop,
            position: startPosition,
            endPosition: this.getEndOfPosition(this.getCurrentPosition()),
            symbolTable: null,
            tableIdentifier: null,
            tableIdentifierPosition: null
        }

        if (!this.expect(TokenType.keywordTable, true)) {
            this.addCompletionHintHere(false, false, ["table"], 1);
        }

        this.addCompletionHintHere(false, true, [], 1, "", ";");
        if (!this.expect(TokenType.identifier, false)) return node;

        node.tableIdentifier = <string>this.cct.value;
        node.tableIdentifierPosition = this.getCurrentPosition();
        this.nextToken();
        node.endPosition = this.getCurrentPosition();

        return node;

    }

    parseDelete(): DeleteNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "Delete"

        let node: DeleteNode = {
            type: TokenType.keywordDelete,
            position: startPosition,
            endPosition: this.getEndOfPosition(this.getCurrentPosition()),
            symbolTable: null,
            tableIdentifier: null,
            tableIdentifierPosition: null,
            whereNode: null,
            whereNodeBegin: null,
            whereNodeEnd: null
        }

        if (!this.expect(TokenType.keywordFrom, true)) {
            this.addCompletionHintHere(false, false, ["from"], 1);
        }

        this.addCompletionHintHere(false, true, [], 1, "", " where\n\t");
        if (!this.expect(TokenType.identifier, false)) return node;

        node.tableIdentifier = <string>this.cct.value;
        node.tableIdentifierPosition = this.getCurrentPosition();
        this.nextToken();
        node.endPosition = this.getCurrentPosition();

        this.addCompletionHintHere(false, false, ["where\n\t"], 1);
        if (!this.expect(TokenType.keywordWhere)) return node;

        node.endPosition = this.getCurrentPosition();


        node.whereNodeBegin = this.getEndOfPosition(this.lastToken.position);
        node.whereNode = this.parseTerm();
        node.whereNodeEnd = this.getCurrentPosition();

        this.module.addCompletionHint(node.whereNodeBegin, this.getCurrentPositionPlus(3), node.tableIdentifier, false, []);

        node.endPosition = this.getCurrentPosition();
        return node;

    }

    parseUpdate(): UpdateNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "update"

        let node: UpdateNode = {
            type: TokenType.keywordUpdate,
            position: startPosition,
            endPosition: this.getEndOfPosition(this.getCurrentPosition()),
            symbolTable: null,
            tableIdentifier: null,
            tableIdentifierPosition: null,
            columnIdentifiers: [],
            columnIdentifierPositions: [],
            values: [],
            valuePosBegin: [],
            valuePosEnd: [],
            whereNode: null,
            whereNodeBegin: null,
            whereNodeEnd: null
        }

        this.addCompletionHintHere(false, true, [], 1, "", " set\n\t");
        if (!this.expect(TokenType.identifier, false)) return node;

        node.tableIdentifier = <string>this.cct.value;
        node.tableIdentifierPosition = this.getCurrentPosition();
        this.nextToken();
        node.endPosition = this.getCurrentPosition();

        this.addCompletionHintHere(false, false, ["set\n\t"], 1);
        if (!this.expect(TokenType.keywordSet)) return node;
        let first: boolean = true;
        do {
            this.addCompletionHintHere(node.tableIdentifier, false, first ? [] : ['where'], 1, null, " = ");
            first = false;
            if (this.tt != TokenType.identifier) {
                this.pushError("Hier wird der Bezeichner derjenigen Spalte der Tabelle " + node.tableIdentifier + " erwaretet, deren Wert verändert werden soll.", "error");
                break;
            }

            node.columnIdentifiers.push(<string>this.cct.value);
            node.columnIdentifierPositions.push(this.getCurrentPosition());
            this.nextToken();

            this.expect(TokenType.equal, true);

            node.valuePosBegin.push(this.getCurrentPosition());
            node.values.push(this.parseTerm());
            node.valuePosEnd.push(this.getCurrentPosition());

        } while (this.comesToken(TokenType.comma, true));

        node.endPosition = this.getCurrentPosition();

        if (this.lastToken.tt != TokenType.comma || this.comesToken(TokenType.keywordWhere)) {
            if (!this.expect(TokenType.keywordWhere, true)) return node;

            node.whereNodeBegin = this.getEndOfPosition(this.lastToken.position);
            node.whereNode = this.parseTerm();
            node.whereNodeEnd = this.getCurrentPosition();

            this.module.addCompletionHint(node.whereNodeBegin, node.whereNodeEnd, node.tableIdentifier, false, []);

            node.endPosition = this.getCurrentPosition();
        } else {
            this.comesToken(TokenType.keywordWhere, true); // skip where, if present
        }
        return node;

    }

    parseCreateTable(): CreateTableNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "create"

        this.expect(TokenType.keywordTable, true);

        let identifier = "";
        if (this.expect(TokenType.identifier, false)) {
            identifier = <string>this.cct.value;
            this.nextToken();
        }

        let node: CreateTableNode = {
            type: TokenType.keywordCreate,
            identifier: identifier,
            position: startPosition,
            endPosition: null,
            columnList: [],
            symbolTable: null,
            combinedPrimaryKeyColumns: [],
            foreignKeyInfoList: []
        }

        if (!this.expect(TokenType.leftBracket, true)) return node;

        let primaryKeyAlreadyDefined: boolean = false;
        let first: boolean = true;

        while (this.tt != TokenType.rightBracket) {
            if (!first) this.expect(TokenType.comma, true);
            first = false;
            switch (this.tt) {
                case TokenType.keywordPrimary:
                    if (primaryKeyAlreadyDefined) this.pushError("Je Tabelle darf nur ein einziger Primärschlüssel definiert werden.", "error", this.getCurrentPosition());
                    this.parsePrimaryKeyTerm(primaryKeyAlreadyDefined, node);
                    primaryKeyAlreadyDefined = true;
                    break;
                case TokenType.keywordForeign:
                    this.parseForeignKeyTerm(node);
                    break;
                case TokenType.identifier:
                    let columnNode = this.parseColumnDefinition(primaryKeyAlreadyDefined);
                    node.columnList.push(columnNode);
                    primaryKeyAlreadyDefined = primaryKeyAlreadyDefined || columnNode.isPrimary;
                    break;
                default:
                    this.pushError(TokenTypeReadable[this.tt] + " wird hier nicht erwartet.", "error");
                    break;
            }
            if (!this.comesToken(TokenType.comma)) {
                break;
            }
        }

        this.expect(TokenType.rightBracket, true);

        node.endPosition = this.getCurrentPosition();

        return node;
    }

    parseForeignKeyTerm(node: CreateTableNode) {
        let referencesPos = this.getCurrentPosition();
        this.nextToken();
        this.expect(TokenType.keywordKey);

        if (this.comesToken(TokenType.identifier)) {
            let fki: ForeignKeyInfo = {
                column: <string>this.cct.value,
                referencesColumn: null,
                referencesTable: null,
                referencesPosition: referencesPos
            }
            this.nextToken();
            this.expect(TokenType.keywordReferences, false);
            this.nextToken(); // skip "references"
            this.addCompletionHintHere(false, true, []);
            if (this.expect(TokenType.identifier, false)) {
                fki.referencesTable = <string>this.cct.value;
                this.nextToken();
                let pos0 = this.lastToken.position;
                let pos1 = this.getCurrentPosition();
                this.module.addCompletionHint(this.getEndOfPosition(pos0), pos1, fki.referencesTable, false, []);

                if (this.expect(TokenType.leftBracket, true)) {

                    if (this.expect(TokenType.identifier, false)) {
                        fki.referencesColumn = <string>this.cct.value;
                        this.nextToken();
                        node.foreignKeyInfoList.push(fki);
                    } else {
                        this.pushError("Erwartet wird der Bezeichner einer Spalte. Gefunden wurde: " + this.cct.value);
                    }

                    this.expect(TokenType.rightBracket, true);
                }
            } else {
                this.pushError("Erwartet wird der Bezeichner einer Tabelle. Gefunden wurde: " + this.cct.value);
            }

        } else {
            this.pushError("Erwartet wird der Bezeichner ein Spalte");
        }

    }

    parsePrimaryKeyTerm(primaryKeyAlreadyDefined: boolean, node: CreateTableNode) {
        if (primaryKeyAlreadyDefined) {
            this.pushError("Die Tabelle kann nur einen einzigen Primärschlüssel haben.");
        }
        this.nextToken(); // skip "primary"
        this.expect(TokenType.keywordKey, true);

        let columns: string[] = node.columnList.map(c => c.identifier);

        this.addCompletionHintHere(false, false, columns);
        if (this.comesToken(TokenType.leftBracket)) {
            this.addCompletionHintHere(false, false, columns);
            this.nextToken();

            while (true) {
                if (this.comesToken(TokenType.identifier)) {
                    node.combinedPrimaryKeyColumns.push(<string>this.cct.value);
                    this.nextToken();
                    this.addCompletionHintHere(false, false, columns, 1);
                    if (!this.comesToken(TokenType.comma)) {
                        break;
                    } else {
                        this.nextToken();
                        this.addCompletionHintHere(false, false, columns);
                    }
                } else {
                    this.pushError("Der Bezeichner einer Spalte wird erwartet. Gefunden wurde: " + this.cct.value);
                    break;
                }
            }

            this.expect(TokenType.rightBracket, true);
        } else {
            this.pushError("( erwartet.");
        }
    }

    parseColumnDefinition(primaryKeyAlreadyDefined: boolean): CreateTableColumnNode {

        let position = this.getCurrentPosition();
        let identifier = <string>this.cct.value;
        this.nextToken();

        let node: CreateTableColumnNode = {
            type: TokenType.columnDef,
            identifier: identifier,
            isPrimary: false,
            position: position,
            baseType: null
        }

        this.parseType(node, primaryKeyAlreadyDefined);

        return node;

    }

    addCompletionHintHere(hintColumns: boolean | string, hintTables: boolean, hints: string[], additionalColumns: number = 0, praefix: string = "", suffix: string = "") {
        let pos0 = this.lastToken.position;
        let pos1 = this.getCurrentPosition();
        pos1.column += 1 + additionalColumns
        this.module.addCompletionHint(this.getEndOfPosition(pos0), pos1, hintColumns, hintTables, hints, null, praefix, suffix);
    }

    parseType(node: CreateTableColumnNode, primaryKeyAlreadyDefined: boolean) {

        let datatypes = SQLBaseType.baseTypes.map(type => type.toString());
        this.addCompletionHintHere(false, false, datatypes);

        if (!this.expect(TokenType.identifier, false)) {
            this.pushError("Erwartet wird ein Datentyp. Gefunden wurde: " + this.cct.value);
            return;
        }

        let identifier = <string>this.cct.value;


        let type = SQLBaseType.getBaseType(identifier);
        if (type == null) {
            this.pushError("Erwartet wird ein Datentyp. Gefunden wurde: " + identifier);
        }
        node.baseType = type;
        this.nextToken();

        if (this.tt == TokenType.leftBracket) {
            this.nextToken();
            let parameters: number[] = [];
            //@ts-ignore
            while (this.tt == TokenType.integerConstant) {
                parameters.push(<number>this.cct.value);
                this.nextToken();
                //@ts-ignore
                if (this.tt != TokenType.comma) break;
                this.nextToken();
                //@ts-ignore
                if (this.tt != TokenType.integerConstant) {
                    this.pushError("Erwartet wird eine ganze Zahl, gefunden wurde: " + this.cct.value);
                    break;
                }
            }

            if (type != null && parameters.length > type.parameterDescriptions.length) {
                this.pushError("Der Datentyp " + type.toString() + " hat höchstens " + type.parameterDescriptions.length + " Parameter.");
            }

            this.expect(TokenType.rightBracket, true);
        }

        // primary key autoincrement
        // references table(column)
        // not null

        this.addCompletionHintHere(false, false, ["primary key", "references", "not null"]);

        if (this.comesToken(TokenType.keywordNot)) {
            this.nextToken();
            if (!this.expect(TokenType.keywordNull, true)) {
                this.addCompletionHintHere(false, false, ["null"]);
            } else {
                this.addCompletionHintHere(false, false, ["references"]);
            }
        }

        switch (this.tt) {
            case TokenType.keywordPrimary:
                if (primaryKeyAlreadyDefined) this.pushError("In einer Tabelle darf es nur einen einzigen primary key geben.");
                this.nextToken(); // skip "primary"
                if (!this.expect(TokenType.keywordKey, true)) {
                    this.addCompletionHintHere(false, false, ["key"]);
                } else {
                    this.addCompletionHintHere(false, false, ["autoincrement, \n"])
                }
                node.isPrimary = true;
                //@ts-ignore
                if (this.tt == TokenType.keywordAutoincrement) this.nextToken();
                break;
            case TokenType.keywordReferences:
                node.referencesPosition = this.getCurrentPosition();
                this.nextToken(); // skip "references"
                this.addCompletionHintHere(false, true, []);
                if (this.expect(TokenType.identifier, false)) {
                    node.referencesTable = <string>this.cct.value;
                    this.nextToken();
                    let pos0 = this.lastToken.position;
                    let pos1 = this.getCurrentPosition();
                    this.module.addCompletionHint(this.getEndOfPosition(pos0), pos1, node.referencesTable, false, []);

                    if (this.expect(TokenType.leftBracket, true)) {

                        if (this.expect(TokenType.identifier, false)) {
                            node.referencesColumn = <string>this.cct.value;
                            this.nextToken();
                        } else {
                            this.pushError("Erwartet wird der Bezeichner einer Spalte. Gefunden wurde: " + this.cct.value);
                        }

                        this.expect(TokenType.rightBracket, true);
                    }
                } else {
                    this.pushError("Erwartet wird der Bezeichner einer Tabelle. Gefunden wurde: " + this.cct.value);
                }
        }

    }


    parseInsert(): InsertNode {

        let startPosition = this.getCurrentPosition();
        this.nextToken(); // skip "insert"

        this.expect(TokenType.keywordInto, true);

        let node: InsertNode = {
            type: TokenType.keywordInsert,
            position: startPosition,
            endPosition: this.getCurrentPosition(),
            valuesPosition: null,
            columnsPosition: null,
            symbolTable: null,
            columnList: [],
            values: [],
            table: null
        }

        if (this.tt == TokenType.identifier) {
            node.table = {
                type: TokenType.table,
                identifier: <string>this.cct.value,
                alias: null,
                position: this.getCurrentPosition()
            }
            node.columnsPosition = { line: node.table.position.line, column: node.table.position.column + node.table.position.length, length: 0 };
            this.nextToken();
        } else {
            this.pushError("Hier wird der Bezeichner einer Tabelle erwartet. Gefunden wurde: " + this.cct.value, "error");
        }

        if (this.tt == TokenType.leftBracket) {

            this.nextToken();
            let first: boolean = true;
            //@ts-ignore
            while (first || this.tt == TokenType.comma) {

                if (!first) {
                    this.nextToken(); // consume comma
                }
                first = false;

                //@ts-ignore
                if (this.tt == TokenType.identifier) {
                    node.columnList.push({
                        type: TokenType.identifier,
                        identifier: this.cct.value + "",
                        position: this.getCurrentPosition()
                    })

                } else {
                    this.pushError("Erwartet wird der Bezeichner einer Spalte. Gefunden wurde: " + this.cct.value, "error");
                }
                this.nextToken();
            }

            this.expect(TokenType.rightBracket, true);
        }

        node.valuesPosition = this.getCurrentPosition();
        this.expect(TokenType.keywordValues, true);

        this.parseValueLists(node.values);

        node.endPosition = this.getCurrentPosition();

        return node;
    }

    parseValueLists(values: ConstantNode[][]) {
        let insideListTokens = [TokenType.keywordNull, TokenType.charConstant, TokenType.stringConstant, TokenType.booleanConstant, TokenType.floatingPointConstant, TokenType.integerConstant];

        let outerFirst: boolean = true;

        while (outerFirst || this.tt == TokenType.comma) {
            if (!outerFirst) {
                this.nextToken(); // consume comma
            }
            outerFirst = false;
            let leftBracketPosition = this.getCurrentPosition();
            if (!this.expect(TokenType.leftBracket, true)) {
                break;
            }
            let line: ConstantNode[] = [];
            let first: boolean = true;
            //@ts-ignore
            while (first || this.tt == TokenType.comma) {
                if (!first) {
                    this.nextToken(); // consume comma
                }
                first = false;
                //@ts-ignore
                if (insideListTokens.indexOf(this.tt) < 0) {
                    this.pushError("Erwartet wird eine Konstante oder null. Gefunden wurde: " + this.cct.value, "error");
                    this.nextToken();
                } else {
                    line.push({
                        constantType: this.tt,
                        position: this.getCurrentPosition(),
                        constant: this.cct.value,
                        type: TokenType.constantNode
                    });
                    this.nextToken();
                }
            }
            this.expect(TokenType.rightBracket, true);
            if (line.length == 0) {
                this.pushError("Eine Zeile kann nur dann in die Tabelle eingefügt werden, wenn sie mindestens einen Spaltenwert besitzt.", "error", leftBracketPosition);
            } else {
                values.push(line);
            }
        }

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

        let columnListKeywordArray = ["distinct", "as", "*"];
        this.module.addCompletionHint(columnListStart, this.getCurrentPositionPlus(1), true, true, columnListKeywordArray)

        // parse from ...
        if (!this.expect(TokenType.keywordFrom, true)) {
            columnListKeywordArray.push("from");
            return null;
        }

        node.fromStartPosition = { line: this.lastToken.position.line, column: this.lastToken.position.column + this.lastToken.position.length, length: 0 };

        let dontHint: string[] = [];
        node.fromNode = this.parseTableOrSubQuery(dontHint);

        let fromListKeywordArray = ["join", "left", "right", "inner", "outer", "natural", "on", "as", ", "];
        fromListKeywordArray.splice(fromListKeywordArray.indexOf(this.lastToken.value + ""), 1);
        this.module.addCompletionHint(node.fromStartPosition, this.getCurrentPositionPlus(2), false, true, fromListKeywordArray, dontHint)
        node.fromEndPosition = this.getCurrentPosition();

        // parse where...

        let whereKeywordArray = ["like"];
        if (this.tt == TokenType.keywordWhere) {
            let position = this.getCurrentPosition();
            let whereStart = this.getCurrentPosition();
            this.nextToken();
            node.whereNode = this.parseTerm();
            this.module.addCompletionHint(whereStart, this.getCurrentPositionPlus(2), true, true, whereKeywordArray)
            // if (node.whereNode != null) node.whereNode.position = position;
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
        node.endPosition.column += 3;

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

    parseTableOrSubQuery(dontHint: string[]): TableOrSubqueryNode {

        let leftSide: TableOrSubqueryNode = this.parseAtomicTableOrSubQuery(dontHint);

        let position = this.getCurrentPosition();

        while (this.parseJoinOperator()) {

            let rightSide: TableOrSubqueryNode = this.parseAtomicTableOrSubQuery(dontHint);

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
        if (this.tt == TokenType.comma) {
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

    parseAtomicTableOrSubQuery(dontHint: string[]): TableOrSubqueryNode {

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
                ret = this.parseTableOrSubQuery(dontHint);
            }
            this.expect(TokenType.rightBracket, true);


            //@ts-ignore
            if (this.tt == TokenType.keywordAs && ret.type == TokenType.subquery) {
                this.nextToken();
                if (this.expect(TokenType.identifier, false)) {
                    ret.alias = <string>this.cct.value;
                    this.nextToken();
                    dontHint.push(ret.alias);
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
            dontHint.push(node.identifier);
            this.nextToken();

            //@ts-ignore
            if (this.tt == TokenType.keywordAs) {
                this.nextToken();
                if (this.expect(TokenType.identifier, false)) {
                    node.alias = <string>this.cct.value;
                    this.nextToken();
                    dontHint.push(node.alias);
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

                    } else if ([TokenType.isNull, TokenType.isNotNull].indexOf(this.tt) >= 0) {
                        term = {
                            type: TokenType.unaryOp,
                            operand: term,
                            operator: this.tt,
                            position: position
                        };
                        this.nextToken();
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