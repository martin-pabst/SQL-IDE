import { TokenType, TextPosition, Token } from "../lexer/Token.js";


export type ASTNode = 
    SelectNode | TermNode 
    
    export type TermNode = BinaryOpNode | UnaryOpNode | MethodcallNode | 
    ConstantNode | IdentifierNode | BracketsNode;

export type SelectNode = {
    type: TokenType.keywordSelect,
    position: TextPosition
}


export type IdentifierNode = {
    type: TokenType.identifier,
    position: TextPosition,

    identifier: string,
}

export type ConstantNode = {
    type: TokenType.constantNode,
    position: TextPosition,

    constantType: TokenType,
    constant: any
}

export type MethodcallNode = {
    type: TokenType.callMethod,
    position: TextPosition,
    rightBracketPosition: TextPosition,

    identifier: string,
    operands: TermNode[],
    commaPositions: TextPosition[]
}

export type UnaryOpNode = {
    type: TokenType.unaryOp,
    position: TextPosition,

    operator: TokenType,
    operand: TermNode
}

export type BinaryOpNode = {
    type: TokenType.binaryOp,
    position: TextPosition,

    operator: TokenType,
    firstOperand: TermNode,
    secondOperand: TermNode
}

export type BracketsNode = {
    type: TokenType.rightBracket,
    position: TextPosition, // position after right Bracket
    termInsideBrackets: TermNode

}


