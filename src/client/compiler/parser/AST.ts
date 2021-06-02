import { TokenType, TextPosition, Token } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { SQLType } from "./SQLTypes.js";
import { Table } from "./SQLTable.js";


export type ASTNode = 
    StatementNode | TermNode 
    
    export type StatementNode = SelectNode | UpdateNode;

    export type TermNode = BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | DotNode | SelectNode | BracketsNode | StarAttributeNode | SelectNode | ListNode;

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
    orderByNode?: OrderByNode[],
    limitNode?: LimitNode
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
    type: TokenType.keywordSelect,
    position: TextPosition,
    parentStatement: StatementNode,
    symbolTable: SymbolTable  
}

export type DotNode = {
    type: TokenType.dot,
    position: TextPosition,
    identifierLeft: IdentifierNode,
    identifierRight: IdentifierNode,
    symbol?: Symbol
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


