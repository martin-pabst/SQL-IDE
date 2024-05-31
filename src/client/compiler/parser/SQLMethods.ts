import { SQLBaseType, SQLType } from "./SQLTypes.js";

export class SQLMethodParameter {
    type: SQLType;
    constructor(public identifier: string, type: string){
        this.type = SQLBaseType.getBaseType(type);
    }
}

export class SQLMethod {
    acceptsStarParameter: boolean = false;
    public returnType: SQLType;
    constructor(public identifier: string, public isAggregating: boolean, returnType: string, public parameters: SQLMethodParameter[]){
        this.returnType = SQLBaseType.getBaseType(returnType);
    }

}

export class SQLMethodStore {

    static instance: SQLMethodStore;
    public methods: SQLMethod[] = [];

    static getInstance():SQLMethodStore {
        if(this.instance == null){
            this.instance = new SQLMethodStore();
        }
        return this.instance;
    }

    constructor(){
        this.pushOneParameterMethod("abs" ,"float", "float");
        this.pushOneParameterMethod("sin" ,"float", "float");
        this.pushOneParameterMethod("cos" ,"float", "float");
        this.pushOneParameterMethod("tan" ,"float", "float");
        this.pushOneParameterMethod("max" ,"integer", "integer");
        this.pushOneParameterMethod("max" ,"float", "float");
        this.pushOneParameterMethod("max" ,"date", "date");
        this.pushOneParameterMethod("max" ,"time", "time");
        this.pushOneParameterMethod("max" ,"datetime", "datetime");
        this.pushOneParameterMethod("max" ,"timestamp", "timestamp");
        this.pushOneParameterMethod("min" ,"integer", "integer");
        this.pushOneParameterMethod("min" ,"float", "float");
        this.pushOneParameterMethod("min" ,"date", "date");
        this.pushOneParameterMethod("min" ,"time", "time");
        this.pushOneParameterMethod("min" ,"datetime", "datetime");
        this.pushOneParameterMethod("min" ,"timestamp", "timestamp");
        this.pushOneParameterMethod("avg" ,"integer", "integer");
        this.pushOneParameterMethod("avg" ,"float", "float");
        this.pushOneParameterMethod("sum" ,"float", "float");
        this.pushOneParameterMethod("sum" ,"integer", "integer");
        this.pushOneParameterMethod("concat" ,"text", "text");
        this.pushOneParameterMethod("upper" ,"text", "text");
        this.pushOneParameterMethod("lower" ,"text", "text");
        this.pushOneParameterMethod("length" ,"integer", "text");
        this.pushOneParameterMethod("month" , "integer","date");
        this.pushOneParameterMethod("day" , "integer","date");
        this.pushOneParameterMethod("year" , "integer","date");

        let countMethod = new SQLMethod("count", true, "integer", [new SQLMethodParameter("spalte", "text")]);
        countMethod.acceptsStarParameter = true;
        this.methods.push(countMethod);

        let strftimeMethod = new SQLMethod("strftime", false, "text", [new SQLMethodParameter("formatstring", "text"), new SQLMethodParameter("date", "date")]);
        strftimeMethod.acceptsStarParameter = true;
        this.methods.push(strftimeMethod);

    }
    
    getMethods(identifier: string){
        return this.methods.filter(m => m.identifier == identifier.toLowerCase());
    }


    pushOneParameterMethod(identifier: string, returnType: string, parameterType: string){
        this.methods.push(new SQLMethod(identifier, true, returnType, [new SQLMethodParameter("spalte", parameterType)]));

    }
}