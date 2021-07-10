import { TokenType, TextPosition, Token } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { SQLBaseType, SQLType } from "./SQLTypes.js";
import { Table } from "./SQLTable.js";


export type ASTNode = 
    StatementNode | TermNode | ColumnNode | CreateTableColumnNode
    
    export type StatementNode = SelectNode | UpdateNode | InsertNode | CreateTableNode;

    export type TermNode = BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | DotNode | SelectNode | BracketsNode | StarAttributeNode | SelectNode | ListNode;

    export type TableOrSubqueryNode = SubqueryNode | JoinNode | TableNode;

export type ColumnNode = {
    type: TokenType.column | TokenType.allColumns,
    position: TextPosition,
    term: TermNode,
    alias?: string
}

export type SelectNode = {
    type: TokenType.keywordSelect,
    position: TextPosition,
    endPosition: TextPosition,
    parentStatement: StatementNode,
    symbolTable: SymbolTable,
    
    columnList: ColumnNode[],
    fromNode: TableOrSubqueryNode,
    fromStartPosition?: TextPosition,
    fromEndPosition?: TextPosition,
    whereNode: TermNode,
    groupByNode?: GroupByNode,
    orderByNode?: OrderByNode[],
    limitNode?: LimitNode,
    sqlType?: SQLType
}

export type InsertNode = {
    type: TokenType.keywordInsert,
    position: TextPosition,
    valuesPosition: TextPosition,
    columnsPosition: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,

    table: TableNode,
    columnList: IdentifierNode[],
    values: ConstantNode[][]
}

export type CreateTableNode = {
    type: TokenType.keywordCreate,
    position: TextPosition,
    identifier: string,
    symbolTable: SymbolTable,

    columnList: CreateTableColumnNode[],
    combinedPrimaryKeyColumns: string[],
    foreignKeyInfoList: ForeignKeyInfo[]
}

export type ForeignKeyInfo = {
    column: string,
    referencesTable: string,
    referencesColumn: string
}

export type CreateTableColumnNode = {
    type: TokenType.columnDef,
    position: TextPosition,
    identifier: string,
    isPrimary: boolean,
    baseType: SQLBaseType,
    referencesTable?: string,
    referencesColumn?: string
}

export type GroupByNode = {
    type: TokenType.keywordGroup,
    position: TextPosition,

    having?: TermNode,
    
    columnList: TermNode[],
}

export type LimitNode = {
    type: TokenType.keywordLimit,
    position: TextPosition,
    numberOfRows: TermNode,
    offset?: TermNode
}

export type OrderByNode = {
    type: TokenType.keywordOrder,
    position: TextPosition,

    column: TermNode
}


export type UpdateNode = {
    type: TokenType.keywordUpdate,
    position: TextPosition,
    parentStatement: StatementNode,
    symbolTable: SymbolTable  
}

export type DotNode = {
    type: TokenType.dot,
    position: TextPosition,
    identifierLeft: IdentifierNode,
    identifierRight: IdentifierNode,
    symbol?: Symbol,
    sqlType?: SQLType
}

export type IdentifierNode = {
    type: TokenType.identifier,
    position: TextPosition,
    identifier: string,
    symbol?: Symbol,
    sqlType?: SQLType
}

export type StarAttributeNode = {
    type: TokenType.allColumns,
    position: TextPosition,
    symbol?: Symbol,
    sqlType?: SQLType
}

export type ConstantNode = {
    type: TokenType.constantNode,
    position: TextPosition,
    sqlType?: SQLType,

    constantType: TokenType,
    constant: any
}

export type MethodcallNode = {
    type: TokenType.callMethod,
    position: TextPosition,
    sqlType?: SQLType,

    rightBracketPosition: TextPosition,
    identifier: string,
    operands: TermNode[],
    commaPositions: TextPosition[]
}

export type UnaryOpNode = {
    type: TokenType.unaryOp,
    position: TextPosition,
    sqlType?: SQLType,

    operator: TokenType,
    operand: TermNode
}

export type BinaryOpNode = {
    type: TokenType.binaryOp,
    position: TextPosition,
    sqlType?: SQLType,

    operator: TokenType,
    firstOperand: TermNode,
    secondOperand: TermNode
}

export type JoinNode = {
    type: TokenType.keywordJoin,
    position: TextPosition,
    sqlType?: SQLType,

    on?: TermNode,

    firstOperand: TableOrSubqueryNode,
    secondOperand: TableOrSubqueryNode
}

export type TableNode = {
    type: TokenType.table,
    position: TextPosition,
    sqlType?: SQLType,

    identifier: string,
    alias: string,
    table?: Table
}

export type ListNode = {
    type: TokenType.list,
    position: TextPosition,
    sqlType?: SQLType,

    elements: ConstantNode[]
}

export type SubqueryNode = {
    type: TokenType.subquery,
    position: TextPosition,
    sqlType?: SQLType,

    query: SelectNode,
    alias: string,
    table?: Table
}

export type BracketsNode = {
    type: TokenType.rightBracket,
    position: TextPosition, // position after right Bracket
    sqlType?: SQLType,

    termInsideBrackets: TermNode

}


