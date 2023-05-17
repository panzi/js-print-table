#!/usr/bin/env node
import { printTableFromObjects } from "../src/index.js";

printTableFromObjects([
    { foo: 'Text', bar: 123 },
    { bar: NaN, baz: null },
    { bla: true },
]);

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
    indexColumn: true,
});
