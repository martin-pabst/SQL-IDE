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
    keywordRename,
    keywordTo,
    keywordAlter,
    keywordAdd,
    keywordDelete,
    keywordSelect,
    keywordInsert,
    keywordInto,
    keywordValues,
    keywordUpdate,
    keywordSet,
    keywordCreate,
    keywordReferences,
    keywordPrimary,
    keywordForeign,
    keywordTable,
    keywordColumn,
    keywordDrop,
    keywordKey,
    keywordAutoincrement,
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
    keywordIs,
    keywordNull,

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
    keywordIn,
    keywordNotIn,
    keywordLike,
    keywordCollate,
    keywordDefault,
    keywordEngine,
    keywordCharset,

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
    identifierQuote,
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
    subquery,
    list,
    column,
    columnDef,
    allColumns, // *
    isNull,
    isNot, // used by lexer to lex "is not null" into one token
    isNotNull,
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
    [TokenType.keywordRename]: "rename",
    [TokenType.keywordTo]: "to",
    [TokenType.keywordAlter]: "alter",
    [TokenType.keywordAdd]: "add",
    [TokenType.keywordDelete]: "delete",
    [TokenType.keywordSelect]: "select",
    [TokenType.keywordInsert]: "insert",
    [TokenType.keywordInto]: "into",
    [TokenType.keywordValues]: "values",
    [TokenType.keywordUpdate]: "update",
    [TokenType.keywordSet]: "set",
    [TokenType.keywordCreate]: "create",
    [TokenType.keywordReferences]: "references",
    [TokenType.keywordPrimary]: "primary",
    [TokenType.keywordForeign]: "foreign",
    [TokenType.keywordTable]: "table",
    [TokenType.keywordColumn]: "column",
    [TokenType.keywordDrop]: "drop",
    [TokenType.keywordKey]: "key",
    [TokenType.keywordAutoincrement]: "autoincrement",
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
    [TokenType.keywordIs]: "is",
    [TokenType.keywordNull]: "null",


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
    [TokenType.keywordIn]: "in",
    [TokenType.keywordNotIn]: "not in",
    [TokenType.keywordLike]: "like",
    [TokenType.keywordCollate]: "collate",
    [TokenType.keywordDefault]: "default",
    [TokenType.keywordEngine]: "engine",
    [TokenType.keywordCharset]: "charset",

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
    [TokenType.identifierQuote]: "`",
    [TokenType.lower]: "<", 
    [TokenType.greater]: ">",
    [TokenType.equal]: "=", 
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
    '`': TokenType.identifierQuote, // ', "
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
    "rename": TokenType.keywordRename,
    "to": TokenType.keywordTo,
    "alter": TokenType.keywordAlter,
    "add": TokenType.keywordAdd,
    "delete": TokenType.keywordDelete,
    "select": TokenType.keywordSelect,
    "insert": TokenType.keywordInsert,
    "into": TokenType.keywordInto,
    "values": TokenType.keywordValues,
    "update": TokenType.keywordUpdate,
    "set": TokenType.keywordSet,
    "create": TokenType.keywordCreate,
    "references": TokenType.keywordReferences,
    "primary": TokenType.keywordPrimary,
    "foreign": TokenType.keywordForeign,
    "table": TokenType.keywordTable,
    "column": TokenType.keywordColumn,
    "drop": TokenType.keywordDrop,
    "key": TokenType.keywordKey,
    "autoincrement": TokenType.keywordAutoincrement,
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
    "is": TokenType.keywordIs,
    "null": TokenType.keywordNull,

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
    "in": TokenType.keywordIn,
    "not in": TokenType.keywordNotIn,
    "like": TokenType.keywordLike,
    "collate": TokenType.keywordCollate,
    "default": TokenType.keywordDefault,
    "engine": TokenType.keywordEngine,
    "charset": TokenType.keywordCharset


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
    commentBefore?: Token,
    isDoubleQuotedIdentifier?: boolean
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