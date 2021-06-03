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
        this.pushOneParameterMethod("max" ,"integer", "integer");
        this.pushOneParameterMethod("max" ,"float", "float");
        this.pushOneParameterMethod("min" ,"integer", "integer");
        this.pushOneParameterMethod("min" ,"float", "float");
        this.pushOneParameterMethod("avg" ,"integer", "integer");
        this.pushOneParameterMethod("avg" ,"float", "float");

        let countMethod = new SQLMethod("count", true, "integer", [new SQLMethodParameter("spalte", "text")]);
        countMethod.acceptsStarParameter = true;
        this.methods.push(countMethod);
    }
    
    getMethods(identifier: string){
        return this.methods.filter(m => m.identifier == identifier.toLowerCase());
    }


    pushOneParameterMethod(identifier: string, returnType: string, parameterType: string){
        this.methods.push(new SQLMethod(identifier, true, returnType, [new SQLMethodParameter("spalte", parameterType)]));

    }
}