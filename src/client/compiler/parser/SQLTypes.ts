import { TokenType } from "../lexer/Token.js";

type CheckFunction = (columnIdentifier: string, parameterValues: number[]) => string;
type OutputFunction = (value: any, parameterValues: number[]) => string;

export abstract class SQLType {

    abstract canCastTo(type2: SQLType): boolean;

    abstract getResultType(operator: TokenType, secondType: SQLType): SQLType;

}

export class SQLBaseType extends SQLType {

    // Map<tokenType, Map<SecondType, ResultType>>
    binaryResultTypes: Map<TokenType, Map<SQLBaseType, SQLBaseType>> = new Map();

    unaryOperators: TokenType[] = [];

    static baseTypes: SQLBaseType[] = [];
    static baseTypeMap: Map<string, SQLBaseType> = new Map();

    constructor(public name: string, public parameterDescriptions: string[],
        public checkFunction: CheckFunction, public outputFunction: OutputFunction, public canCastToList: string[]) {
            super();
    }

    static getBaseType(name: string){
        return this.baseTypeMap.get(name.toLocaleLowerCase());
    }

    static addBaseTypes(baseTypes: SQLBaseType[]) {
        SQLBaseType.baseTypes = SQLBaseType.baseTypes.concat(baseTypes);
        baseTypes.forEach(t => SQLBaseType.baseTypeMap.set(t.name, t));
    }

    addBinaryOperation(tokenType: TokenType | TokenType[], secondType: SQLBaseType, resultType: SQLBaseType, isCommutative: boolean = true) {

        if (!Array.isArray(tokenType)) tokenType = [tokenType];

        tokenType.forEach(t => {
            let map: Map<SQLBaseType, SQLBaseType> = this.binaryResultTypes.get(t);
            if (map == null) {
                map = new Map();
                this.binaryResultTypes.set(t, map);
            }
            map.set(secondType, resultType);
            if (isCommutative && secondType != this) {
                secondType.addBinaryOperation(t, this, resultType, false);
            }
        });

    }

    canCastTo(type2: SQLType): boolean {

        let bt2: SQLBaseType = type2 instanceof SQLBaseType ? type2 : type2["baseType"];

        return this.canCastToList.indexOf(bt2.name) >= 0;

    }

    getResultType(operator: TokenType, secondType: SQLType): SQLType {

        
        let map = this.binaryResultTypes.get(operator);
        if(map == null) return null;
        
        let bt2: SQLBaseType = secondType instanceof SQLBaseType ? secondType : secondType["baseType"];

        return map.get(bt2);

    }

}

export class SQLDerivedType extends SQLType {
    
    name: string;
    
    constructor(public baseType: SQLBaseType, public parameterValues: number[]) {
        super();
        this.name = `${baseType.name}(${parameterValues.join(", ")})`;
    }

    canCastTo(type2: SQLType): boolean {

        let bt2: SQLBaseType = type2 instanceof SQLBaseType ? type2 : type2["baseType"];

        return this.baseType.canCastToList.indexOf(bt2.name) >= 0;

    }

    getResultType(operator: TokenType, secondType: SQLType): SQLType {

        
        let map = this.baseType.binaryResultTypes.get(operator);
        if(map == null) return null;
        
        let bt2: SQLBaseType = secondType instanceof SQLBaseType ? secondType : secondType["baseType"];

        let returnBaseType = map.get(bt2);

        if(this.baseType == bt2 && this.baseType == returnBaseType && secondType instanceof SQLDerivedType){
            if(this.baseType.name == "varchar" || operator == TokenType.concatenation){
                return new SQLDerivedType(this.baseType, [this.parameterValues[0] + secondType.parameterValues[0]]);
            }
            if(this.baseType.name == "decimal"){
                return new SQLDerivedType(this.baseType, [Math.max(this.parameterValues[0], secondType.parameterValues[0]), Math.max(this.parameterValues[1], secondType.parameterValues[1])]);
            }
        }

        return map.get(bt2);

    }

}

let tens: number[] = [1, 10, 100, 1000, 100000, 100000, 1000000, 10000000, 100000000, 1000000000];

var varcharType = new SQLBaseType("varchar", ["Maximale Länge"], (ci, pv) => `check(length(${ci}) <= pv[0])`,
    (v: string, pv) => v.substr(0, pv[0]), ["text"]);

var textType = new SQLBaseType("text", [], (ci, pv) => "", (v: string, pv) => v, ["varchar"]);

var decimalType = new SQLBaseType("decimal", ["Gesamtzahl der Stellen", "Nachkommastellen"], (ci, pv) => "",
    (v: number, pv) => { let vk = Math.trunc(v); let nk = v - vk; return "" + vk + (pv[1] > 0 ? "." + Math.round(nk * tens[pv[1]]) : "") },
    ["numeric"]);

var numericType = new SQLBaseType("numeric", [], (ci, pv) => "", (v: number, pv) => "" + v, ["decimal"]);

var dateType = new SQLBaseType("date", [], (ci, pv) => `check(isDate(${ci}))`, (v: string, pv) => v, []);
var dateTimeType = new SQLBaseType("datetime", [], (ci, pv) => `check(isDateTime(${ci}))`, (v: string, pv) => v, []);

var booleanType = new SQLBaseType("boolean", [], (ci, pv) => `check(${ci} == 0 or ${ci} == 1)`, (v, pv) => v == 1 ? "true" : "false",
    ["varchar", "text", "decimal", "numeric"]);

SQLBaseType.addBaseTypes([varcharType, textType, decimalType, numericType, dateType, dateTimeType, booleanType]);

varcharType.addBinaryOperation(TokenType.concatenation, varcharType, varcharType);
varcharType.addBinaryOperation(TokenType.concatenation, textType, textType);
textType.addBinaryOperation(TokenType.concatenation, textType, textType);

let numericBinaryOperators: TokenType[] = [TokenType.plus, TokenType.minus, TokenType.multiplication, TokenType.division, TokenType.modulo];
let comparisonOperators: TokenType[] = [TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual, TokenType.equal, TokenType.notEqual];
let numericTypes = [decimalType, numericType];

for (let i = 0; i < numericTypes.length; i++) {
    for (let j = i; j < numericTypes.length; j++) {
        numericTypes[i].addBinaryOperation(numericBinaryOperators, numericTypes[j], numericTypes[j]);
        numericTypes[i].addBinaryOperation(comparisonOperators, numericTypes[j], booleanType);
    }
    numericTypes[i].unaryOperators = [TokenType.minus];
}

decimalType.addBinaryOperation(numericBinaryOperators, decimalType, decimalType);

let characterTypes = [varcharType, textType];
for (let i = 0; i < characterTypes.length; i++) {
    for (let j = i; j < characterTypes.length; j++) {
        characterTypes[i].addBinaryOperation(TokenType.concatenation, characterTypes[j], characterTypes[j]);
        characterTypes[i].addBinaryOperation(comparisonOperators, characterTypes[j], booleanType);
    }
}
varcharType.addBinaryOperation(TokenType.concatenation, varcharType, varcharType);

let booleanOperations = [TokenType.keywordAnd, TokenType.keywordOr];
booleanType.addBinaryOperation(booleanOperations, booleanType, booleanType);

booleanType.unaryOperators = [TokenType.keywordNot];
