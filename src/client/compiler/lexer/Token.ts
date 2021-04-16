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
    keywordGroup,
    keywordBy,
    keywordHaving,
    keywordOrder,
    keywordAscending,
    keywordDescending,
    keywordNulls,
    keywordFirst,
    keywordLast,

    keywordOr,
    keywordAnd,
    keywordNot,

    keywordJoin,
    keywordNatural,
    keywordLeft,
    keywordCross,
    keywordInner,
    keywordOuter,
    keywordOn,
    keywordAs,
    keywordLimit,
    keywordOffset,

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
    concatenation,    
    equal,
    notEqual,

    // semicolon
    semicolon, // ;

    // comma
    comma, // ,

    // backslash
    backslash,

    // @
    pipe,

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
    binaryOp,
    table,
    subquery

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
    [TokenType.keywordGroup]: "group",
    [TokenType.keywordBy]: "by",
    [TokenType.keywordHaving]: "having",
    [TokenType.keywordOrder]: "order",
    [TokenType.keywordAscending]: "ascending",
    [TokenType.keywordDescending]: "descending",
    [TokenType.keywordNulls]: "nulls",
    [TokenType.keywordFirst]: "first",
    [TokenType.keywordLast]: "last",


    [TokenType.keywordAnd]: "and",
    [TokenType.keywordOr]: "or",
    [TokenType.keywordNot]: "not",

    [TokenType.keywordJoin]: "join",
    [TokenType.keywordNatural]: "natural",
    [TokenType.keywordLeft]: "left",
    [TokenType.keywordCross]: "cross",
    [TokenType.keywordInner]: "inner",
    [TokenType.keywordOuter]: "outer",
    [TokenType.keywordOn]: "on",
    [TokenType.keywordAs]: "as",
    [TokenType.keywordLimit]: "limit",
    [TokenType.keywordOffset]: "offset",

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
    [TokenType.concatenation]: "||", 
    
    // semicolon
    [TokenType.semicolon]: ";", // ;

    // comma
    [TokenType.comma]: ",", 

    // backslash
    [TokenType.backslash]: "\\",

    // at
    [TokenType.at]: "@",
    
    // pipe
    [TokenType.pipe]: "|",

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
    '|': TokenType.pipe,
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
    "group": TokenType.keywordGroup,
    "by": TokenType.keywordBy,
    "having": TokenType.keywordHaving,
    "order": TokenType.keywordOrder,
    "asc": TokenType.keywordAscending,
    "desc": TokenType.keywordDescending,
    "nulls": TokenType.keywordNulls,
    "first": TokenType.keywordFirst,
    "last": TokenType.keywordLast,

    "or": TokenType.keywordOr,
    "and": TokenType.keywordAnd,
    "not": TokenType.keywordNot,

    "join": TokenType.keywordJoin,
    "natural": TokenType.keywordNatural,
    "left": TokenType.keywordLeft,
    "cross": TokenType.keywordCross,
    "inner": TokenType.keywordInner,
    "outer": TokenType.keywordOuter,
    "on": TokenType.keywordOn,
    "as": TokenType.keywordAs,
    "limit": TokenType.keywordLimit,
    "offset": TokenType.keywordOffset,


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