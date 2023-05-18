type ProcessedLine = { prefix: number, suffix: number, line: string };
type ProcessedCell = { align: string, lines: ProcessedLine[], color: string };

export type FormatTableOptions = {
    /**
     * Array of titles printed in an extra header row.
     */
    readonly header?: ReadonlyArray<unknown>,

    /**
     * Alignment of columns.
     * 
     * Alignments:
     * 
     * * `>` ... left aligned (default unless specified otherwise)
     * * `<` ... right aligned (default for `boolean`)
     * * `-` ... centered (default for headers unless specified otherwise)
     * * `.` ... right aligned on the `.` (default for `number`, `bigint`, and `Date`)
     * * ` ` ... use default (useful if you want to override the default of a later column, but not of an earlier one)
     */
    readonly alignment?: string,

    /**
     * Alignment of header columns. If not specified defaults to same as `alignment`.
     */
    readonly headerAlignment?: string,

    /**
     * Print with ANSI escape sequences for colors.
     * 
     * If not specified it tries to auto-detect via `navigator.userAgent.includes("Chrome")` or `process.stdout.isTTY`.
     */
    readonly colors?: boolean,

    /**
     * Print horizontal borders between rows. (default: `false`)
     * 
     * There is always a border between the header row and the rest.
     * If this option is used that border will be printed as a double-line or fatter, depending on the used style.
     */
    readonly rowBorders?: boolean,

    /**
     * Print vertical borders between columns. (default: `false`)
     * 
     * If false there will still be a double space between columns, just not the visible border.
     */
    readonly columnBorders?: boolean,

    /**
     * Print outline around the table. (default: `true`)
     */
    readonly outline?: boolean,

    /**
     * Override style properties. (default: `DefaultTableStyle`)
     * 
     * @see @interface TableStyle
     */
    readonly style?: Partial<Readonly<TableStyle>>,

    /**
     * Print raw cell values, i.e. don't escape ANSI escape sequences in the provided string cells.
     */
    readonly raw?: boolean,

    /**
     * Width of a tab in string cells or of the indendation used with `JSON.stringify()`.
     */
    readonly tabWidth?: number,

    /**
     * Format function to be called on non-string cells.
     * 
     * Per default objects are formatted using `JSON.stringify(cell, ..., tabWidth)`,
     * functions as ``` `[Function: ${name}]` ```, dates via `cell.toISOString()`,
     * and everything else just as `String(cell)`.
     * 
     * @param cell 
     * @returns formatted cell
     */
    readonly formatCell?: (cell: unknown) => string,
};

const AlignRegExp = /^[- .<>]*$/;
const JsonLexRegExp = /("(?:\\["\\]|[^"])*"|'(?:\\['\\]|[^'])*')|(\btrue\b|\bfalse\b)|(\bnull\b|\bundefined\b)|(\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[-+]?\d{2}:?\d{2})?\b|\b-?[0-9]+(?:n\b|(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?)|-?\bInfinity\b|\bNaN\b)|(<ref[^>]*>|\[(?:Function|Circular|Array|Object)[^\]]*\])|(Symbol\([^)]*\))/g;
const JSEscapeRegExp = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/g;

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

const DefaultOptions: Readonly<FormatTableOptions> = {
    outline: true,
    columnBorders: false,
    rowBorders: false,
    style: DefaultTableStyle,
};

export type Table = ReadonlyArray<ReadonlyArray<unknown>>;

function stringControlReplacer(_: string, esc: string, contr: string): string {
    return esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0');
}

function stringControlReplacerWithColor(_: string, esc: string, contr: string): string {
    return ColorYellow + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + ColorReset;
}

function symbolControlReplacerWithColor(_: string, esc: string, contr: string): string {
    return ColorYellow + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + ColorRed;
}

function jsonReplacer(_key: string, value: unknown): unknown {
    return typeof value === 'bigint' || typeof value === 'symbol' ? String(value) : value;
}

const NumberColor   = ColorGreen;
const NullColor     = ColorBlue;
const SymbolColor   = ColorRed;
const StringColor   = ColorMagenta;
const FunctionColor = ColorCyan;
const EscapeColor   = ColorYellow;

function jsonColorReplacer(all: string, str: string|undefined, bool: string|undefined, nul: string|undefined, num: string|undefined, other: string|undefined, symbol: string|undefined): string {
    if (str) return StringColor + all.replace(JSEscapeRegExp, esc => EscapeColor + esc + StringColor) + ColorReset;
    if (nul) return NullColor + all + ColorReset;
    if (other) return FunctionColor + all + ColorReset;
    if (symbol) return SymbolColor + all + ColorReset;
    return NumberColor + all + ColorReset;
}

interface LengthInfo {
    prefix: number;
    suffix: number;
}

/**
 * Format a table into an array of lines.
 * 
 * @param body 
 * @param options 
 * @returns array of lines
 */
export function formatTable(body: Table, options: Readonly<FormatTableOptions> = DefaultOptions): string[] {
    const { header, tabWidth, alignment, headerAlignment, formatCell, rowBorders, columnBorders, style, raw } = options;
    let { outline, colors } = options;
    const maxlens: LengthInfo[] = [];
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

    if (colors === undefined) {
        colors = (
            typeof navigator !== "undefined" ? navigator.userAgent.includes("Chrome") :
            typeof process   !== "undefined" ? !!process.stdout?.isTTY :
            false
        );
    }

    const tabW = tabWidth ?? 4;
    if (tabW < 1 || (tabW|0) !== tabW) {
        throw new TypeError(`illegal tabWidth: ${tabWidth}`);
    }

    const numberColor  = colors ? NumberColor   : '';
    const nullColor    = colors ? NullColor     : '';
    const symbolColor  = colors ? SymbolColor   : '';
    const funcColor    = colors ? FunctionColor : '';

    const formatSimple = formatCell ?? String;

    function processRow(row: ReadonlyArray<unknown>, alignment: string): ProcessedCell[] {
        const processedRow: ProcessedCell[] = [];
        for (let cellIndex = 0; cellIndex < row.length; ++ cellIndex) {
            const maxlen = maxlens[cellIndex] ??= { prefix: 0, suffix: 0 };
            const cell = row[cellIndex];
            let align = alignment.charAt(cellIndex);
            if (align === ' ') {
                align = '';
            }
            let cellColor: string = '';
            let strCell: string;
            let isJson = false;
            switch (typeof cell) {
                case 'number':
                case 'bigint':
                    align ||= '.';
                    cellColor = numberColor;
                    strCell = formatSimple(cell);
                    break;

                case 'boolean':
                    align ||= '<';
                    cellColor = numberColor;
                    strCell = formatSimple(cell);
                    break;

                case 'symbol':
                    align ||= '>';
                    cellColor = symbolColor;
                    strCell = formatSimple(cell);
                    break;

                case 'object':
                    if (cell instanceof Date) {
                        align ||= '.';
                        cellColor = numberColor;
                        strCell = formatCell ? formatCell(cell) : cell.toISOString();
                    } else {
                        align ||= '>';
                        isJson = true;
                        strCell = formatCell ? formatCell(cell) :
                            JSON.stringify(cell, jsonReplacer, tabW).
                            replace(SpecialCharRegExp, stringControlReplacer);
                    }
                    break;

                case 'undefined':
                    align ||= '>';
                    cellColor = nullColor;
                    strCell = 'undefined';
                    break;

                case 'string':
                    align ||= '>';
                    strCell = cell;
                    break;

                case 'function':
                    align ||= '>';
                    cellColor = funcColor;
                    strCell = formatCell ? formatCell(cell) :
                              cell.name ? `[Function: ${cell.name}]` : '[Function (anonymous)]';
                    break;

                default:
                    align ||= '>';
                    strCell = formatSimple(cell);
                    break;
            }

            const rawLines = strCell.split('\n');

            for (let lineIndex = 0; lineIndex < rawLines.length; ++ lineIndex) {
                const line = rawLines[lineIndex];
                let index = line.indexOf('\t');
                if (index >= 0) {
                    let prev = 0;
                    // expecting the JIT to optimize += better than array buffering
                    let newLine = '';
                    for (;;) {
                        newLine += line.slice(prev, index);
                        const padding = tabW - (newLine.length % tabW);
                        newLine += paddingChar.repeat(padding);

                        ++ index;

                        if (index > line.length) {
                            break;
                        }

                        prev = index;
                        index = line.indexOf('\t', prev);
                        if (index < 0) {
                            newLine += line.slice(prev);
                            break;
                        }
                    }
                    rawLines[lineIndex] = newLine;
                }
            }

            let maxPrefix = 0;
            let maxSuffix = 0;
            const lines: ProcessedLine[] = [];
            for (const line of rawLines) {
                let cleanLine = line.replace(DoubleWidthRegExp, 'XX').replace(IgnoreRegExp, '');
                if (raw) {
                    cleanLine = cleanLine.replace(AnsiEscapeRegExp, '');
                } else {
                    cleanLine = cleanLine.replace(ControlRegExp, '\\u####');
                }
                cleanLine = cleanLine.replace(SurrogatePairRegExp, 'x');
                let prefix = cleanLine.length;
                let suffix: number;
                if (align === '.') {
                    const dotIndex = cleanLine.indexOf('.');
                    if (dotIndex < 0) {
                        suffix = 0;
                    } else {
                        suffix = prefix - dotIndex;
                        prefix = dotIndex;
                        if (suffix > maxSuffix) {
                            maxSuffix = suffix;
                        }
                    }
                } else {
                    suffix = 0;
                }
                if (prefix > maxPrefix) {
                    maxPrefix = prefix;
                }
                lines.push({ line, prefix, suffix });
            }

            if (maxPrefix > maxlen.prefix) {
                maxlen.prefix = maxPrefix;
            }

            if (maxSuffix > maxlen.suffix) {
                maxlen.suffix = maxSuffix;
            }

            if (isJson) {
                for (const item of lines) {
                    let { line } = item;
                    if (colors) {
                        line = line.replace(JsonLexRegExp, jsonColorReplacer);
                    }
                    item.line = line + paddingChar.repeat(maxPrefix - item.prefix);
                    item.prefix = maxPrefix;
                }
            } else if (typeof cell === 'string') {
                if (!raw) {
                    if (colors) {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, stringControlReplacerWithColor);
                        }
                    } else {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, stringControlReplacer);
                        }
                    }
                }
            } else if (typeof cell === 'symbol') {
                if (!raw) {
                    if (colors) {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, symbolControlReplacerWithColor);
                        }
                    } else {
                        for (const item of lines) {
                            item.line = item.line.
                                replace(SpecialCharRegExp, stringControlReplacer);
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

        if (maxLines === 0) {
            maxLines = 1;
        }

        for (let lineIndex = 0; lineIndex < maxLines; ++ lineIndex) {
            grid.push([]);
        }

        for (let cellIndex = 0; cellIndex < row.length; ++ cellIndex) {
            const { prefix: maxPrefix, suffix: maxSuffix } = maxlens[cellIndex];
            const maxLength = maxPrefix + maxSuffix;
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
                    const itemLength = item.prefix + item.suffix;
                    const space = maxLength - itemLength;
                    const before = (space / 2)|0;
                    const after = space - before;
                    line = paddingChar.repeat(before) + line + paddingChar.repeat(after);
                } else if (align === '>') {
                    const itemLength = item.prefix + item.suffix;
                    const padding = paddingChar.repeat(maxLength - itemLength);
                    line += padding;
                } else {
                    line = paddingChar.repeat(maxPrefix - item.prefix) + line + paddingChar.repeat(maxSuffix - item.suffix);
                }

                grid[lineIndex][cellIndex] = line;
            }

            if (lineIndex < maxLines) {
                const padding = paddingChar.repeat(maxLength);
                for (; lineIndex < maxLines; ++ lineIndex) {
                    grid[lineIndex][cellIndex] = padding;
                }
            }
        }

        const lines: string[] = [];
        for (const line of grid) {
            while (line.length < maxlens.length) {
                const { prefix, suffix } = maxlens[line.length];
                line.push(paddingChar.repeat(prefix + suffix));
            }
            const mid = line.join(colsep);
            lines.push(outline ? leftOutline + mid + rightOutline : mid);
        }

        return lines;
    }

    const lines: string[] = [];

    const hdrColSep = columnBorders ? topOutlineColumnBorder    : outlineNoBorderCrossing;
    const midColSep = columnBorders ? borderCrossing            : noBorderCrossing;
    const ftrColSep = columnBorders ? bottomOutlineColumnBorder : outlineNoBorderCrossing;

    if (outline) {
        lines.push(topLeftOutline + maxlens.map(({ prefix, suffix }) => horizontalOutline.repeat(prefix + suffix)).join(hdrColSep) + topRightOutline);
    }

    const sepMid = maxlens.map(({ prefix, suffix }) => rowBorder.repeat(prefix + suffix)).join(midColSep);
    const seperator = outline ? leftOutlineRowBorder + sepMid + rightOutlineRowBorder : sepMid;

    if (processedHeader) {
        if (colors) {
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
                const mid = maxlens.map(({ prefix, suffix }) => headerBorder.repeat(prefix + suffix)).join(hdrCrossSep);
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
        lines.push(bottomLeftOutline + maxlens.map(({ prefix, suffix }) => horizontalOutline.repeat(prefix + suffix)).join(ftrColSep) + bottomRightOutline);
    }

    return lines;
}

/**
 * Format and print a table using `console.log()`.
 * 
 * @param body 
 * @param options 
 */
export function printTable(body: Table, options: Readonly<FormatTableOptions> = DefaultOptions): void {
    console.log(formatTable(body, options).join('\n'));
}

export type FormatTableOptionsFromObject = Omit<FormatTableOptions, 'headers'> & {
    /**
     * The columns to print. Per default all own properties are printed.
     * 
     * If a column is specified as a `string` the value is both the key to
     * read from the object representing the row and the label in the header
     * row.
     * 
     * If a column is `[string, string]` then the first value is the key
     * and the second is the label.
     */
    header?: ReadonlyArray<string | [key: string, label: string]>;

    /**
     * Add an index column.
     */
    indexColumn?: boolean;
    
    /**
     * The header label of the index column. (default: `"Index"`)
     * 
     * (Only has an effect if `indexColumn` is `true`.)
     */
    indexColumnLabel?: string;
};

const DefaultOptionsFromObject: Readonly<FormatTableOptionsFromObject> = {
    outline: true,
    columnBorders: false,
    rowBorders: false,
    style: DefaultTableStyle,
};

export function formatTableFromObjects(body: ReadonlyArray<{ readonly [key: string]: unknown }>, options: Readonly<FormatTableOptionsFromObject> = DefaultOptionsFromObject): string[] {
    const { header, indexColumn, indexColumnLabel } = options;
    const converted: unknown[][] = [];
    let convertedHeader: string[];
    let keys: string[];

    if (header) {
        convertedHeader = [];
        keys = [];
        for (const hdr of header) {
            if (typeof hdr === 'string') {
                convertedHeader.push(hdr);
                keys.push(hdr);
            } else {
                const [key, label] = hdr;
                convertedHeader.push(label);
                keys.push(key);
            }
        }
    } else {
        const keySet = new Set<string>();
        for (const row of body) {
            for (const key in row) {
                if (Object.hasOwn(row, key)) {
                    keySet.add(key);
                }
            }
        }
        keys = convertedHeader = Array.from(keySet);
    }

    if (indexColumn) {
        convertedHeader.unshift(indexColumnLabel ?? 'Index');
        for (let index = 0; index < body.length; ++ index) {
            const obj = body[index];
            const row: unknown[] = [index];
            for (const key of keys) {
                row.push(key in obj ? obj[key] : '');
            }
            converted.push(row);
        }
    } else {
        for (const obj of body) {
            const row: unknown[] = [];
            for (const key of keys) {
                row.push(key in obj ? obj[key] : '');
            }
            converted.push(row);
        }
    }

    return formatTable(converted, { ...options, header: convertedHeader });
}

export function printTableFromObjects(body: ReadonlyArray<{ readonly [key: string]: unknown }>, options: Readonly<FormatTableOptionsFromObject> = DefaultOptionsFromObject): void {
    console.log(formatTableFromObjects(body, options).join('\n'));
}
