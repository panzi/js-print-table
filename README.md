Print Table
===========

[![License: MIT](https://img.shields.io/github/license/panzi/js-print-table)](https://github.com/panzi/js-print-table/blob/main/LICENSE)
[Documentation](https://panzi.github.io/js-print-table)
[GitHub](https://github.com/panzi/js-print-table/)

A library to print a nicely formatted table, because I didn't like `console.table()`.
This has no dependencies whatsoever, though when colors are enabled it prints thise
using ANSI escape sequences (which are supported by the console of Chromium based browsers).

Example Usage
-------------

```TypeScript
function aFunc (a: number, b: number) {
    return a + b;
}

printTable([
    ['number',     123,         123.4],
    ['',             4.001,       0.567],
    ['',            -1.2e-10,     2.3e32],
    ['',           NaN,        -100.5],
    ['',      Infinity,   -Infinity],
    ['bigint', 123567890n,  -1234567890n],
    ['boolean', true, false],
    ['string', 'Special chars:\n\0 \r \v \f \u001b \x7f', 
    `Tabs:
		2 tabs
1		2 tabs
12		2 tabs
123		2 tabs
1234	1 tab
12345	1 tab
123456	1 tab
1234567	1 tab
`],
    ['symbol',
     Symbol("special chars:\n\0 \r \v \f \u001b \x7f"),
     Symbol.iterator],
    ['function', ()=>{}, aFunc],
    ['object', null, {
        key: "value",
        array: [1, 2n, 12.34, true, false, null,
                "\0 \r \v \f", "\u001b \x7f\n",
                new Date()],
        aFunc,
        anonFunc: () => {},
        undef: undefined,
        sym: Symbol("foo bar"),
    }],
    ['undefined', undefined],
    ['Date', new Date(), new Date(0)],
], {
    header: [
        'Type',
        'Value 1',
        'Value 2',
    ],
    columnBorders: true,
});
```

Screenshot illustrating printing with colors:

![Screenshot](screenshot.png)

Plaintext output:

```text
┌───────────┬──────────────────────────────────┬──────────────────────────────────────────┐
│   Type    │             Value 1              │                 Value 2                  │
├───────────┼──────────────────────────────────┼──────────────────────────────────────────┤
│ number    │                        123       │                                123.4     │
│           │                          4.001   │                                  0.567   │
│           │                         -1.2e-10 │                                  2.3e+32 │
│           │                        NaN       │                               -100.5     │
│           │                   Infinity       │                          -Infinity       │
│ bigint    │                  123567890       │                        -1234567890       │
│ boolean   │                       true       │                              false       │
│ string    │ Special chars:                   │ Tabs:                                    │
│           │ \0 \r \v \f \u001b \u007f        │         2 tabs                           │
│           │                                  │ 1       2 tabs                           │
│           │                                  │ 12      2 tabs                           │
│           │                                  │ 123     2 tabs                           │
│           │                                  │ 1234    1 tab                            │
│           │                                  │ 12345   1 tab                            │
│           │                                  │ 123456  1 tab                            │
│           │                                  │ 1234567 1 tab                            │
│           │                                  │                                          │
│ symbol    │ Symbol(special chars:            │ Symbol(Symbol.iterator)                  │
│           │ \0 \r \v \f \u001b \u007f)       │                                          │
│ function  │ [Function (anonymous)]           │ [Function: aFunc]                        │
│ object    │ null                             │ {                                        │
│           │                                  │     "key": "value",                      │
│           │                                  │     "array": [                           │
│           │                                  │         1,                               │
│           │                                  │         "2",                             │
│           │                                  │         12.34,                           │
│           │                                  │         true,                            │
│           │                                  │         false,                           │
│           │                                  │         null,                            │
│           │                                  │         "\u0000 \r \u000b \f",           │
│           │                                  │         "\u001b \u007f\n",               │
│           │                                  │         "2023-05-19T01:50:11.308Z"       │
│           │                                  │     ],                                   │
│           │                                  │     "sym": "Symbol(foo bar)"             │
│           │                                  │ }                                        │
│ undefined │ undefined                        │                                          │
│ Date      │        2023-05-19T01:50:11.308Z  │                1970-01-01T00:00:00.000Z  │
└───────────┴──────────────────────────────────┴──────────────────────────────────────────┘
```
