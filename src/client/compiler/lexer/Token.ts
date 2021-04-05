export enum TokenType {
    identifier,
    // constants
    integerConstant,
    floatingPointConstant,
    booleanConstant,
    stringConstant,
    charConstant,
    true,
    false,
    // keywords
    keywordSelect,
    keywordFrom,
    keywordWhere,

    // brackets
    leftBracket, // ()
    rightBracket,
    leftSquareBracket, // []
    rightSquareBracket,
    leftCurlyBracket, // {}
    rightCurlyBracket,
    leftRightSquareBracket, // []
    
    // binary operators
    dot, //.
    modulo,
    minus, plus, multiplication, division,
    singleQuote, doubleQuote, // ', "
    lower, greater, lowerOrEqual, greaterOrEqual, 
    
    equal,
    notEqual,

    // semicolon
    semicolon, // ;

    // comma
    comma, // ,

    // backslash
    backslash,

    // @
    at,

    // whitespace
    space,

    tab,

    // newline
    newline,

    // line feed
    linefeed,

    // only lexer-internal
    identifierChar,  // none of the special chars above a..zA..Z_Äö...

    // Comment
    comment,

    endofSourcecode, // will be generated after sourcecode end
    
    // Program statement types:
    
    // additional AST node types
    constantNode,
    callMethod,
    unaryOp,
    binaryOp

}

export var TokenTypeReadable: {[tt: number]: string} = {
    [TokenType.identifier]: "ein Bezeichner",
    // constants
    [TokenType.integerConstant]: "eine Integer-Konstante",
    [TokenType.floatingPointConstant]: "eine Fließkomma-Konstante",
    [TokenType.booleanConstant]: "eine boolesche Konstante",
    [TokenType.stringConstant]: "eine Zeichenketten-Konstante",
    [TokenType.charConstant]: "eine char-Konstante",
    [TokenType.true]: "true",
    [TokenType.false]: "false",
    // keywords
    [TokenType.keywordSelect]: "select",
    [TokenType.keywordFrom]: "from",
    [TokenType.keywordWhere]: "where",

    // brackets
    [TokenType.leftBracket]: "(", // ()
    [TokenType.rightBracket]: ")",
    [TokenType.leftSquareBracket]: "[", // []
    [TokenType.rightSquareBracket]: "]",
    [TokenType.leftCurlyBracket]: "{", // {}
    [TokenType.rightCurlyBracket]: "}",
    [TokenType.leftRightSquareBracket]: "[]", 
    
    // operators
    [TokenType.dot]: ".", //.
    [TokenType.minus]: "-", 
    [TokenType.modulo]: "%", 
    [TokenType.plus]: "+", 
    [TokenType.multiplication]: "*", 
    [TokenType.division]: "/",
    [TokenType.singleQuote]: "'", 
    [TokenType.doubleQuote]: "\"", // ']: "", "
    [TokenType.lower]: "<", 
    [TokenType.greater]: ">", 
    [TokenType.lowerOrEqual]: "<=", 
    [TokenType.greaterOrEqual]: ">=", 
    
    // semicolon
    [TokenType.semicolon]: ";", // ;

    // comma
    [TokenType.comma]: ",", 

    // backslash
    [TokenType.backslash]: "\\",

    // at
    [TokenType.at]: "@",

    // whitespace
    [TokenType.space]: "ein Leerzeichen",
    [TokenType.tab]: "ein Tabulatorzeichen",

    // newline
    [TokenType.newline]: "ein Zeilenumbruch",

    // only lexer-internal
    [TokenType.identifierChar]: "eines der Zeichen a..z, A..Z, _",  // none of the special chars above a..zA..Z_Äö...

    // Comment
    [TokenType.comment]: "ein Kommentar",

    [TokenType.endofSourcecode]: "das Ende des Programmes"

}

export var specialCharList: {[keyword: string]:TokenType} = {
    '(': TokenType.leftBracket, // ()
    ')': TokenType.rightBracket,
    '[': TokenType.leftSquareBracket, // []
    ']': TokenType.rightSquareBracket,
    '{': TokenType.leftCurlyBracket, // {}
    '}': TokenType.rightCurlyBracket,
    
    // operators
    '.': TokenType.dot, //.
    ',': TokenType.comma, //.
    '-': TokenType.minus,
    '%': TokenType.modulo,
    '+': TokenType.plus, 
    '*': TokenType.multiplication, 
    '/': TokenType.division,
    '\\': TokenType.backslash,
    '@': TokenType.at,
    '\'': TokenType.singleQuote, 
    '"': TokenType.doubleQuote, // ', "
    "<": TokenType.lower,
    ">": TokenType.greater,
    "=": TokenType.equal,
    "<>": TokenType.notEqual,
    
    ';': TokenType.semicolon, // ;

    // whitespace
    ' ': TokenType.space,
    '\t': TokenType.tab,

    // newline
    '\n': TokenType.newline,
    '\r': TokenType.linefeed
}

export var keywordList: {[keyword: string]:TokenType} = {
    "select": TokenType.keywordSelect,
    "from": TokenType.keywordFrom,
    "where": TokenType.keywordWhere,
    "true": TokenType.true,
    "false": TokenType.false,
};

export var EscapeSequenceList: {[keyword: string]:string} = {
    "n": "\n",
    "r": "\r",
    "t": "\t",
    "\"": "\"",
    "'": "'",
    "\\": "\\"
}

export type TextPosition = {
    line: number,
    column: number, 
    length: number
}

export type TextPositionWithoutLength = {
    line: number,
    column: number
}

export type Token = {
    tt: TokenType,
    value: string|number|boolean,
    position: TextPosition,
    commentBefore?: Token
}

export type TokenList = Token[];

function tokenToString(t: Token){
    return "<div><span style='font-weight: bold'>" + TokenType[t.tt] + "</span>" +
            "<span style='color: blue'> &nbsp;'" + t.value + "'</span> (l&nbsp;" + t.position.line + ", c&nbsp;" + t.position.column + ")</div>";
}
 
export function tokenListToString(tl: TokenList):string{
    let s = "";
    for(let t of tl){
        s += tokenToString(t) + "\n";
    }
    return s;
}