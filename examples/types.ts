#!/usr/bin/env node
import { printTable } from "../src/index.js";

const color = !!process.stdout.isTTY;

printTable([
    ['number',     123,         123.4],
    ['',             4,           0.567],
    ['',           NaN,        -100.5],
    ['',      Infinity,   -Infinity],
    ['bigint', 123567890n,  -1234567890n],
    ['boolean', true, false],
    ['string', 'A string with some special characters:\n\0 \r \v \f \u001b \x7f', 'Tabs are just 4 spaces for now,\nmight improve later:\n\ttab\n    4 spaces'],
    ['symbol', Symbol("symbol with special characters:\n\0 \r \v \f \u001b \x7f")],
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
