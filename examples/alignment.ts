#!/usr/bin/env node
import { printTable } from "../src/index.js";

const color = !!process.stdout.isTTY;

printTable([
    [
        'This text is left aligned.\n' +
        'Again, everything works as expected.\n' +
        'A',

        'This text is centered.\n' +
        'Lines with different length are handeled correctly.\n' +
        'B',

        'This text is right aligned.\n' +
        'Nothing to be surprised by here!\n' +
        'C',
    ],
    [
        'Row 2, Column 1',
        'Row 2, Column 2',
        'Row 2, Column 3',
    ]
], {
    header: ['Left Aligned', 'Centered', 'Right Aligned'],
    alignment: '>-<',
    columnBorders: true,
    rowBorders: true,
    outline: false,
    color,
});

console.log();

printTable([
    ['Left', 'Center', 'Right'],
    ['Some longer text...', 'Some longer text...', 'Some longer text...'],
], {
    header: ['Center', 'Right', 'Left'],
    alignment: '>-<',
    headerAlignment: '-<>',
    columnBorders: true,
    color,
});
