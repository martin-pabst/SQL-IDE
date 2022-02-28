import { DatabaseTool } from "../../tools/DatabaseTools.js";
import { TextPosition, TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { CompletionHint, Module } from "./Module.js";
import { Symbol, SymbolTable } from "./SymbolTable.js";
import { AlterTableNode, ASTNode, BinaryOpNode, CreateTableNode, DeleteNode, DotNode, DropTableNode, IdentifierNode, InsertNode, MethodcallNode, SelectNode, TableOrSubqueryNode, TermNode, UpdateNode } from "./Ast.js";
import { Error, ErrorLevel, QuickFix } from "../lexer/Lexer.js";
import { Column, Table } from "./SQLTable.js";
import { SQLBaseType, SQLType } from "./SQLTypes.js";
import { SQLMethodStore } from "./SQLMethods.js";
import { isDate, isDateTime } from "../../tools/StringTools.js";


export class SymbolResolver {

    symbolTableStack: SymbolTable[] = [];
    errorList: Error[];
    module: Module;
    databaseTool: DatabaseTool;
    tables: Table[];

    constructor(databaseTool: DatabaseTool) {
        this.databaseTool = databaseTool;
        this.tables = Table.fromTableStructureList(databaseTool.databaseStructure?.tables);
    }

    start(module: Module) {
        this.module = module;
        this.symbolTableStack = [];
        this.errorList = [];

        module.mainSymbolTable = new SymbolTable(null, { column: 0, line: 0, length: 0 }, { column: 0, line: 100000, length: 0 })

        this.symbolTableStack.push(module.mainSymbolTable);

        for (let statement of this.module.sqlStatements) {

            let errorsBeforeStatement = this.errorList.length;

            let astNode = statement.ast;
            if (astNode == null) continue;

            switch (astNode.type) {
                case TokenType.keywordSelect:
                    this.resolveSelect(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordInsert:
                    this.resolveInsert(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordCreate:
                    this.resolveCreateTable(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordUpdate:
                    this.resolveUpdate(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordDelete:
                    this.resolveDelete(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordDrop:
                    this.resolveDropTable(astNode);
                    this.symbolTableStack.pop();
                    break;
                case TokenType.keywordAlter:
                    this.resolveAlterTable(astNode)
                    this.symbolTableStack.pop();
                    break;

                default:
                    break;
            }

            statement.hasErrors = statement.hasErrors || this.errorList.length > errorsBeforeStatement;

        }

        module.errors[2] = this.errorList;

    }

    pushError(text: string, errorLevel: ErrorLevel = "error", position: TextPosition, quickFix?: QuickFix) {
        // if (position == null) position = Object.assign({}, this.position);
        this.errorList.push({
            text: text,
            position: position,
            quickFix: quickFix,
            level: errorLevel
        });
    }


    getCurrentSymbolTable(): SymbolTable {
        return this.symbolTableStack[this.symbolTableStack.length - 1];
    }

    pushNewSymbolTable(positionFrom: TextPosition, positionTo: TextPosition): SymbolTable {
        if(positionTo == null) {
            positionTo = {
                line: 100000,
                column: 1,
                length: 1
            }
        };
        let st: SymbolTable = new SymbolTable(this.getCurrentSymbolTable(), positionFrom, positionTo);
        this.symbolTableStack.push(st);
        return st;
    }

    resolveSelect(selectNode: SelectNode): Table {
        let resultTable: Table = new Table(null);

        selectNode.symbolTable = this.pushNewSymbolTable(selectNode.position, selectNode.endPosition);

        // From
        let joinedTables: Table[] = [];
        this.resolveTableOrSubQuery(selectNode.fromNode, joinedTables);
        if (selectNode.fromStartPosition != null) {
            let fromSymbolTable = new SymbolTable(this.getCurrentSymbolTable(), selectNode.fromStartPosition, selectNode.fromEndPosition);
            fromSymbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);
        }

        // Column list
        for (let columnNode of selectNode.columnList) {
            if (columnNode.type == TokenType.allColumns) {
                for (let table of joinedTables) {
                    for (let column of table.columns) {
                        let c: Column = new Column(column.identifier, column.type, resultTable, false, true, column.defaultValue, column.isAutoIncrement);
                        resultTable.columns.push(c);
                    }
                }
            } else {
                this.resolveTerm(columnNode.term);
                let c1: Column = new Column(columnNode.alias, columnNode.term.sqlType, resultTable, false, true, null, false);
                resultTable.columns.push(c1);
                if (c1.identifier != null) {
                    selectNode.symbolTable.storeSymbol({
                        identifier: c1.identifier,
                        posOfDefinition: columnNode.term.position,
                        referencedOnPositions: [],
                        column: c1
                    })
                }
            }
        }

        // where...
        if (selectNode.whereNode != null) {
            let whereType = this.resolveTerm(selectNode.whereNode);
            if (whereType != null && whereType.getBaseTypeName() != "boolean") {
                this.pushError("Das Ergebnis des where-Teils einer select-Anweisung muss vom Typ boolean sein.", "error", selectNode.whereNode.position);
            }
        }


        // TODO: group by, order by

        return resultTable;
    }

    resolveDropTable(node: DropTableNode) {
        node.symbolTable = this.pushNewSymbolTable(node.position, node.endPosition);
        node.symbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        if (node.tableIdentifier == null) return;

        let table = node.symbolTable.findTable(node.tableIdentifier);
        if (table == null) this.pushError("Die Tabelle " + node.tableIdentifier + " ist nicht bekannt.", "error", node.tableIdentifierPosition);

    }

    resolveDelete(node: DeleteNode) {
        node.symbolTable = this.pushNewSymbolTable(node.position, node.endPosition);
        node.symbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        if (node.tableIdentifier == null) return;

        let table = node.symbolTable.findTable(node.tableIdentifier);
        if (table == null) this.pushError("Die Tabelle " + node.tableIdentifier + " ist nicht bekannt.", "error", node.tableIdentifierPosition);


        // if(node.whereNodeBegin != null){
        //     let symbolTable = this.pushNewSymbolTable(node.whereNodeBegin, node.whereNodeEnd);
        //     symbolTable.storeTableSymbols(table);
        // }


        if (node.whereNode != null) {
            let whereSymbolTable = this.pushNewSymbolTable(node.whereNodeBegin, node.whereNodeEnd);
            if(table != null) whereSymbolTable.storeTableSymbols(table);
            this.resolveTerm(node.whereNode);
            this.symbolTableStack.pop();
        }



    }


    resolveAlterTable(node: AlterTableNode) {
        node.symbolTable = this.pushNewSymbolTable(node.position, node.endPosition);
        node.symbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        if (node.tableIdentifier == null) {
            return;
        }

        let table = node.symbolTable.findTable(node.tableIdentifier);
        if (table == null) {
            this.pushError("Die Tabelle " + node.tableIdentifier + " ist nicht bekannt.", "error", node.tableIdentifierPosition);
        }

        let oldColumn: Column = null;
        if (node.oldColumnName != null) {
            oldColumn = table.columns.find(c => c.identifier.toLocaleLowerCase() == node.oldColumnName.toLocaleLowerCase());
            if (oldColumn == null) {
                this.pushError("Die Tabelle " + node.tableIdentifier + " hat keine Spalte mit dem Bezeichner " + node.oldColumnName, "error", node.oldColumnPosition);
            }
        }

        switch (node.kind) {
            case "dropColumn":
                // nothing to do as node.oldColumnName is checked above
                break;
            case "addColumn":
                let columnNode = node.columnDef;
                if (columnNode == null) break;
                if (columnNode.referencesTable != null && columnNode.baseType != null) {
                    let tables = this.getCurrentSymbolTable().findTables(columnNode.referencesTable);
                    if (tables.length == 1) {
                        let table = tables[0].table;
                        let column = table.columns.find(c => c.identifier == columnNode.referencesColumn);
                        if (column != null && column.type != null) {
                            if (!column.isPrimaryKey) {
                                this.pushError("Die referenzierte Spalte " + columnNode.referencesTable + "." + columnNode.referencesColumn + " ist kein Primärschlüssel.", "warning", columnNode.referencesPosition);
                            }
                            if (!column.type.canCastTo(columnNode.baseType)) {
                                this.pushError("Der Datentyp " + columnNode.baseType.toString() + " der Spalte " + columnNode.identifier +
                                    " kann nich in den Datentyp " + column.type.toString() + " der referenzierten Spalte " + table.identifier + "." +
                                    column.identifier + " umgewandelt werden.", "error", columnNode.referencesPosition);
                            }
                        }
                    }
                }
                break;
            case "renameColumn":
                // nothing to do as node.oldColumnName is checked above
                break;
            case "renameTable":
                // nothing to do 
                break;
            default:
                break;
        }
    }

    resolveUpdate(node: UpdateNode) {
        node.symbolTable = this.pushNewSymbolTable(node.position, node.endPosition);
        node.symbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        if (node.tableIdentifier == null) {
            return;
        }

        let table = node.symbolTable.findTable(node.tableIdentifier);
        if (table == null) this.pushError("Die Tabelle " + node.tableIdentifier + " ist nicht bekannt.", "error", node.tableIdentifierPosition);

        for (let i = 0; i < node.columnIdentifiers.length; i++) {
            let ci = node.columnIdentifiers[i];
            let ciPos = node.columnIdentifierPositions[i];
            let value = node.values[i];

            if (ci == null) continue;
            let column = table.columns.find(c => c.identifier == ci);

            if (column == null) {
                this.pushError(ci + " ist kein Bezeichner einer Spalte der Tabelle " + node.tableIdentifier + ".", "error", ciPos);
            }

            if (value == null) continue;
            let symbolTable = this.pushNewSymbolTable(node.valuePosBegin[i], node.valuePosEnd[i]);
            symbolTable.storeTableSymbols(table);
            this.resolveTerm(value);
            this.symbolTableStack.pop();

        }

        if (node.whereNodeBegin != null) {
            let symbolTable = this.pushNewSymbolTable(node.whereNodeBegin, node.whereNodeEnd);
            symbolTable.storeTableSymbols(table);
        }

        if (node.whereNode != null) {
            this.resolveTerm(node.whereNode);
        }
        this.symbolTableStack.pop();

    }



    resolveCreateTable(createTableNode: CreateTableNode) {

        createTableNode.symbolTable = this.pushNewSymbolTable(createTableNode.position, createTableNode.endPosition);
        createTableNode.symbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        let thisTable: Table = {
            identifier: createTableNode.identifier,
            columns: null,
            size: 0
        }

        thisTable.columns = createTableNode.columnList.map(c => {
            return {
                identifier: c.identifier,
                isNullable: false,
                isPrimaryKey: c.isPrimary,
                isAutoIncrement: c.isAutoIncrement,
                notNull: false,
                references: null,
                table: thisTable,
                type: c.baseType,
                defaultValue: c.defaultValue
            }
        });

        createTableNode.symbolTable.storeTableSymbols(thisTable);

        for (let columnNode of createTableNode.columnList) {
            if (createTableNode.columnList.filter(c => c.identifier.toLocaleLowerCase() == columnNode.identifier.toLocaleLowerCase()).length > 1) {
                this.pushError("Der Spaltenbezeichner " + columnNode.identifier + " darf in einer Tabelle nur ein einziges Mal verwendet werden", "error", columnNode.position);
            }

            if (columnNode.referencesTable != null && columnNode.baseType != null) {
                let tables = this.getCurrentSymbolTable().findTables(columnNode.referencesTable);
                if (tables.length == 1) {
                    let table = tables[0].table;
                    let column = table.columns.find(c => c.identifier == columnNode.referencesColumn);
                    if (column != null && column.type != null) {
                        if (!column.isPrimaryKey) {
                            this.pushError("Die referenzierte Spalte " + columnNode.referencesTable + "." + columnNode.referencesColumn + " ist kein Primärschlüssel.", "warning", columnNode.referencesPosition);
                        }
                        if (!column.type.canCastTo(columnNode.baseType)) {
                            this.pushError("Der Datentyp " + columnNode.baseType.toString() + " der Spalte " + columnNode.identifier +
                                " kann nich in den Datentyp " + column.type.toString() + " der referenzierten Spalte " + table.identifier + "." +
                                column.identifier + " umgewandelt werden.", "error", columnNode.referencesPosition);
                        }
                    }
                }
            }

        }

        for (let fki of createTableNode.foreignKeyInfoList) {

            let columnNode = createTableNode.columnList.find(cn => cn.identifier == fki.column);
            if (columnNode == null) continue;

            let tables = this.getCurrentSymbolTable().findTables(fki.referencesTable);
            if (tables.length == 1) {
                let table = tables[0].table;
                let column = table.columns.find(c => c.identifier == fki.referencesColumn);
                if (column != null && column.type != null) {
                    if (!column.isPrimaryKey) {
                        this.pushError("Die referenzierte Spalte " + fki.referencesTable + "." + fki.referencesColumn + " ist kein Primärschlüssel.", "warning", fki.referencesPosition);
                    }
                    if (!column.type.canCastTo(columnNode.baseType)) {
                        this.pushError("Der Datentyp " + columnNode.baseType.toString() + " der Spalte " + columnNode.identifier +
                            " kann nich in den Datentyp " + column.type.toString() + " der referenzierten Spalte " + table.identifier + "." +
                            column.identifier + " umgewandelt werden.", "error", fki.referencesPosition);
                    }
                }
            }

        }


    }

    resolveTableOrSubQuery(tosNode: TableOrSubqueryNode, joinedTables: Table[]) {
        if (tosNode == null) return;

        switch (tosNode.type) {
            case TokenType.table:
                let tableList = this.tables.filter(t => t.identifier.toLowerCase() == tosNode.identifier.toLowerCase());
                if (tableList.length == 0) {
                    this.pushError(tosNode.identifier + " ist nicht der Name einer Tabelle.", "error", tosNode.position);
                } else if (tableList.length > 1) {
                    this.pushError("Der Bezeichner " + tosNode.identifier + " ist hier nicht eindeutig.", "error", tosNode.position);
                } else {
                    let table: Table = tableList[0];
                    joinedTables.push(table);
                    this.storeTableIntoSymbolTable(table, tosNode.position, tosNode.alias);
                }

                break;

            case TokenType.keywordJoin:
                this.resolveTableOrSubQuery(tosNode.firstOperand, joinedTables);
                this.resolveTableOrSubQuery(tosNode.secondOperand, joinedTables);
                break;

            case TokenType.subquery:
                tosNode.table = this.resolveSelect(tosNode.query);
                joinedTables.push(tosNode.table);
                if (tosNode.alias != null) {
                    tosNode.table.identifier = tosNode.alias;
                    this.storeTableIntoSymbolTable(tosNode.table, tosNode.position);
                }
                break;

            default:
                break;
        }
    }

    storeTableIntoSymbolTable(table: Table, position: TextPosition, alias?: string) {
        let symbolTable = this.getCurrentSymbolTable();
        symbolTable.storeSymbol({
            identifier: alias == null ? table.identifier.toLowerCase() : alias.toLowerCase(),
            posOfDefinition: position,
            table: table,
            referencedOnPositions: []
        });
        for (let column of table.columns) {
            symbolTable.storeSymbol({
                identifier: column.identifier.toLowerCase(),
                posOfDefinition: null,
                column: column,
                tableAlias: alias,
                referencedOnPositions: []
            });
        }
    }

    resolveTerm(node: TermNode): SQLType {
        if (node == null) return null;

        switch (node.type) {
            case TokenType.binaryOp:
                if ([TokenType.keywordIn, TokenType.keywordNotIn].indexOf(node.operator) >= 0) {
                    return this.resolveNotIn(node);
                }

                let typeLeft = this.resolveTerm(node.firstOperand);
                let typeRight = this.resolveTerm(node.secondOperand);
                if (typeLeft != null && typeRight != null) {
                    let resultType = typeLeft.getBinaryResultType(node.operator, typeRight);
                    if (resultType == null) {
                        this.pushError("Der Operator " + TokenTypeReadable[node.operator] + " ist für die Datentypen " + typeLeft.toString() + " und " + typeRight.toString() + " nicht definiert.", "error", node.position);
                    }
                    return resultType;
                } else {
                    return null;
                }
                break;
            case TokenType.unaryOp:
                let operandType = this.resolveTerm(node.operand);
                if (operandType != null) {
                    let resultType1 = operandType.getUnaryResultType(node.operator);
                    if (resultType1 == null) {
                        this.pushError("Der Operator " + TokenTypeReadable[node.operator] + " ist für einen Operanden des Datentyps " + operandType.toString() + " nicht definiert.", "error", node.position);
                    }
                    return resultType1;
                } else {
                    return null;
                }
                break;
            case TokenType.callMethod:
                return this.resolveMethodCall(node);
                break;
            //    ConstantNode | IdentifierNode | DotNode | SelectNode | BracketsNode | StarAttributeNode | SelectNode | ListNode;

            case TokenType.constantNode:
                node.sqlType = SQLBaseType.fromConstantType(node.constantType);
                return node.sqlType;
                break;
            case TokenType.identifier:
                return this.resolveIdentifier(node);
                break;
            case TokenType.dot:
                return this.resolveDot(node);
                break;
            case TokenType.keywordSelect:
                let selectTable = this.resolveSelect(node);
                if (selectTable.columns.length != 1) {
                    this.pushError("Die Ergebnistabelle einer Unterabfrage an dieser Stelle muss genau eine Spalte besitzen.", "error", node.position);
                    return null;
                }
                return selectTable.columns[0].type;
                break;
            case TokenType.rightBracket:   // BracketsNode
                node.sqlType = this.resolveTerm(node.termInsideBrackets);
                return node.sqlType;
                break;
            case TokenType.allColumns:
                this.pushError("Das Zeichen * kann hier nicht verwendet werden.", "error", node.position);
                break;
            case TokenType.list:
                this.pushError("Eine Liste wird hier nicht erwartet.", "error", node.position);
                break;
            default:
                break;
        }




    }

    resolveDot(node: DotNode): SQLType {
        let tableSymbols = this.getCurrentSymbolTable().findTables(node.identifierLeft.identifier);
        if (tableSymbols.length == 0) {
            this.pushError("Die Tabelle " + node.identifierLeft.identifier + " kann nicht gefunden werden.", "error", node.identifierLeft.position);
            return null;
        }
        if (tableSymbols.length > 1) {
            this.pushError("Der Tabellenbezeichner " + node.identifierLeft.identifier + " ist nicht eindeutig.", "error", node.identifierLeft.position);
            return null;
        }
        let table = tableSymbols[0].table;

        let columns = table.columns.filter(c => c.identifier.toLowerCase() == node.identifierRight.identifier.toLowerCase());

        if (columns.length == 0) {
            this.pushError("Die Tabelle " + node.identifierLeft.identifier + " hat keine Spalte mit dem Bezeichner " + node.identifierRight.identifier + ".", "error", node.identifierRight.position);
            return;
        }

        if (columns.length > 1) {
            this.pushError("Die Tabelle " + node.identifierLeft.identifier + " hat mehrere Spalten mit dem Bezeichner " + node.identifierRight.identifier + ".", "error", node.identifierRight.position);
            return;
        }

        let column = columns[0];
        node.sqlType = column.type;
        return column.type;

    }

    resolveIdentifier(node: IdentifierNode): SQLType {
        let symbols = this.getCurrentSymbolTable().findColumn(node.identifier);
        if (symbols.length == 0) {
            this.pushError("Der Bezeichner " + node.identifier + " ist an dieser Stelle nicht bekannt.", "error", node.position);
            return null;
        }
        if (symbols.length > 1) {
            this.pushError("Der Bezeichner " + node.identifier + " ist nicht eindeutig.", "error", node.position);
            return null;
        }

        let symbol = symbols[0];
        node.sqlType = symbol.column.type;
        return symbol.column.type;
    }

    resolveMethodCall(node: MethodcallNode): SQLType {

        let methodStore = SQLMethodStore.getInstance();
        let methods = methodStore.getMethods(node.identifier);

        methods = methods.filter(m => m.parameters.length == node.operands.length);
        if (node.operands.length == 1 && node.operands[0].type == TokenType.allColumns) {
            methods = methods.filter(m => m.acceptsStarParameter);
            node.sqlType = methods[0].returnType;
            return node.sqlType;
        }

        if (methods.length == 0) {
            this.pushError("Es gibt keine passende Methode mit dem Bezeichner '" + node.identifier + "'.", "error", node.position);
            return null;
        }

        for (let operand of node.operands) {
            if (this.resolveTerm(operand) == null) {
                node.sqlType = methods[0].returnType;
                return node.sqlType;
            }
        }

        for (let method of methods) {
            let found = true;
            for (let i = 0; i < method.parameters.length; i++) {
                let methodParameter = method.parameters[i];
                let operand = node.operands[i];
                if (!operand.sqlType.canCastTo(methodParameter.type)) {
                    found = false;
                    break;
                }
            }
            if (found) {
                node.sqlType = method.returnType;
                return node.sqlType;
            }
        }

        this.pushError("Es gibt keine passende Methode mit dem Bezeichner '" + node.identifier + "'.", "error", node.position);
        return null;

    }

    resolveNotIn(node: BinaryOpNode): SQLType {

        if (node.firstOperand == null || node.secondOperand == null) return null;

        let operatorString = TokenTypeReadable[node.operator];

        this.resolveTerm(node.firstOperand);
        let leftType = node.firstOperand.sqlType;
        if (leftType != null) {
            if (node.secondOperand.type == TokenType.keywordSelect) {
                let selectNode = node.secondOperand;
                if (selectNode.columnList.length != 1) {
                    this.pushError("Wenn rechts vom Operator '" + operatorString + "' eine Unterabfrage steht, muss die Ergebnistabelle dieser Unterabfrage genau eine Spalte haben.", "error", selectNode.position);
                }
                this.resolveSelect(selectNode);
                let pType = selectNode.columnList[0].term.sqlType;
                if (!pType.canCastTo(leftType)) {
                    this.pushError("Der Datentyp der Ergebnisspalte der Unterabfrage ist " + pType.toString() + ". Dieser kann nicht in den Datentyp " + leftType.toString() + " umgewandelt werden.", "error", selectNode.position);
                }
            } else if (node.secondOperand.type == TokenType.list) {
                let listNode = node.secondOperand;
                for (let element of listNode.elements) {
                    let elementType = SQLBaseType.fromConstantType(element.constantType);
                    element.sqlType = elementType;
                    if (!elementType.canCastTo(leftType)) {
                        this.pushError("Der Datentyp des Listenelements " + element.constant + " ist " + elementType.toString() + ". Er kann nicht in den Datentype " + leftType.toString() + " des Operanden auf der linken Seite des Operators '" + operatorString + "' umgewandelt werden.", "error", element.position);
                    }
                }
            } else {
                this.pushError("Der rechte Operand der Operatoren 'in' und 'not in' muss eine Unterabfrage oder eine Liste sein.", "error", node.secondOperand.position);
            }

        }

        return SQLBaseType.getBaseType("boolean");
    }

    resolveInsert(astNode: InsertNode) {

        let table: Table = null;
        let symbolTable = this.pushNewSymbolTable(astNode.position, astNode.endPosition);
        if (astNode.table != null) {
            astNode.table.table = this.tables.find(t => t.identifier.toLowerCase() == astNode.table.identifier.toLocaleLowerCase());
            if (astNode.table.table == null) {
                this.pushError("Die Tabelle " + astNode.table.identifier + " gibt es nicht.", "error", astNode.table.position);
            } else {
                table = astNode.table.table;
                symbolTable.storeTableSymbols(table);
            }
        }

        let tableCompletionTo = astNode.endPosition;
        if (astNode.valuesPosition != null) tableCompletionTo = astNode.valuesPosition;
        if (astNode.columnsPosition != null) tableCompletionTo = astNode.columnsPosition;

        this.module.addCompletionHint(astNode.position, tableCompletionTo, false, true, ["into", "values"]);

        if (table != null) {
            this.module.addCompletionHint(tableCompletionTo, astNode.valuesPosition == null ? astNode.endPosition : astNode.valuesPosition, true, false, ["values"]);
        }

        let tableSymbolTable = this.pushNewSymbolTable(astNode.position, tableCompletionTo);
        tableSymbolTable.extractDatabaseStructure(this.databaseTool.databaseStructure);

        let columns: Column[] = [];
        // Parse column list
        if (astNode.columnList.length == 0) {
            if (table != null) {
                columns = table.columns;
            }
        } else {
            if (table != null) {
                for (let columnNode of astNode.columnList) {
                    let column = table.columns.find(c => c.identifier.toLowerCase() == columnNode.identifier.toLowerCase());
                    if (column == null) {
                        this.pushError("Die Tabelle " + table.identifier + " besitzt keine Spalte mit dem Bezeichner " + columnNode.identifier + ".", "error", columnNode.position);
                    } else {
                        columns.push(column);
                    }
                }
            }
        }

        if (columns.length > 0) {
            // Parse value lists
            for (let valueList of astNode.values) {
                if (valueList.length != columns.length && valueList.length > 0) {
                    this.pushError("Erwartet werden " + columns.length + " Elemente, hier stehen aber " + valueList.length + " Elemente in der Liste.", "error", valueList[0].position);
                } else {
                    for (let i = 0; i < valueList.length; i++) {
                        let value = valueList[i];
                        let column = columns[i];
                        value.sqlType = SQLBaseType.fromConstantType(value.constantType);
                        // constantType == 40 means: null
                        // TODO: check if column is nullable!
                        let destType = column.type.toString().toLocaleLowerCase();
                        if (value.constantType == TokenType.keywordNull) {
                            if (!column.isNullable || column.notNull) {
                                this.pushError("Die Spalte " + column.identifier + " ist nicht nullable, daher kann null hier nicht eingefügt werden.", "error", value.position);
                            }
                        } else if (!value.sqlType.canCastTo(column.type)) {
                            let error: string = "Der Wert " + value.constant + " vom Datentyp " + value.sqlType.toString() + " kann nicht in den Datentyp " + column.type.toString() + " der Spalte " + column.identifier + " umgewandelt werden.";

                            if(destType == "date") error += "<br><b>Tipp: </b>Datumswerte haben die Form 'yyyy-mm-dd', also z.B. '2022-06-15'.";
                            if(destType == "datetime") error += "<br><b>Tipp: </b>Timestamps haben die Form 'yyyy-mm-dd hh:min:ss', also z.B. '2022-06-15 07:56:22'.";

                            this.pushError(error, "error", value.position);
                        } else if(destType == "date"){
                            if(!isDate(value.constant)){
                                let error: string = `'${value.constant}' ist kein date-Wert.<br><b>Tipp: </b>Datumswerte haben die Form 'yyyy-mm-dd', also z.B. '2022-06-15'.`;
                                this.pushError(error, "error", value.position);
                            }
                        } else if(destType == "datetime"){
                            if(!isDateTime(value.constant)){
                                let error: string = `'${value.constant}' ist kein datetime-Wert.<br><b>Tipp: </b>Timestamps haben die Form 'yyyy-mm-dd hh:min:ss', also z.B. '2022-06-15 07:56:22'.`;
                                this.pushError(error, "error", value.position);
                            }
                        }
                    }
                }
            }
        }

        this.symbolTableStack.pop();

    }



}

