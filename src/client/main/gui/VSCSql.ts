/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function defineVscSQL() {
    monaco.languages.register({ id: 'vscSQL', 
    extensions: ['.sql'],
    //  mimetypes: ["text/x-java-source", "text/x-java"]  
    });

    let conf: monaco.languages.LanguageConfiguration = {
        onEnterRules: [
            {
                // e.g. /** | */
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: { indentAction: monaco.languages.IndentAction.IndentOutdent, appendText: ' * ' }
            },
            {
                // e.g. /** ...|
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: { indentAction: monaco.languages.IndentAction.None, appendText: ' * ' }
            },
            {
                // e.g.  * ...|
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
                action: { indentAction: monaco.languages.IndentAction.None, appendText: '* ' }
            },
            {
                // e.g.  */|
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
                action: { indentAction: monaco.languages.IndentAction.None, removeText: 1 }
            },
            {
                // e.g.  *-----*/|
                beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
                action: { indentAction: monaco.languages.IndentAction.None, removeText: 1 }
            }
        ],
        comments: {
            lineComment: '--',
            blockComment: ['/*', '*/'],
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '\'', close: '\'' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '\'', close: '\'' },
        ]
    };
    let language = {

        defaultToken: '',
        tokenPostfix: '.sql',
        ignoreCase: true,
        brackets: [
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' }
        ],
        keywords: [
            "ABORT","ACTION","ADD","AFTER","ALL","ALTER","ANALYZE","AND","AS","ASC","ATTACH","AUTOINCREMENT","BEFORE",
            "BEGIN","BETWEEN","BY","CASCADE","CASE","CAST","CHECK","COLLATE","COLUMN","COMMIT","CONFLICT","CONSTRAINT",
            "CREATE","CROSS","CURRENT_DATE","CURRENT_TIME","CURRENT_TIMESTAMP","DATABASE","DEFAULT","DEFERRABLE","DEFERRED",
            "DELETE","DESC","DETACH","DISTINCT","DROP","EACH","ELSE","END","ESCAPE","EXCEPT","EXCLUSIVE","EXISTS","EXPLAIN",
            "FAIL","FOR","FOREIGN","FROM","FULL","GLOB","GROUP","HAVING","IF","IGNORE","IMMEDIATE","IN","INDEX","INDEXED",
            "INITIALLY","INNER","INSERT","INSTEAD","INTERSECT","INTO","IS","ISNULL","JOIN","KEY","LEFT","LIKE","LIMIT","MATCH",
            "NATURAL","NO","NOT","NOTNULL","NULL","OF","OFFSET","ON","OR","ORDER","OUTER","PLAN","PRAGMA","PRIMARY","QUERY",
            "RAISE","RECURSIVE","REFERENCES","REGEXP","REINDEX","RELEASE","RENAME","REPLACE","RESTRICT","RIGHT","ROLLBACK","ROW",
            "SAVEPOINT","SELECT","SET","TABLE","TEMP","TEMPORARY","THEN","TO","TRANSACTION","TRIGGER","UNION","UNIQUE","UPDATE",
            "USING","VACUUM","VALUES","VIEW","VIRTUAL","WHEN","WHERE","WITH","WITHOUT"
        ],
        operators: [
            "AND", "BETWEEN", "IN", "LIKE", "NOT", "OR", "IS", "NULL", "INTERSECT", "UNION", "INNER", "JOIN", "LEFT", "OUTER", "RIGHT"
        ],
        builtinFunctions: [
            "abs", "changes", "char", "coalesce", "glob", "hex", "ifnull",
            "iif", "instr", "last_insert_rowid", "length", "like", "likelihood", "likely",
            "lower", "ltrim", "max", "min", "nullif", "quote", "random", "randomblob", 
            "replace", "round", "rtrim", "sign", "soundex", "sqlite_version", "substr", "substring", 
            "total_changes", "trim", "typeof", "unicode", "unlikely", "upper", "zeroblob"
        ],
        builtinVariables: [
        // NOT SUPPORTED
        ],
        pseudoColumns: [
        // NOT SUPPORTED
        ],
        tokenizer: {
            root: [
                { include: '@comments' },
                { include: '@whitespace' },
                { include: '@pseudoColumns' },
                { include: '@numbers' },
                { include: '@strings' },
                { include: '@complexIdentifiers' },
                { include: '@scopes' },
                [/[;,.]/, 'delimiter'],
                [/[()]/, '@brackets'],
                [/[\w@#$]+/, {
                        cases: {
                            '@keywords': 'keyword',
                            '@operators': 'operator',
                            '@builtinVariables': 'predefined',
                            '@builtinFunctions': 'predefined',
                            '@default': 'identifier'
                        }
                    }],
                [/[<>=!%&+\-*/|~^]/, 'operator'],
            ],
            whitespace: [
                [/\s+/, 'white']
            ],
            comments: [
                [/--+.*/, 'comment'],
                [/\/\*/, { token: 'comment.quote', next: '@comment' }]
            ],
            comment: [
                [/[^*/]+/, 'comment'],
                // Not supporting nested comments, as nested comments seem to not be standard?
                // i.e. http://stackoverflow.com/questions/728172/are-there-multiline-comment-delimiters-in-sql-that-are-vendor-agnostic
                // [/\/\*/, { token: 'comment.quote', next: '@push' }],    // nested comment not allowed :-(
                [/\*\//, { token: 'comment.quote', next: '@pop' }],
                [/./, 'comment']
            ],
            pseudoColumns: [
                [/[$][A-Za-z_][\w@#$]*/, {
                        cases: {
                            '@pseudoColumns': 'predefined',
                            '@default': 'identifier'
                        }
                    }],
            ],
            numbers: [
                [/0[xX][0-9a-fA-F]*/, 'number'],
                [/[$][+-]*\d*(\.\d*)?/, 'number'],
                [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
            ],
            strings: [
                [/'/, { token: 'string', next: '@string' }],
            ],
            string: [
                [/[^']+/, 'string'],
                [/''/, 'string'],
                [/'/, { token: 'string', next: '@pop' }]
            ],
            complexIdentifiers: [
                [/"/, { token: 'identifier.quote', next: '@quotedIdentifier' }]
            ],
            quotedIdentifier: [
                [/[^"]+/, 'identifier'],
                [/""/, 'identifier'],
                [/"/, { token: 'identifier.quote', next: '@pop' }]
            ],
            scopes: [
            // NOT SUPPORTED
            ]
        }



    };

    //@ts-ignore
    monaco.languages.setLanguageConfiguration('vscSQL', conf);
    //@ts-ignore
    monaco.languages.setMonarchTokensProvider('vscSQL', language);



}