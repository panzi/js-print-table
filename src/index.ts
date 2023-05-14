type ProcessedLine = { length: number, line: string };
type ProcessedCell = { align: string, lines: ProcessedLine[], color: string };

export type FormatTableOptions = {
    header?: unknown[],
    body: unknown[][],
    alignment?: string,
    color?: boolean,
    separateRows?: boolean,
    separateColumns?: boolean,
};

const AlignRegExp = /^[<>]*$/;
const JsonLexRegExp = /("(?:\\["\\]|[^"])*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?[0-9]+(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?)/g;

const WeightBold   = '\u001b[1m';
const ColorReset   = '\u001b[0m';
// const ColorBlack   = '\u001b[30m';
const ColorRed     = '\u001b[31m';
const ColorGreen   = '\u001b[32m';
const ColorYellow  = '\u001b[33m';
const ColorBlue    = '\u001b[34m';
const ColorMagenta = '\u001b[35m';
const ColorCyan    = '\u001b[36m';
// const ColorWhite   = '\u001b[37m';
// const ColorBrightBlack   = '\u001b[30;1m';
// const ColorBrightRed     = '\u001b[31;1m';
// const ColorBrightGreen   = '\u001b[32;1m';
// const ColorBrightYellow  = '\u001b[33;1m';
// const ColorBrightBlue    = '\u001b[34;1m';
// const ColorBrightMagenta = '\u001b[35;1m';
// const ColorBrightCyan    = '\u001b[36;1m';
// const ColorBrightWhite   = '\u001b[37;1m';

declare global {
    var navigator: { userAgent: string }|undefined;
}

// \u{FE00}-\u{FE0F} variant selectors
// \u{200B}-\u{200D} zero width space, zero-width non-joiner, zero-width joiner
// \u{2060} word joiner
// \u{FEFF} zero-width no-break space
const IgnoreRegExp = /\p{Nonspacing_Mark}|\p{Default_Ignorable_Code_Point}|[\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{2060}\u{FEFF}]/gu;

// \u{3040}-\u{A4CF} I don't really know. guessed asian scripts
// \u{AC00}-\u{D7FF} Korean Hangul
// \u{20000}-\u{323AF} CJK Unified Ideographs Extensions
// \u{FF01}-\u{FF60} asian full-width characters
// \u{FFE0}-\u{FFE6} asian full-width characters
const DoubleWidthRegExp = /\p{Emoji_Presentation}|[\u{3040}-\u{A4CF}|\u{AC00}-\u{D7FF}\u{20000}-\u{323AF}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}\0\r\v\f]/gu;

const SurrogatePairRegExp = /[\u{D800}-\u{10FFFF}]/gu;

const ControlRegExp = /\p{Control}/gu;

const CharReplacement = {
    '\0': '\\0',
    '\r': '\\r', // '^M',
    '\v': '\\v', // '^K',
    '\f': '\\f', // '^L',
};

// const EscapedCharsRegExp = /[\0\r\v\f\x1b]/g;

const SpecialCharRegExp = /([\0\r\v\f])|(\p{Control})/gu;

export function formatTable({ header, body, alignment, color, separateRows, separateColumns }: FormatTableOptions): string[] {
    const maxlens: number[] = [];
    const alignfmt = alignment ?? '';
    const processed: ProcessedCell[][] = [];

    if (!AlignRegExp.test(alignfmt)) {
        throw new Error(`illegal alignment: ${alignfmt}`);
    }

    if (color === undefined) {
        color = typeof navigator !== "undefined" ?
            !navigator.userAgent.includes("Firefox") :
            true;
    }

    const numberColor  = color ? ColorGreen   : '';
    const nullColor    = color ? ColorBlue    : '';
    const symbolColor  = color ? ColorRed     : '';
    const stringColor  = color ? ColorMagenta : '';
    const funcColor    = color ? ColorCyan    : '';

    function processRow(row: unknown[]): ProcessedCell[] {
        const processedRow: ProcessedCell[] = [];
        for (let index = 0; index < row.length; ++ index) {
            const maxlen = maxlens[index];
            const cell = row[index];
            let align = alignfmt.charAt(index);
            let cellColor: string = '';
            switch (typeof cell) {
                case 'number':
                case 'bigint':
                case 'boolean':
                    align ||= '<';
                    cellColor = numberColor;
                    break;

                case 'symbol':
                    align ||= '>';
                    cellColor = symbolColor;
                    break;

                case 'function':
                    align ||= '>';
                    cellColor = funcColor;
                    break;

                default:
                    if (cell instanceof Date) {
                        align ||= '<';
                        cellColor = numberColor;
                    } else {
                        align ||= '>';

                        if (cell == null) {
                            cellColor = nullColor;
                        }
                    }
                    break;
            }

            const rawLines = (
                cell instanceof Date ? cell.toISOString() :
                typeof cell === 'object' ? JSON.stringify(cell, null, 4) :
                String(cell)
            ).replaceAll('\t', '    ').split('\n');

            let cellMaxlen = 0;
            const lines: ProcessedLine[] = [];
            for (const line of rawLines) {
                const cleanLine = line.replace(DoubleWidthRegExp, 'XX').replace(IgnoreRegExp, '').replace(ControlRegExp, '\\u####').replace(SurrogatePairRegExp, 'x');
                const len = cleanLine.length;
                if (len > cellMaxlen) {
                    cellMaxlen = len;
                }
                lines.push({ line, length: len });
            }

            if (maxlen === undefined || cellMaxlen > maxlen) {
                maxlens[index] = cellMaxlen;
            }

            if (typeof cell === 'object' && !(cell instanceof Date)) {
                for (const item of lines) {
                    let { line } = item;
                    if (color) {
                        line = line.replace(JsonLexRegExp, (all, str, bool, nul, num) => {
                            if (str) return stringColor + all + ColorReset;
                            if (nul) return nullColor + all + ColorReset;
                            return numberColor + all + ColorReset;
                        });
                    }
                    item.line = line + ' '.repeat(cellMaxlen - item.length);
                    item.length = cellMaxlen;
                }
            } else if (typeof cell === 'string') {
                if (color) {
                    for (const item of lines) {
                        item.line = item.line.
                            replace(SpecialCharRegExp, (_, esc, contr) => ColorYellow + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + ColorReset);
                    }
                } else {
                    for (const item of lines) {
                        item.line = item.line.
                            replace(SpecialCharRegExp, (_, esc, contr) => esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0'));
                    }
                }
            } else if (typeof cell === 'symbol') {
                if (color) {
                    for (const item of lines) {
                        item.line = item.line.
                            replace(SpecialCharRegExp, (_, esc, contr) => ColorYellow + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + symbolColor);
                    }
                } else {
                    for (const item of lines) {
                        item.line = item.line.
                            replace(SpecialCharRegExp, (_, esc, contr) => esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0'));
                    }
                }
            }

            processedRow.push({
                align,
                lines,
                color: cellColor,
            });
        }
        return processedRow;
    }

    const processedHeader = header ? processRow(header) : null;

    for (const row of body) {
        processed.push(processRow(row));
    }

    const colsep = separateColumns ? ' │ ' : '  ';

    function alignRow(row: ProcessedCell[]): string[] {
        const grid: string[][] = [];

        for (let cellIndex = 0; cellIndex < row.length; ++ cellIndex) {
            const maxlen = maxlens[cellIndex];
            const { align, lines, color } = row[cellIndex];
            const lineslen = lines.length;

            while (lineslen > grid.length) {
                const line: string[] = [];
                while (line.length < cellIndex) {
                    line.push(' '.repeat(maxlens[line.length]));
                }
                grid.push(line);
            }

            for (let lineIndex = 0; lineIndex < lineslen; ++ lineIndex) {
                const item = lines[lineIndex];
                const padding = ' '.repeat(maxlen - item.length);
                let { line } = item;

                if (color) {
                    line = color + line + ColorReset;
                }

                line = align === '<' ?
                    padding + line :
                    line + padding;

                grid[lineIndex][cellIndex] = line;
            }
        }

        return grid.map(line => {
            while (line.length < maxlens.length) {
                line.push(' '.repeat(maxlens[line.length]));
            }
            return '│ ' + line.join(colsep) + ' │';
        });
    }

    const lines: string[] = [];

    const hdrColSep = separateColumns ? '─┬─' : '──';
    const midColSep = separateColumns ? '─┼─' : '──';
    const ftrColSep = separateColumns ? '─┴─' : '──';

    lines.push('┌─' + maxlens.map(len => '─'.repeat(len)).join(hdrColSep) + '─┐');
    const seperator = '├─' + maxlens.map(len => '─'.repeat(len)).join(midColSep) + '─┤';

    if (processedHeader) {
        if (color) {
            for (const cell of processedHeader) {
                cell.color += WeightBold;
            }
        }
        for (const line of alignRow(processedHeader)) {
            lines.push(line);
        }
        if (separateRows) {
            const hdrCrossSep = separateColumns ? '═╪═' : '══';
            lines.push('╞═' + maxlens.map(len => '═'.repeat(len)).join(hdrCrossSep) + '═╡');
        } else {
            lines.push(seperator);
        }
    }

    let first = true;
    for (const row of processed) {
        if (first) {
            first = false;
        } else if (separateRows) {
            lines.push(seperator);
        }
        for (const line of alignRow(row)) {
            lines.push(line);
        }
    }
    lines.push('└─' + maxlens.map(len => '─'.repeat(len)).join(ftrColSep) + '─┘');
    return lines;
}

export function printTable(options: FormatTableOptions): void {
    console.log(formatTable(options).join('\n'));
}
