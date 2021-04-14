import { TokenType, TextPosition, Token } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { SQLType } from "./SQLTypes.js";


export type ASTNode = 
    StatementNode | TermNode 
    
    export type StatementNode = SelectNode | UpdateNode;

    export type TermNode = JoinNode | BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | SelectNode | BracketsNode | StarAttributeNode;

export type SelectNode = {
    type: TokenType.keywordSelect,
    position: TextPosition,
    endPosition: TextPosition,
    subQueries: SelectNode[], 
    parentStatement: StatementNode,
    symbolTable: SymbolTable,
    
    columnList: TermNode[],
    tableList: TermNode[],
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
    subQueries: SelectNode[],
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

    leftRight?: TokenType.keywordLeft | TokenType.keywordRight,
    innerOuter?: TokenType.keywordInner | TokenType.keywordOuter,
    on?: TermNode,

    firstOperand: TermNode,
    secondOperand: TermNode
}

export type BracketsNode = {
    type: TokenType.rightBracket,
    position: TextPosition, // position after right Bracket
    sqlType?: SQLType,

    termInsideBrackets: TermNode

}


