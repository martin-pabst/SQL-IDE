import { TokenType } from "../lexer/Token.js";



export abstract class SQLType {

    name: string;
    parameterDescriptions: string[] = [];

    canCastToList: string[];

    resultTypeTable: {operator: TokenType, secondType: string, resultType: string}[];

    abstract canCastTo(type2: SQLType): boolean;

    abstract getResultType(operator: TokenType, secondType: SQLType): SQLType;

}