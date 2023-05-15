#!/usr/bin/env node
import { TableStyle } from "../src/index.js";

const { formatTable, printTable, DefaultTableStyle, SpaceTableStyle, RoundedTableStyle, AsciiTableStyle, FatHeaderBorderTableStyle, DoubleOutlineTableStyle, FatOutlineTableStyle } = await import("../src/index.js");

const color = !!process.stdout.isTTY;

const styleTable: string[][] = [];
const styleTableHeader: string[] = [''];

for (let borders = 0; borders < 4; ++ borders) {
    if (borders === 0) {
        styleTableHeader.push('Outline');
    } else {
        const rowBorders    = !!(borders & 1);
        const columnBorders = !!(borders & 2);

        const hdr: string[] = [];
        if (rowBorders) {
            hdr.push('Rows');
        }
        if (columnBorders) {
            hdr.push('Columns');
        }

        styleTableHeader.push(
            hdr.join(' & ')
        );
    }
}

for (let borders = 0; borders < 4; ++ borders) {
    if (borders === 0) {
        styleTableHeader.push('No Outline');
    } else {
        const rowBorders    = !!(borders & 1);
        const columnBorders = !!(borders & 2);

        const hdr: string[] = [];
        if (rowBorders) {
            hdr.push('Rows');
        }
        if (columnBorders) {
            hdr.push('Columns');
        }

        styleTableHeader.push(
            hdr.join(' & ')
        );
    }
}

const demoTable = [
    ['foo',   0],
    ['bar',  12],
    ['baz', 345],
];
const demoAlignment = '><';
const demoHeader = ['Hdr 1', 'Hdr 2'];

for (const [styleName, style] of [
    ['Default',           DefaultTableStyle],
    ['Space',             SpaceTableStyle],
    ['ASCII',             AsciiTableStyle],
    ['Rounded',           RoundedTableStyle],
    ['Fat Header Border', FatHeaderBorderTableStyle],
    ['Double Outline',    DoubleOutlineTableStyle],
    ['Fat Outline',       FatOutlineTableStyle],
] as [string, Partial<Readonly<TableStyle>>][]) {
    const row = [styleName];
    for (let borders = 0; borders < 4; ++ borders) {
        const rowBorders    = !!(borders & 1);
        const columnBorders = !!(borders & 2);

        const table = formatTable(demoTable, {
            header: demoHeader,
            alignment: demoAlignment,
            style,
            rowBorders,
            columnBorders,
            color,
        }).join('\n');

        row.push(table);
    }
    for (let borders = 0; borders < 4; ++ borders) {
        const rowBorders    = !!(borders & 1);
        const columnBorders = !!(borders & 2);

        const table = formatTable(demoTable, {
            outline: false,
            header: demoHeader,
            alignment: demoAlignment,
            style,
            rowBorders,
            columnBorders,
            color,
        }).join('\n');

        row.push(table);
    }
    styleTable.push(row);
}

printTable(styleTable, {
    header: styleTableHeader,
    style: SpaceTableStyle,
    color,
    rowBorders: false,
    columnBorders: false,
    raw: true,
    alignment: '>--------',
});
