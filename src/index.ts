type ProcessedLine = { length: number, line: string };
type ProcessedCell = { align: string, lines: ProcessedLine[], color: string };

export type FormatTableOptions = {
    readonly header?: ReadonlyArray<unknown>,
    readonly alignment?: string,
    readonly headerAlignment?: string,
    readonly color?: boolean,
    readonly rowBorders?: boolean,
    readonly columnBorders?: boolean,
    readonly outline?: boolean,
    readonly style?: Partial<Readonly<TableStyle>>,
    readonly raw?: boolean,
};

const AlignRegExp = /^[- .<>]*$/;
const JsonLexRegExp = /("(?:\\["\\]|[^"])*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?[0-9]+(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?)/g;
const JsonEscapeRegExp = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g;

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
const DoubleWidthRegExp = /\p{Emoji_Presentation}|[\u{3040}-\u{A4CF}\u{AC00}-\u{D7FF}\u{20000}-\u{323AF}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}\0\r\v\f]/gu;

const SurrogatePairRegExp = /[\u{D800}-\u{10FFFF}]/gu;

const ControlRegExp = /\p{Control}/gu;

const CharReplacement = {
    '\0': '\\0',
    '\r': '\\r', // '^M',
    '\v': '\\v', // '^K',
    '\f': '\\f', // '^L',
};

const SpecialCharRegExp = /([\0\r\v\f])|([\u{0}-\u{9}\u{B}-\u{1F}\u{7F}-\u{9F}])/gu;

// TODO: match more ANSI escape sequences
const AnsiEscapeRegExp = /\u001b\[\d+(?:;\d+)*m/gu;

export interface TableStyle {
    columnBorder: string;
    columnNoBorder: string;
    paddingChar: string;
    leftOutline: string;
    rightOutline: string;
    topOutlineColumnBorder: string;
    borderCrossing: string;
    noBorderCrossing: string;
    bottomOutlineColumnBorder: string;
    topLeftOutline: string;
    bottomLeftOutline: string;
    topRightOutline: string;
    bottomRightOutline: string;
    rowBorder: string;
    horizontalOutline: string;
    leftOutlineRowBorder: string;
    rightOutlineRowBorder: string;
    leftHeaderRowBorder: string;
    rightHeaderRowBorder: string;
    headerBorder: string;
    headerBorderCrossing: string;
    headerNoBorderCrossing: string;
    outlineNoBorderCrossing: string;
}

export const DefaultTableStyle: Readonly<TableStyle> = {
    columnBorder: ' │ ',
    columnNoBorder: '  ',
    paddingChar: ' ',
    leftOutline: '│ ',
    rightOutline: ' │',
    topOutlineColumnBorder: '─┬─',
    borderCrossing: '─┼─',
    noBorderCrossing: '──',
    bottomOutlineColumnBorder: '─┴─',
    topLeftOutline:     '┌─',
    bottomLeftOutline:  '└─',
    topRightOutline:    '─┐',
    bottomRightOutline: '─┘',
    rowBorder: '─',
    horizontalOutline: '─',
    leftOutlineRowBorder:  '├─',
    rightOutlineRowBorder: '─┤',
    leftHeaderRowBorder:   '╞═',
    rightHeaderRowBorder:  '═╡',
    headerBorder: '═',
    headerBorderCrossing: '═╪═',
    headerNoBorderCrossing: '══',
    outlineNoBorderCrossing: '──',
};

export const SpaceTableStyle: Readonly<TableStyle> = {
    columnBorder: '  ',
    columnNoBorder: '  ',
    paddingChar: ' ',
    leftOutline: ' ',
    rightOutline: ' ',
    topOutlineColumnBorder: '  ',
    borderCrossing: '  ',
    noBorderCrossing: '  ',
    bottomOutlineColumnBorder: '  ',
    topLeftOutline:     ' ',
    bottomLeftOutline:  ' ',
    topRightOutline:    ' ',
    bottomRightOutline: ' ',
    rowBorder: ' ',
    horizontalOutline: ' ',
    leftOutlineRowBorder:  ' ',
    rightOutlineRowBorder: ' ',
    leftHeaderRowBorder:   ' ',
    rightHeaderRowBorder:  ' ',
    headerBorder: ' ',
    headerBorderCrossing: '  ',
    headerNoBorderCrossing: '  ',
    outlineNoBorderCrossing: '  ',
};

export const AsciiTableStyle: Readonly<TableStyle> = {
    columnBorder: ' | ',
    columnNoBorder: '  ',
    paddingChar: ' ',
    leftOutline: '| ',
    rightOutline: ' |',
    topOutlineColumnBorder: '---',
    borderCrossing: '-+-',
    noBorderCrossing: '--',
    bottomOutlineColumnBorder: '---',
    topLeftOutline:     '+-',
    bottomLeftOutline:  '+-',
    topRightOutline:    '-+',
    bottomRightOutline: '-+',
    rowBorder: '-',
    horizontalOutline: '-',
    leftOutlineRowBorder:  '+-',
    rightOutlineRowBorder: '-+',
    leftHeaderRowBorder:   '|=',
    rightHeaderRowBorder:  '=|',
    headerBorder: '=',
    headerBorderCrossing: '===',
    headerNoBorderCrossing: '==',
    outlineNoBorderCrossing: '--',
};

export const RoundedTableStyle: Partial<Readonly<TableStyle>> = {
    topLeftOutline:     '╭─',
    bottomLeftOutline:  '╰─',
    topRightOutline:    '─╮',
    bottomRightOutline: '─╯',
};

export const FatHeaderBorderTableStyle: Partial<Readonly<TableStyle>> = {
    leftHeaderRowBorder:   '┝━',
    rightHeaderRowBorder:  '━┥',
    headerBorder: '━',
    headerBorderCrossing: '━┿━',
    headerNoBorderCrossing: '━━',
};

export const DoubleOutlineTableStyle: Partial<Readonly<TableStyle>> = {
    leftOutline: '║ ',
    rightOutline: ' ║',
    topOutlineColumnBorder:    '═╤═',
    bottomOutlineColumnBorder: '═╧═',
    topLeftOutline:     '╔═',
    bottomLeftOutline:  '╚═',
    topRightOutline:    '═╗',
    bottomRightOutline: '═╝',
    horizontalOutline: '═',
    leftOutlineRowBorder:  '╟─',
    rightOutlineRowBorder: '─╢',
    leftHeaderRowBorder:   '╠═',
    rightHeaderRowBorder:  '═╣',
    outlineNoBorderCrossing: '══',
};

export const FatOutlineTableStyle: Partial<Readonly<TableStyle>> = {
    leftOutline: '┃ ',
    rightOutline: ' ┃',
    topOutlineColumnBorder:    '━┯━',
    bottomOutlineColumnBorder: '━┷━',
    topLeftOutline:     '┏━',
    bottomLeftOutline:  '┗━',
    topRightOutline:    '━┓',
    bottomRightOutline: '━┛',
    horizontalOutline: '━',
    leftOutlineRowBorder:  '┠─',
    rightOutlineRowBorder: '─┨',
    leftHeaderRowBorder:   '┣━',
    rightHeaderRowBorder:  '━┫',
    headerBorder: '━',
    headerBorderCrossing: '━┿━',
    headerNoBorderCrossing: '━━',
    outlineNoBorderCrossing: '━━',
};

const DefaultOptions: FormatTableOptions = {
    outline: true,
    columnBorders: false,
    rowBorders: false,
    style: DefaultTableStyle,
};

export type Table = ReadonlyArray<ReadonlyArray<unknown>>;

export function formatTable(body: Table, { header, alignment, headerAlignment, color, outline, rowBorders, columnBorders, style, raw }: FormatTableOptions = DefaultOptions): string[] {
    const maxlens: number[] = [];
    const processed: ProcessedCell[][] = [];

    if (alignment && !AlignRegExp.test(alignment)) {
        throw new Error(`illegal alignment: ${alignment}`);
    }

    if (headerAlignment && !AlignRegExp.test(headerAlignment)) {
        throw new Error(`illegal headerAlignment: ${headerAlignment}`);
    }

    outline ??= true;

    const {
        columnBorder,
        columnNoBorder,
        paddingChar,
        leftOutline,
        rightOutline,
        topOutlineColumnBorder,
        borderCrossing,
        noBorderCrossing,
        bottomOutlineColumnBorder,
        topLeftOutline,
        bottomLeftOutline,
        topRightOutline,
        bottomRightOutline,
        rowBorder,
        horizontalOutline,
        leftOutlineRowBorder,
        rightOutlineRowBorder,
        leftHeaderRowBorder,
        rightHeaderRowBorder,
        headerBorder,
        headerBorderCrossing,
        headerNoBorderCrossing,
        outlineNoBorderCrossing,
    } = style ? { ...DefaultTableStyle, ...style } : DefaultTableStyle;

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
    const escapeColor  = color ? ColorYellow  : '';

    function processRow(row: ReadonlyArray<unknown>, alignment: string): ProcessedCell[] {
        const processedRow: ProcessedCell[] = [];
        for (let index = 0; index < row.length; ++ index) {
            const maxlen = maxlens[index];
            const cell = row[index];
            let align = alignment.charAt(index);
            if (align === ' ') {
                align = '';
            }
            let cellColor: string = '';
            switch (typeof cell) {
                case 'number':
                case 'bigint':
                    align ||= '.';
                    cellColor = numberColor;
                    break;

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
                        if (cell == null) {
                            cellColor = nullColor;
                        }
                    }
                    break;
            }

            const rawLines = (
                cell instanceof Date ? cell.toISOString() :
                typeof cell === 'object' ? JSON.stringify(cell, (_key, value) => typeof value === 'bigint' ? String(value) : value, 4).
                    replace(SpecialCharRegExp, (_, esc, contr) =>
                        (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0'))) :
                String(cell)
            ).replaceAll('\t', '    ').split('\n');

            let cellMaxlen = 0;
            const lines: ProcessedLine[] = [];
            for (const line of rawLines) {
                let cleanLine = line.replace(DoubleWidthRegExp, 'XX').replace(IgnoreRegExp, '');
                if (raw) {
                    cleanLine = cleanLine.replace(AnsiEscapeRegExp, '');
                } else {
                    cleanLine = cleanLine.replace(ControlRegExp, '\\u####');
                }
                cleanLine = cleanLine.replace(SurrogatePairRegExp, 'x');
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
                            if (str) return stringColor + all.replace(JsonEscapeRegExp, esc => escapeColor + esc + stringColor) + ColorReset;
                            if (nul) return nullColor + all + ColorReset;
                            return numberColor + all + ColorReset;
                        });
                    }
                    item.line = line + paddingChar.repeat(cellMaxlen - item.length);
                    item.length = cellMaxlen;
                }
            } else if (typeof cell === 'string') {
                if (!raw) {
                    if (color) {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, (_, esc, contr) => escapeColor + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + ColorReset);
                        }
                    } else {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, (_, esc, contr) => esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0'));
                        }
                    }
                }
            } else if (typeof cell === 'symbol') {
                if (!raw) {
                    if (color) {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, (_, esc, contr) => escapeColor + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + symbolColor);
                        }
                    } else {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, (_, esc, contr) => esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0'));
                        }
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

    const processedHeader = header ? processRow(header, headerAlignment ?? alignment ?? '') : null;

    for (const row of body) {
        processed.push(processRow(row, alignment ?? ''));
    }

    const colsep = columnBorders ? columnBorder : columnNoBorder;

    function alignRow(row: ProcessedCell[], defaultAlignment: string): string[] {
        const grid: string[][] = [];

        let maxLines = 0;
        for (const cell of row) {
            const lineCount = cell.lines.length;
            if (lineCount > maxLines) {
                maxLines = lineCount;
            }
        }

        for (let lineIndex = 0; lineIndex < maxLines; ++ lineIndex) {
            grid.push([]);
        }

        for (let cellIndex = 0; cellIndex < row.length; ++ cellIndex) {
            const maxlen = maxlens[cellIndex];
            const cell = row[cellIndex];
            const { lines, color } = cell;
            const lineslen = lines.length;
            const align = cell.align || defaultAlignment;

            let lineIndex = 0
            for (; lineIndex < lineslen; ++ lineIndex) {
                const item = lines[lineIndex];
                let { line } = item;

                if (color) {
                    line = color + line + ColorReset;
                }

                if (align === '-') {
                    const space = maxlen - item.length;
                    const before = (space / 2)|0;
                    const after = space - before;
                    line = paddingChar.repeat(before) + line + paddingChar.repeat(after);
                } else {
                    const padding = paddingChar.repeat(maxlen - item.length);
                    // TODO: '.' alignment
                    line = align === '>' ?
                        line + padding :
                        padding + line;
                }

                grid[lineIndex][cellIndex] = line;
            }

            if (lineIndex < maxLines) {
                const padding = paddingChar.repeat(maxlen);
                for (; lineIndex < maxLines; ++ lineIndex) {
                    grid[lineIndex][cellIndex] = padding;
                }
            }
        }

        return grid.map(line => {
            while (line.length < maxlens.length) {
                line.push(paddingChar.repeat(maxlens[line.length]));
            }
            const mid = line.join(colsep);
            return outline ? leftOutline + mid + rightOutline : mid;
        });
    }

    const lines: string[] = [];

    const hdrColSep = columnBorders ? topOutlineColumnBorder    : outlineNoBorderCrossing;
    const midColSep = columnBorders ? borderCrossing            : noBorderCrossing;
    const ftrColSep = columnBorders ? bottomOutlineColumnBorder : outlineNoBorderCrossing;

    if (outline) {
        lines.push(topLeftOutline + maxlens.map(len => horizontalOutline.repeat(len)).join(hdrColSep) + topRightOutline);
    }

    const sepMid = maxlens.map(len => rowBorder.repeat(len)).join(midColSep);
    const seperator = outline ? leftOutlineRowBorder + sepMid + rightOutlineRowBorder : sepMid;

    if (processedHeader) {
        if (color) {
            for (const cell of processedHeader) {
                cell.color += WeightBold;
            }
        }

        for (const line of alignRow(processedHeader, '-')) {
            lines.push(line);
        }

        if (processed.length > 0) {
            if (rowBorders) {
                const hdrCrossSep = columnBorders ? headerBorderCrossing : headerNoBorderCrossing;
                const mid = maxlens.map(len => headerBorder.repeat(len)).join(hdrCrossSep);
                if (outline) {
                    lines.push(leftHeaderRowBorder + mid + rightHeaderRowBorder);
                } else {
                    lines.push(mid);
                }
            } else {
                lines.push(seperator);
            }
        }
    }

    let first = true;
    for (const row of processed) {
        if (first) {
            first = false;
        } else if (rowBorders) {
            lines.push(seperator);
        }
        for (const line of alignRow(row, '>')) {
            lines.push(line);
        }
    }

    if (outline) {
        lines.push(bottomLeftOutline + maxlens.map(len => horizontalOutline.repeat(len)).join(ftrColSep) + bottomRightOutline);
    }

    return lines;
}

export function printTable(body: Table, options: FormatTableOptions=DefaultOptions): void {
    console.log(formatTable(body, options).join('\n'));
}
