import { TokenType, TextPosition, Token } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { SQLType } from "./SQLTypes.js";
import { Table } from "./SQLTable.js";


export type ASTNode = 
    StatementNode | TermNode 
    
    export type StatementNode = SelectNode | UpdateNode;

    export type TermNode = BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | SelectNode | BracketsNode | StarAttributeNode;

    export type TableOrSubqueryNode = SubqueryNode | JoinNode | TableNode;

export type SelectNode = {
    type: TokenType.keywordSelect,
    position: TextPosition,
    endPosition: TextPosition,
    parentStatement: StatementNode,
    symbolTable: SymbolTable,
    
    columnList: TermNode[],
    fromNode: TableOrSubqueryNode,
    whereNode: TermNode,
    groupByNode?: GroupByNode,
    havingNode?: HavingNode,
    orderByNode?: OrderByNode
}

export type GroupByNode = {
    type: TokenType.keywordGroup,
    position: TextPosition,
    
    columnList: TermNode[],
}

export type HavingNode = {
    type: TokenType.keywordHaving,
    position: TextPosition,
    
    condition: TermNode,
}

export type OrderByNode = {
    type: TokenType.keywordOrder,
    position: TextPosition,
    
    columnList: TermNode[],
}


export type UpdateNode = {
    type: TokenType.keywordSelect,
    position: TextPosition,
    parentStatement: StatementNode,
    symbolTable: SymbolTable  
}

export type IdentifierNode = {
    type: TokenType.identifier,
    position: TextPosition,
    identifier: string,
    symbol?: Symbol
}

export type StarAttributeNode = {
    type: TokenType.multiplication,
    position: TextPosition,
    symbol?: Symbol
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

    alias: string,

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


