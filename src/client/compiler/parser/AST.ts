import { TokenType, TextPosition, Token } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { SQLBaseType, SQLType } from "./SQLTypes.js";
import { Table } from "./SQLTable.js";


export type ASTNode = 
    StatementNode | TermNode | ColumnNode | CreateTableColumnNode
    
    export type StatementNode = SelectNode | UpdateNode | InsertNode | CreateTableNode | 
            DeleteNode | DropTableNode | AlterTableNode | CreateIndexNode | OmittedStatementNode;

    export type TermNode = BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | DotNode | SelectNode | BracketsNode | StarAttributeNode | SelectNode | ListNode;

    export type TableOrSubqueryNode = SubqueryNode | JoinNode | TableNode;

export type ColumnNode = {
    type: TokenType.column | TokenType.allColumns,
    position: TextPosition,
    term: TermNode,
    distinct: boolean,
    alias?: string
}

export type OmittedStatementNode = {
    type: TokenType.omittedeStatement,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable
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
    endPosition: TextPosition,
    identifier: string,
    symbolTable: SymbolTable,
    ifNotExists: boolean,

    columnList: CreateTableColumnNode[],
    combinedPrimaryKeyColumns: string[],
    uniqueConstraints: string[][],
    foreignKeyInfoList: ForeignKeyInfo[]
}

export type ForeignKeyInfo = {
    column: string,
    referencesTable: string,
    referencesColumn: string,
    referencesPosition: TextPosition,
    onDelete?: string
    onUpdate?: string
}

export type CreateTableColumnNode = {
    type: TokenType.columnDef,
    position: TextPosition,
    identifier: string,
    isPrimary: boolean,
    isAutoIncrement: boolean,
    baseType: SQLBaseType,
    parameters?: number[],
    foreignKeyInfo?: ForeignKeyInfo,
    defaultValue?: string,
    notNull: boolean,
    collate?: string,
    referencesPosition?: TextPosition,
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


export type CreateIndexNode = {
    type: TokenType.keywordIndex,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,
    indexIdentifier: string,
    tableIdentifier: string,
    columnIdentifier: string,
    unique: boolean
}

export type AlterTableKind = "renameTable" | "renameColumn" | "addColumn" | "dropColumn" | "omittedKind";

export type AlterTableNode = {
    type: TokenType.keywordAlter,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,
    tableIdentifier: string,
    tableIdentifierPosition: TextPosition, 

    kind: AlterTableKind,
    newTableName?: string, // case "renameTable"
    oldColumnName?: string, // case "renameColumn" | "dropColumn"
    oldColumnPosition?: TextPosition;
    newColumnName?: string, // case "renameColumn" | "addColumn"
    columnDef?: CreateTableColumnNode  // case "addColumn"
    columnDefBegin?: TextPosition;

    primaryKeys?: string[];
    indices?: {index_name: string, column: string, unique: boolean}[];
    foreignKeys?: ForeignKeyInfo[];
    autoIncrementColumn?: string;
    modifyColumnInfo?: CreateTableColumnNode[];
}

export type DropTableNode = {
    type: TokenType.keywordDrop,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,
    tableIdentifier: string,
    tableIdentifierPosition: TextPosition, 
    ifExists: boolean
}

export type DeleteNode = {
    type: TokenType.keywordDelete,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,
    tableIdentifier: string,
    tableIdentifierPosition: TextPosition, 
    whereNode: TermNode,
    whereNodeBegin: TextPosition,
    whereNodeEnd: TextPosition  
}

export type UpdateNode = {
    type: TokenType.keywordUpdate,
    position: TextPosition,
    endPosition: TextPosition,
    symbolTable: SymbolTable,
    tableIdentifier: string,
    tableIdentifierPosition: TextPosition, 
    columnIdentifiers: string[],
    columnIdentifierPositions: TextPosition[],
    values: TermNode[],
    valuePosBegin: TextPosition[],
    valuePosEnd: TextPosition[],
    whereNode: TermNode,
    whereNodeBegin: TextPosition,
    whereNodeEnd: TextPosition  
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


