import { DatabaseStructure } from "../../tools/DatabaseTools.js";
import { TextPosition } from "../lexer/Token.js";
import { Table, Column } from "./SQLTable.js";

export type Symbol = {
    identifier: string;
    table?: Table;
    column?: Column;
    tableAlias?: string;
    posOfDefinition: TextPosition;
    referencedOnPositions: TextPosition[];
}

export class SymbolTable {
    parent: SymbolTable; // SymbolTable of parent scope
    positionFrom: TextPosition;
    positionTo: TextPosition;

    childSymbolTables: SymbolTable[] = [];

    private symbols: Map<string, Symbol[]> = new Map();
    symbolList: Symbol[] = [];

    constructor(parentSymbolTable: SymbolTable, positionFrom: TextPosition, positionTo: TextPosition) {

        this.parent = parentSymbolTable;

        this.positionFrom = positionFrom;
        this.positionTo = positionTo;


        if (this.parent != null) {
            this.parent.childSymbolTables.push(this);
        }
    }

    extractDatabaseStructure(databaseStructure: DatabaseStructure) {
        for (let table of Table.fromTableStructureList(databaseStructure.tables)) {

            this.storeTableSymbols(table);

        }


    }

    storeTableSymbols(table: Table){
        this.storeSymbol({
            identifier: table.identifier,
            posOfDefinition: null,
            referencedOnPositions: [],
            table: table
        });

        for (let column of table.columns) {
            this.storeSymbol({
                identifier: column.identifier,
                posOfDefinition: null,
                referencedOnPositions: [],
                column: column
            });
        }
    }

    storeSymbol(symbol: Symbol) {
        let list: Symbol[] = this.symbols.get(symbol.identifier);
        if (list == null) {
            list = [symbol];
            this.symbols.set(symbol.identifier.toLowerCase(), list);
        } else {
            list.push(symbol);
        }
        this.symbolList.push(symbol);
    }

    findTableAtPosition(line: number, column: number): SymbolTable {

        if (!this.containsPosition(line, column)) {
            return null;
        }

        let shortestSymbolTableContainingPosition = null;
        let shortestPosition = 10000000;

        for (let st of this.childSymbolTables) {
            if (st.containsPosition(line, column)) {
                let st1 = st.findTableAtPosition(line, column);
                if (st1.positionTo.line - st1.positionFrom.line < shortestPosition) {
                    shortestSymbolTableContainingPosition = st1;
                    shortestPosition = st1.positionTo.line - st1.positionFrom.line;
                }
            }
            // if(st.containsPosition(line, column) && st.positionTo.line - st.positionFrom.line < shortestPosition){
            //     shortestSymbolTableContainingPosition = st;
            //     shortestPosition = st.positionTo.line - st.positionFrom.line;
            // }
        }

        if (shortestSymbolTableContainingPosition != null) {
            return shortestSymbolTableContainingPosition;
        } else {
            return this;
        }

    }

    containsPosition(line: number, column: number) {
        if (line < this.positionFrom.line || line > this.positionTo.line) {
            return false;
        }

        if (line == this.positionFrom.line) return column >= this.positionFrom.column;
        if (line == this.positionTo.line) return column <= this.positionTo.column;

        return true;

    }

    findTable(identifier: string): Symbol[] {

        let symbolTable: SymbolTable = this;
        while(symbolTable != null){

            let symbols = symbolTable.symbols.get(identifier.toLowerCase());
            if(symbols != null){
                symbols = symbols.filter(s => s.table != null);
                if(symbols.length > 0){
                    return symbols;
                }
            }

            symbolTable = symbolTable.parent;
        }

        return [];

    }

    findColumn(identifier: string): Symbol[] {

        let symbolTable: SymbolTable = this;
        while(symbolTable != null){

            let symbols = symbolTable.symbols.get(identifier.toLowerCase());
            if(symbols != null){
                symbols = symbols.filter(s => s.column != null);
                if(symbols.length > 0){
                    return symbols;
                }
            }

            symbolTable = symbolTable.parent;
        }

        return [];

    }

}

