import { TokenType } from "../lexer/Token.js";

type CheckFunction = (columnIdentifier: string, parameterValues: number[]) => string;
type OutputFunction = (value: any, parameterValues: number[]) => string;

export abstract class SQLType {

    abstract canCastTo(type2: SQLType): boolean;

    abstract getBinaryResultType(operator: TokenType, secondType: SQLType): SQLType;

    abstract getUnaryResultType(operator: TokenType): SQLType;

    abstract getBinaryResult(operator: TokenType, value1: any, value2: any): any;

    abstract toString(): string;

    abstract getBaseTypeName(): string;

}

export class SQLBaseType extends SQLType {
    // Map<tokenType, Map<SecondType, ResultType>>
    binaryResultTypes: Map<TokenType, Map<SQLBaseType, SQLBaseType>> = new Map();

    unaryOperators: TokenType[] = [];

    static baseTypes: SQLBaseType[] = [];
    static baseTypeMap: Map<string, SQLBaseType> = new Map();

    public canCastToList: string[];

    constructor(public name: string, public parameterDescriptions: string[],
        public checkFunction: CheckFunction, public outputFunction: OutputFunction, canCastToList: string[]) {
        super();
        this.canCastToList = canCastToList.slice(0);
        let ownIndex = this.canCastToList.indexOf(name);
        if(ownIndex >= 0) this.canCastToList.splice(ownIndex, 1);
    }

    static fromConstantType(tt: TokenType): SQLBaseType {
        switch (tt) {
            case TokenType.stringConstant:
                return this.baseTypeMap.get("text");
            case TokenType.integerConstant:
                return this.baseTypeMap.get("integer");
            case TokenType.floatingPointConstant:
                return this.baseTypeMap.get("float");
            case TokenType.charConstant:
                return this.baseTypeMap.get("text");
            case TokenType.booleanConstant:
                return this.baseTypeMap.get("boolean");
            case TokenType.keywordNull:
                return this.baseTypeMap.get("null");
        
            default:
                break;
        }
    }

    getBaseTypeName(): string {
        return this.name;
    }

    toString(): string {
        return this.name;
    }

    static getBaseType(name: string) {
        if(name == 'char') name = 'varchar';
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

        return this.canCastToList.indexOf(bt2.name) >= 0 || this.name == bt2.name;

    }

    getBinaryResultType(operator: TokenType, secondType: SQLType): SQLType {


        let map = this.binaryResultTypes.get(operator);
        if (map == null) return null;

        let bt2: SQLBaseType = secondType instanceof SQLBaseType ? secondType : secondType["baseType"];

        return map.get(bt2);

    }

    getUnaryResultType(operator: TokenType): SQLType {
        if([TokenType.isNull, TokenType.isNotNull].indexOf(operator) >= 0) return booleanType;
        if(this.unaryOperators.indexOf(operator)>= 0) return this;
    }

    getBinaryResult(operator: TokenType, value1: any, value2: any): any {
        switch (operator) {
            case TokenType.concatenation:
                if (value1 != null && value2 != null) return value1 + value2;
                return value1 != null ? value1 : value2;
            case TokenType.plus:
                if (value1 != null && value2 != null) return value1 + value2;
                return value1 != null ? value1 : value2;
            case TokenType.minus:
                if (value1 != null && value2 != null) return value1 - value2;
                return value1 != null ? value1 : value2;
            case TokenType.multiplication:
                if (value1 != null && value2 != null) return value1 * value2;
                return value1 != null ? value1 : value2;
            case TokenType.division:
                if (value1 != null && value2 != null) return value1 * value2;
                return value1 != null ? value1 : value2;
            case TokenType.keywordAnd:
                if (value1 != null && value2 != null) return value1 * value2;
                return value1 != null ? value1 : value2;
            case TokenType.keywordOr:
                if (value1 != null && value2 != null) return Math.max(value1, value2);
                return value1 != null ? value1 : value2;
            case TokenType.lower:
                if (value1 != null && value2 != null) return value1 < value2;
                return value1 != null ? false : true;
            case TokenType.greater:
                if (value1 != null && value2 != null) return value1 >= value2;
                return value1 != null ? false : true;
            case TokenType.lowerOrEqual:
                if (value1 != null && value2 != null) return value1 <= value2;
                return value1 != null ? false : true;
            case TokenType.greaterOrEqual:
                if (value1 != null && value2 != null) return value1 >= value2;
                return value1 != null ? false : true;
            case TokenType.equal:
                return value1 == value2;
            case TokenType.notEqual:
                return value1 != value2;
        }
    }


}

let tens: number[] = [1, 10, 100, 1000, 100000, 100000, 1000000, 10000000, 100000000, 1000000000];

export class SQLDerivedType extends SQLType {

    name: string;

    constructor(public baseType: SQLBaseType, public parameterValues: number[]) {
        super();
        let parameters = parameterValues.join(", ");
        this.name = baseType.name + "(" + parameters + ")";
    }

    toString(): string {
        return this.name;
    }

    getBaseTypeName(): string {
        return this.baseType.name;
    }


    canCastTo(type2: SQLType): boolean {

        let bt2: SQLBaseType = type2 instanceof SQLBaseType ? type2 : type2["baseType"];

        return this.baseType.canCastToList.indexOf(bt2.name) >= 0 || this.baseType.name == bt2.name;

    }

    getBinaryResultType(operator: TokenType, secondType: SQLType): SQLType {


        let map = this.baseType.binaryResultTypes.get(operator);
        if (map == null) return null;

        let bt2: SQLBaseType = secondType instanceof SQLBaseType ? secondType : secondType["baseType"];

        let returnBaseType = map.get(bt2);

        if (this.baseType == bt2 && this.baseType == returnBaseType && secondType instanceof SQLDerivedType) {
            if (this.baseType.name == "varchar" || operator == TokenType.concatenation) {
                return new SQLDerivedType(this.baseType, [this.parameterValues[0] + secondType.parameterValues[0]]);
            }
            if (this.baseType.name == "decimal") {
                return new SQLDerivedType(this.baseType, [Math.max(this.parameterValues[0], secondType.parameterValues[0]), Math.max(this.parameterValues[1], secondType.parameterValues[1])]);
            }
        }

        return map.get(bt2);

    }

    getUnaryResultType(operator: TokenType): SQLType {
        return this.baseType.getUnaryResultType(operator);
    }

    getBinaryResult(operator: TokenType, value1: any, value2: any): any {
        let result = this.baseType.getBinaryResult(operator, value1, value2);
        if (this.name = "varchar") return result == null ? null : ("" + result).substr(0, this.parameterValues[0]);
        if (this.name == "decimal") {
            if (result == null) return null;
            return Math.round(result * tens[this.parameterValues[1]]) / tens[this.parameterValues[1]];
        }

        return result;
    }
}

let textTypes = ["varchar", "char", "text" ,"tinytext", "mediumtext", "longtext"];

var varcharType = new SQLBaseType("varchar", ["Maximale Länge"], (ci, pv) => `check(length(${ci}) <= ${pv[0]})`,
    (v: string, pv) => v.substring(0, pv[0]), textTypes);
    
var charType = new SQLBaseType("char", ["Maximale Länge"], (ci, pv) => `check(length(${ci}) <= ${pv[0]})`,
    (v: string, pv) => v.substring(0, pv[0]), textTypes);

var textType = new SQLBaseType("text", ["Maximale Länge"], (ci, pv) => "", (v: string, pv) => v, textTypes.concat(["date", "datetime", "timestamp"]));
var tinyTextType = new SQLBaseType("tinyText", [], (ci, pv) => "", (v: string, pv) => v, textTypes);
var mediumTextType = new SQLBaseType("mediumText", [], (ci, pv) => "", (v: string, pv) => v, textTypes);
var longTextType = new SQLBaseType("longText", [], (ci, pv) => "", (v: string, pv) => v, textTypes);

let floatTypes = ["decimal", "numeric", "double", "real", "float"];

var decimalType = new SQLBaseType("decimal", ["Gesamtzahl der Stellen", "Nachkommastellen"], (ci, pv) => "",
    (v: number, pv) => { let vk = Math.trunc(v); let nk = v - vk; return "" + vk + (pv[1] > 0 ? "." + Math.round(nk * tens[pv[1]]) : "") },
    floatTypes);
var numericType = new SQLBaseType("numeric", ["Gesamtzahl der Stellen", "Nachkommastellen"], (ci, pv) => "", (v: number, pv) => "" + v, floatTypes);
var doubleType = new SQLBaseType("double", ["Gesamtzahl der Stellen", "Nachkommastellen"], (ci, pv) => "", (v: number, pv) => "" + v, floatTypes);
var realType = new SQLBaseType("real", [], (ci, pv) => "", (v: number, pv) => "" + v, floatTypes);
var floatType = new SQLBaseType("float", [], (ci, pv) => "", (v: number, pv) => "" + v, floatTypes);

let inttypes = ["int", "integer", "tinyint", "smallint", "mediumint", "bigint"];
let numberTypes = inttypes.concat(floatTypes);

var intType = new SQLBaseType("int", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);
var integerType = new SQLBaseType("integer", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);
var tinyIntType = new SQLBaseType("tinyint", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);
var smallIntType = new SQLBaseType("smallint", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);
var mediumIntType = new SQLBaseType("mediumint", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);
var bigIntType = new SQLBaseType("bigint", ["Maximale Anzahl der Stellen"], (ci, pv) => `check(round(${ci}) = ${ci})`, (v: number, pv) => "" + Math.round(v), numberTypes);

var dateType = new SQLBaseType("date", [], (ci, pv) => `check(isDate(${ci}))`, (v: string, pv) => v, []);
var dateTimeType = new SQLBaseType("datetime", [], (ci, pv) => `check(isDateTime(${ci}))`, (v: string, pv) => v, ["timestamp"]);
var timestampType = new SQLBaseType("timestamp", [], (ci, pv) => `check(isDateTime(${ci}))`, (v: string, pv) => v, ["datetime"]);

var booleanType = new SQLBaseType("boolean", [], (ci, pv) => `check(${ci} == 0 or ${ci} == 1)`, (v, pv) => v == 1 ? "true" : "false",
    ["varchar", "text", "decimal", "numeric"]);

var nullType = new SQLBaseType("null", [], (ci, pv) => "", (v, pv) => v,
    []);

let numericTypes = [decimalType, numericType, doubleType, realType, floatType, intType, integerType, tinyIntType, smallIntType, mediumIntType, bigIntType];

let baseTypes = [varcharType, charType, textType, tinyTextType, mediumTextType, longTextType,
    dateType, dateTimeType, timestampType, booleanType, nullType].concat(numericTypes);

SQLBaseType.addBaseTypes(baseTypes);

varcharType.addBinaryOperation(TokenType.concatenation, varcharType, varcharType);
varcharType.addBinaryOperation(TokenType.concatenation, charType, varcharType);
varcharType.addBinaryOperation(TokenType.concatenation, textType, textType);
textType.addBinaryOperation(TokenType.concatenation, textType, textType);
varcharType.addBinaryOperation(TokenType.keywordLike, varcharType, booleanType);
varcharType.addBinaryOperation(TokenType.keywordLike, textType, booleanType);
textType.addBinaryOperation(TokenType.keywordLike, textType, booleanType);

charType.addBinaryOperation(TokenType.concatenation, charType, charType);
charType.addBinaryOperation(TokenType.concatenation, varcharType, charType);
charType.addBinaryOperation(TokenType.concatenation, textType, textType);
textType.addBinaryOperation(TokenType.concatenation, textType, textType);
charType.addBinaryOperation(TokenType.keywordLike, charType, booleanType);
charType.addBinaryOperation(TokenType.keywordLike, textType, booleanType);
textType.addBinaryOperation(TokenType.keywordLike, textType, booleanType);

let numericBinaryOperators: TokenType[] = [TokenType.plus, TokenType.minus, TokenType.multiplication, TokenType.division, TokenType.modulo];
let comparisonOperators: TokenType[] = [TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual, TokenType.equal, TokenType.notEqual];

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

let booleanOperations = [TokenType.keywordAnd, TokenType.keywordOr];
booleanType.addBinaryOperation(booleanOperations, booleanType, booleanType);

booleanType.unaryOperators = [TokenType.keywordNot];

baseTypes.forEach(bt => bt.unaryOperators = bt.unaryOperators.concat([TokenType.isNull, TokenType.isNotNull]));