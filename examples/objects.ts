#!/usr/bin/env node
import { printTableFromObjects } from "../src/index.js";

const color = !!process.stdout.isTTY;

printTableFromObjects([
    { foo: 'Text', bar: 123 },
    { bar: NaN, baz: null },
    { bla: true },
], {
    color
});

console.log();

printTableFromObjects([
    { foo: 'Text', bar: 123 },
    { bar: NaN, baz: null },
    { bla: true },
], {
    header: [
        ['baz', 'BAZ'],
        'foo',
    ],
    color,
    indexColumn: true,
});
