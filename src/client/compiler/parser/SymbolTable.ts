import { TextPosition } from "../lexer/Token.js";
import { Table, Column } from "./SQLTable.js";

export type Symbol = {
    identifier: string;
    table?: Table;
    column?: Column;

    posOfDefinition: TextPosition;
    referencedOnPositions: TextPosition[];
}

export class SymbolTable {

    parent: SymbolTable; // SymbolTable of parent scope
    positionFrom: TextPosition;
    positionTo: TextPosition;

    childSymbolTables: SymbolTable[] = [];

    Symbols: Map<string, Symbol> = new Map();

    constructor(parentSymbolTable: SymbolTable, positionFrom: TextPosition, positionTo: TextPosition) {

        this.parent = parentSymbolTable;

        this.positionFrom = positionFrom;
        this.positionTo = positionTo;


        if (this.parent != null) {
            this.parent.childSymbolTables.push(this);
        }
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


}

