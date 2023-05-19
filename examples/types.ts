#!/usr/bin/env node
import { printTable } from "../src/index.js";
import { inspect } from "util";

function aFunc (a: number, b: number) {
    return a + b;
}

const table: unknown[][] = [
    ['number',     123,         123.4],
    ['',             4.001,       0.567],
    ['',            -1.2e-10,     2.3e32],
    ['',           NaN,        -100.5],
    ['',      Infinity,   -Infinity],
    ['bigint', 123567890n,  -1234567890n],
    ['boolean', true, false],
    ['string', 'A string with some special characters:\n\0 \r \v \f \u001b \x7f', 
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
    ['symbol', Symbol("symbol with special characters:\n\0 \r \v \f \u001b \x7f"), Symbol.iterator],
    ['function', ()=>{}, aFunc],
    ['object', null, {
        key: "value",
        array: [1, 2n, 12.34, 1.1e-10, 2.2e32, Infinity, -Infinity, NaN, true, false, null, "\0 \r \v \f \u001b \x7f\n", new Date()],
        aFunc,
        anonFunc: () => {},
        undef: undefined,
        sym: Symbol("foo bar"),
    }],
    ['undefined', undefined],
    ['Date', new Date(), new Date(0)],
];

const header = [
    'Type',
    'Value 1',
    'Value 2',
];

printTable(table, {
    header,
    columnBorders: true,
});

console.log();
console.log("Passing { formatCell: inspect }");

const circular = {
    key1: 'value',
    key2: {
        foo: {
            bar: [1] as unknown[]
        },
        baz: null as unknown,
        egg: null as unknown,
        spam: Object.create(null),
    },
};

circular.key2.foo.bar.push(circular);
circular.key2.baz = circular.key2;
circular.key2.egg = circular;

table[table.length - 3][1] = circular;
table[table.length - 2][2] = null;

printTable(table, {
    header,
    columnBorders: true,
    formatCell: inspect,
});
