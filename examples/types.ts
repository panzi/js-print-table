#!/usr/bin/env node
import { printTable } from "../src/index.js";

const color = !!process.stdout.isTTY;

printTable([
    ['number',     123,         123.4],
    ['',             4.001,       0.567],
    ['',            -1.2e-10,     2.3e32],
    ['',           NaN,        -100.5],
    ['',      Infinity,   -Infinity],
    ['bigint', 123567890n,  -1234567890n],
    ['boolean', true, false],
    ['string', 'A string with some special characters:\n\0 \r \v \f \u001b \x7f', 
    `Tabs:
		tab
1		tab
12		tab
123		tab
1234	tab
12345	tab
123456	tab
1234567	tab
`],
    ['symbol', Symbol("symbol with special characters:\n\0 \r \v \f \u001b \x7f"), Symbol.iterator],
    ['function', ()=>{}, function(){}],
    ['object', null, {
        "key": "value",
        "array": [1, 2n, true, false, null, "\0 \r \v \f \u001b \x7f\n", new Date()]
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
    color,
});
