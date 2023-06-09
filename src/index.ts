type ProcessedLine = { prefix: number, suffix: number, line: string };
type ProcessedCell = { align: string, lines: ProcessedLine[], color: string };

export interface Colors {
    /**
     * Color code for values of type `number` and `bigint`.
     */
    number: string;

    /**
     * Color for `null` and `undefined` values.
     */
    null: string;

    /**
     * Color for strings inside of JSON. Plain string cells have no color.
     */
    string: string;

    /**
     * Color for values of type `string`.
     */
    symbol: string;

    /**
     * Color for values of type `function`.
     */
    function: string;

    /**
     * Color for circular references, abbreviated arrays and the tag for objects with null prototypes.
     * This is only effective for when NodeJS' `inspect` function is passed as `formatCell`.
     */
    other: string;

    /**
     * Color for escape sequences in strings (string cells and stirngs inside of JSON) and symbols.
     */
    escape: string;

    /**
     * Color for values of type `boolean`.
     */
    boolean: string;

    /**
     * Additional color code for headers. By default this is used to make headers bold.
     */
    header: string;

    /**
     * Reset any color codes or other formatting.
     */
    reset: string;
}

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
    readonly colors?: boolean|Partial<Readonly<Colors>>,

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
const JsonLexRegExp = /("(?:\\["\\]|[^"])*"|'(?:\\['\\]|[^'])*')|(\btrue\b|\bfalse\b)|(\bnull\b|\bundefined\b)|(\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[-+]?\d{2}:?\d{2})?\b|\b-?[0-9]+(?:n\b|(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?)|-?\bInfinity\b|\bNaN\b)|(\[Function[^\]]*\])|(<ref[^>]*>|\[(?:Function|Circular|Array|Object)[^\]]*\])|(Symbol\([^)]*\))/g;
const JSEscapeRegExp = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/g;

const WeightBold   = '\u001b[1m';
const ResetFormat  = '\u001b[0m';
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

/**
 * ANSI escape sequences for colors.
 */
export const AnsiColors: Readonly<Colors> = {
    number:    ColorGreen,
    null:      ColorBlue,
    string:    ColorMagenta,
    symbol:    ColorRed,
    function:  ColorCyan,
    other:     ColorCyan,
    escape:    ColorYellow,
    boolean:   ColorGreen,
    header:    WeightBold,
    reset:     ResetFormat,
};

/**
 * No color codes at all, just empty strings.
 */
export const NoColors: Readonly<Colors> = {
    number:    '',
    null:      '',
    string:    '',
    symbol:    '',
    function:  '',
    other:     '',
    escape:    '',
    boolean:   '',
    header:    '',
    reset:     '',
};

declare global {
    var navigator: { userAgent: string }|undefined;
}

// \u{FE00}-\u{FE0F} variant selectors
// \u{200B}-\u{200D} zero width space, zero-width non-joiner, zero-width joiner
// \u{2060} word joiner
// \u{FEFF} zero-width no-break space
const IgnoreRegExp = /\p{Nonspacing_Mark}|\p{Default_Ignorable_Code_Point}|[\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{2060}\u{FEFF}]/gu;

// \u{3040}-\u{A4CF} I don't really know. Guessed Asian scripts
// \u{AC00}-\u{D7FF} Korean Hangul
// \u{20000}-\u{323AF} CJK Unified Ideographs Extensions
// \u{FF01}-\u{FF60} Asian full-width characters
// \u{FFE0}-\u{FFE6} Asian full-width characters
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

/**
 * A set of strings to use for printing table borders.
 */
export interface TableStyle {
    /**
     * Vertical border between columns, e.g. `' │ '`.
     */
    columnBorder: string;

    /**
     * Gap between columns if no border shall be printed, e.g. `'  '`.
     */
    columnNoBorder: string;

    /**
     * Padding used to in alignment and indentation, e.g. `' '`.
     * 
     * This is meant to be once character wide.
     */
    paddingChar: string;

    /**
     * Left outline of the table, e.g. `'│ '`.
     */
    leftOutline: string;

    /**
     * Right outline of the table, e.g. `' │'`.
     */
    rightOutline: string;

    /**
     * Top outline of table between cells with border between columns, e.g. `'─┬─'`.
     */
    topOutlineColumnBorder: string;

    /**
     * Crossing of row and column borders between cells, e.g. `'─┼─'`.
     */
    borderCrossing: string;

    /**
     * Row border between cells without a border between columns, e.g. `'──'`.
     */
    noBorderCrossing: string;

    /**
     * Bottom outline of table between cells with border between columns, e.g. `'─┴─'`.
     */
    bottomOutlineColumnBorder: string;

    /**
     * Outline of the top left corner of the table, e.g. `'┌─'`.
     */
    topLeftOutline: string;

    /**
     * Outline of the bottom left corner of the table, e.g. `'└─'`.
     */
    bottomLeftOutline: string;

    /**
     * Outline of the top right corner of the table, e.g. `'─┐'`.
     */
    topRightOutline: string;

    /**
     * Outline of the bottom right corner of the table, e.g. `'─┘'`.
     */
    bottomRightOutline: string;

    /**
     * Horizontal border between rows, one character wide, e.g. `'─'`.
     */
    rowBorder: string;

    /**
     * Horizontal outline of the table, one character wide, e.g. `'─'`.
     */
    horizontalOutline: string;

    /**
     * Crossing of left table outline and horizontal row border, e.g. `'├─'`.
     */
    leftOutlineRowBorder: string;

    /**
     * Crossing of right table outline and horizontal row border, e.g. `'─┤'`.
     */
    rightOutlineRowBorder: string;

    /**
     * Crossing of left table outline and horizontal border between header and table body, e.g. `'╞═'`.
     */
    leftHeaderRowBorder: string;

    /**
     * Crossing of left table outline and horizontal border between header and table body, e.g. `'═╡'`.
     */
    rightHeaderRowBorder: string;

    /**
     * Horizontal border between header and table body, one character wide, e.g. `'═'`.
     */
    headerBorder: string;

    /**
     * Crossing of header and column border between cells, e.g. `'═╪═'`.
     */
    headerBorderCrossing: string;

    /**
     * Header row border between cells without a border between columns, e.g. `'══'`.
     */
    headerNoBorderCrossing: string;

    /**
     * Table outline border between cells without a border between columns, e.g. `'──'`.
     */
    outlineNoBorderCrossing: string;
}

/**
 * TableStyle that is used per default. Any supplied table style can be partial
 * and overrides the properties of this style.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * ┌──────────────┐
 * │ Hdr 1  Hdr 2 │
 * ├──────────────┤
 * │ foo        0 │
 * │ bar       12 │
 * │ baz      345 │
 * └──────────────┘
 * 
 * rowBorder: true
 * columnBorder: false
 * ┌──────────────┐
 * │ Hdr 1  Hdr 2 │
 * ╞══════════════╡
 * │ foo        0 │
 * ├──────────────┤
 * │ bar       12 │
 * ├──────────────┤
 * │ baz      345 │
 * └──────────────┘
 * 
 * rowBorder: false
 * columnBorder: true
 * ┌───────┬───────┐
 * │ Hdr 1 │ Hdr 2 │
 * ├───────┼───────┤
 * │ foo   │     0 │
 * │ bar   │    12 │
 * │ baz   │   345 │
 * └───────┴───────┘
 * 
 * rowBorder: true
 * columnBorder: true
 * ┌───────┬───────┐
 * │ Hdr 1 │ Hdr 2 │
 * ╞═══════╪═══════╡
 * │ foo   │     0 │
 * ├───────┼───────┤
 * │ bar   │    12 │
 * ├───────┼───────┤
 * │ baz   │   345 │
 * └───────┴───────┘
 * ```
 */
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

/**
 * All borders and outlines are just whitespace.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 *                 
 *   Hdr 1  Hdr 2  
 *                 
 *   foo        0  
 *   bar       12  
 *   baz      345  
 *                 
 * 
 * rowBorder: true
 * columnBorder: false
 *                 
 *   Hdr 1  Hdr 2  
 *                 
 *   foo        0  
 *                 
 *   bar       12  
 *                 
 *   baz      345  
 *                 
 * 
 * rowBorder: false
 * columnBorder: true
 *                 
 *   Hdr 1  Hdr 2  
 *                 
 *   foo        0  
 *   bar       12  
 *   baz      345  
 *                 
 * 
 * rowBorder: true
 * columnBorder: true
 *                 
 *   Hdr 1  Hdr 2  
 *                 
 *   foo        0  
 *                 
 *   bar       12  
 *                 
 *   baz      345  
 *                 
 * ```
 */
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

/**
 * Only use ASCII characters for the table outline and borders.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * +--------------+
 * | Hdr 1  Hdr 2 |
 * +--------------+
 * | foo        0 |
 * | bar       12 |
 * | baz      345 |
 * +--------------+
 * 
 * rowBorder: true
 * columnBorder: false
 * +--------------+
 * | Hdr 1  Hdr 2 |
 * |==============|
 * | foo        0 |
 * +--------------+
 * | bar       12 |
 * +--------------+
 * | baz      345 |
 * +--------------+
 * 
 * rowBorder: false
 * columnBorder: true
 * +---------------+
 * | Hdr 1 | Hdr 2 |
 * +-------+-------+
 * | foo   |     0 |
 * | bar   |    12 |
 * | baz   |   345 |
 * +---------------+
 * 
 * rowBorder: true
 * columnBorder: true
 * +---------------+
 * | Hdr 1 | Hdr 2 |
 * |===============|
 * | foo   |     0 |
 * +-------+-------+
 * | bar   |    12 |
 * +-------+-------+
 * | baz   |   345 |
 * +---------------+
 * ```
 */
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

/**
 * Use rounded corners.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * ╭──────────────╮
 * │ Hdr 1  Hdr 2 │
 * ├──────────────┤
 * │ foo        0 │
 * │ bar       12 │
 * │ baz      345 │
 * ╰──────────────╯
 * 
 * rowBorder: true
 * columnBorder: false
 * ╭──────────────╮
 * │ Hdr 1  Hdr 2 │
 * ╞══════════════╡
 * │ foo        0 │
 * ├──────────────┤
 * │ bar       12 │
 * ├──────────────┤
 * │ baz      345 │
 * ╰──────────────╯
 * 
 * rowBorder: false
 * columnBorder: true
 * ╭───────┬───────╮
 * │ Hdr 1 │ Hdr 2 │
 * ├───────┼───────┤
 * │ foo   │     0 │
 * │ bar   │    12 │
 * │ baz   │   345 │
 * ╰───────┴───────╯
 * 
 * rowBorder: true
 * columnBorder: true
 * ╭───────┬───────╮
 * │ Hdr 1 │ Hdr 2 │
 * ╞═══════╪═══════╡
 * │ foo   │     0 │
 * ├───────┼───────┤
 * │ bar   │    12 │
 * ├───────┼───────┤
 * │ baz   │   345 │
 * ╰───────┴───────╯
 * ```
 */
export const RoundedTableStyle: Partial<Readonly<TableStyle>> = {
    topLeftOutline:     '╭─',
    bottomLeftOutline:  '╰─',
    topRightOutline:    '─╮',
    bottomRightOutline: '─╯',
};

/**
 * When `rowBorders` is `true`, use a fat line between the header and the body instead of a double line.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * ┌──────────────┐
 * │ Hdr 1  Hdr 2 │
 * ├──────────────┤
 * │ foo        0 │
 * │ bar       12 │
 * │ baz      345 │
 * └──────────────┘
 * 
 * rowBorder: true
 * columnBorder: false
 * ┌──────────────┐
 * │ Hdr 1  Hdr 2 │
 * ┝━━━━━━━━━━━━━━┥
 * │ foo        0 │
 * ├──────────────┤
 * │ bar       12 │
 * ├──────────────┤
 * │ baz      345 │
 * └──────────────┘
 * 
 * rowBorder: false
 * columnBorder: true
 * ┌───────┬───────┐
 * │ Hdr 1 │ Hdr 2 │
 * ├───────┼───────┤
 * │ foo   │     0 │
 * │ bar   │    12 │
 * │ baz   │   345 │
 * └───────┴───────┘
 * 
 * rowBorder: true
 * columnBorder: true
 * ┌───────┬───────┐
 * │ Hdr 1 │ Hdr 2 │
 * ┝━━━━━━━┿━━━━━━━┥
 * │ foo   │     0 │
 * ├───────┼───────┤
 * │ bar   │    12 │
 * ├───────┼───────┤
 * │ baz   │   345 │
 * └───────┴───────┘
 * ```
 */
export const FatHeaderBorderTableStyle: Partial<Readonly<TableStyle>> = {
    leftHeaderRowBorder:   '┝━',
    rightHeaderRowBorder:  '━┥',
    headerBorder: '━',
    headerBorderCrossing: '━┿━',
    headerNoBorderCrossing: '━━',
};

/**
 * Use a double line for the outline around the table.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * ╔══════════════╗
 * ║ Hdr 1  Hdr 2 ║
 * ╟──────────────╢
 * ║ foo        0 ║
 * ║ bar       12 ║
 * ║ baz      345 ║
 * ╚══════════════╝
 * 
 * rowBorder: true
 * columnBorder: false
 * ╔══════════════╗
 * ║ Hdr 1  Hdr 2 ║
 * ╠══════════════╣
 * ║ foo        0 ║
 * ╟──────────────╢
 * ║ bar       12 ║
 * ╟──────────────╢
 * ║ baz      345 ║
 * ╚══════════════╝
 * 
 * rowBorder: false
 * columnBorder: true
 * ╔═══════╤═══════╗
 * ║ Hdr 1 │ Hdr 2 ║
 * ╟───────┼───────╢
 * ║ foo   │     0 ║
 * ║ bar   │    12 ║
 * ║ baz   │   345 ║
 * ╚═══════╧═══════╝
 * 
 * rowBorder: true
 * columnBorder: true
 * ╔═══════╤═══════╗
 * ║ Hdr 1 │ Hdr 2 ║
 * ╠═══════╪═══════╣
 * ║ foo   │     0 ║
 * ╟───────┼───────╢
 * ║ bar   │    12 ║
 * ╟───────┼───────╢
 * ║ baz   │   345 ║
 * ╚═══════╧═══════╝
 * ```
 */
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

/**
 * Use a fat line for the outline around the table and for the border between the header and body.
 * 
 * ```text
 * rowBorder: false
 * columnBorder: false
 * ┏━━━━━━━━━━━━━━┓
 * ┃ Hdr 1  Hdr 2 ┃
 * ┠──────────────┨
 * ┃ foo        0 ┃
 * ┃ bar       12 ┃
 * ┃ baz      345 ┃
 * ┗━━━━━━━━━━━━━━┛
 * 
 * rowBorder: true
 * columnBorder: false
 * ┏━━━━━━━━━━━━━━┓
 * ┃ Hdr 1  Hdr 2 ┃
 * ┣━━━━━━━━━━━━━━┫
 * ┃ foo        0 ┃
 * ┠──────────────┨
 * ┃ bar       12 ┃
 * ┠──────────────┨
 * ┃ baz      345 ┃
 * ┗━━━━━━━━━━━━━━┛
 * 
 * rowBorder: false
 * columnBorder: true
 * ┏━━━━━━━┯━━━━━━━┓
 * ┃ Hdr 1 │ Hdr 2 ┃
 * ┠───────┼───────┨
 * ┃ foo   │     0 ┃
 * ┃ bar   │    12 ┃
 * ┃ baz   │   345 ┃
 * ┗━━━━━━━┷━━━━━━━┛
 * 
 * rowBorder: true
 * columnBorder: true
 * ┏━━━━━━━┯━━━━━━━┓
 * ┃ Hdr 1 │ Hdr 2 ┃
 * ┣━━━━━━━┿━━━━━━━┫
 * ┃ foo   │     0 ┃
 * ┠───────┼───────┨
 * ┃ bar   │    12 ┃
 * ┠───────┼───────┨
 * ┃ baz   │   345 ┃
 * ┗━━━━━━━┷━━━━━━━┛
 * ```
 */
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

export const DefaultOptions: Readonly<FormatTableOptions> = {
    outline: true,
    columnBorders: false,
    rowBorders: false,
    style: DefaultTableStyle,
};

export type Table = ReadonlyArray<ReadonlyArray<unknown>>;

function stringControlReplacer(_: string, esc: string, contr: string): string {
    return esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0');
}

function jsonReplacer(_key: string, value: unknown): unknown {
    return typeof value === 'bigint' || typeof value === 'symbol' ? String(value) : value;
}

interface LengthInfo {
    prefix: number;
    suffix: number;
}

/**
 * Format a table into an array of lines.
 * 
 * @param rows 
 * @param options 
 * @returns array of lines
 */
export function formatTable(rows: Table, options: Readonly<FormatTableOptions> = DefaultOptions): string[] {
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

    const colorMap: Readonly<Colors> =
        colors === true ? AnsiColors :
        !colors ? NoColors :
        { ...AnsiColors, ...colors };

    const tabW = tabWidth ?? 4;
    if (tabW < 1 || (tabW|0) !== tabW) {
        throw new TypeError(`illegal tabWidth: ${tabWidth}`);
    }

    const {
        boolean:  boolColor,
        escape:   escColor,
        string:   strColor,
        function: funcColor,
        header:   hdrColor,
        null:     nullColor,
        number:   numColor,
        other:    otherColor,
        reset:    resetFormat,
        symbol:   symColor,
    } = colorMap;

    function jsonColorReplacer(all: string, str: string|undefined, bool: string|undefined, nul: string|undefined, num: string|undefined, func: string|undefined, other: string|undefined, symbol: string|undefined): string {
        if (str)    return strColor + all.replace(JSEscapeRegExp, esc => escColor + esc + strColor) + resetFormat;
        if (nul)    return nullColor + all + resetFormat;
        if (func)   return funcColor + all + resetFormat;
        if (other)  return otherColor + all + resetFormat;
        if (symbol) return symColor + all + resetFormat;
        if (num)    return numColor + all + resetFormat;
        return boolColor + all + resetFormat;
    }

    function stringControlReplacerWithColor(_: string, esc: string, contr: string): string {
        return escColor + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + resetFormat;
    }

    function symbolControlReplacerWithColor(_: string, esc: string, contr: string): string {
        return escColor + (esc ? CharReplacement[esc] : '\\u' + contr.charCodeAt(0).toString(16).padStart(4, '0')) + symColor;
    }

    const formatSimple = formatCell ?? String;

    function processRow(row: ReadonlyArray<unknown>, alignment: string, defaultAlignment: string): ProcessedCell[] {
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
                    cellColor = numColor;
                    strCell = formatSimple(cell);
                    break;

                case 'boolean':
                    align ||= '<';
                    cellColor = boolColor;
                    strCell = formatSimple(cell);
                    break;

                case 'symbol':
                    align ||= defaultAlignment;
                    cellColor = symColor;
                    strCell = formatSimple(cell);
                    break;

                case 'object':
                    if (cell instanceof Date) {
                        align ||= '.';
                        cellColor = numColor;
                        strCell = formatCell ? formatCell(cell) : cell.toISOString();
                    } else {
                        align ||= defaultAlignment;
                        isJson = true;
                        strCell = formatCell ? formatCell(cell) :
                            JSON.stringify(cell, jsonReplacer, paddingChar.repeat(tabW)).
                            replace(SpecialCharRegExp, stringControlReplacer);
                    }
                    break;

                case 'undefined':
                    align ||= defaultAlignment;
                    cellColor = nullColor;
                    strCell = 'undefined';
                    break;

                case 'string':
                    align ||= defaultAlignment;
                    strCell = cell;
                    break;

                case 'function':
                    align ||= defaultAlignment;
                    cellColor = funcColor;
                    strCell = formatCell ? formatCell(cell) :
                              cell.name ? `[Function: ${cell.name}]` : '[Function (anonymous)]';
                    break;

                default:
                    align ||= defaultAlignment;
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

    const processedHeader = header ? processRow(header, headerAlignment ?? alignment ?? '', '-') : null;

    for (const row of rows) {
        processed.push(processRow(row, alignment ?? '', '>'));
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
                    line = color + line + resetFormat;
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
                cell.color += hdrColor;
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
 * @param rows 
 * @param options 
 */
export function printTable(rows: Table, options: Readonly<FormatTableOptions> = DefaultOptions): void {
    console.log(formatTable(rows, options).join('\n'));
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

export const DefaultOptionsFromObject: Readonly<FormatTableOptionsFromObject> = {
    outline: true,
    columnBorders: false,
    rowBorders: false,
    style: DefaultTableStyle,
};

export type ObjectList = ReadonlyArray<{ readonly [key: string]: unknown }>;

/**
 * Format a list of objects into an array of lines representing a table.
 * 
 * @param rows 
 * @param options 
 * @returns 
 */
export function formatTableFromObjects(rows: ObjectList, options: Readonly<FormatTableOptionsFromObject> = DefaultOptionsFromObject): string[] {
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
        for (const row of rows) {
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
        for (let index = 0; index < rows.length; ++ index) {
            const obj = rows[index];
            const row: unknown[] = [index];
            for (const key of keys) {
                row.push(key in obj ? obj[key] : '');
            }
            converted.push(row);
        }
    } else {
        for (const obj of rows) {
            const row: unknown[] = [];
            for (const key of keys) {
                row.push(key in obj ? obj[key] : '');
            }
            converted.push(row);
        }
    }

    return formatTable(converted, { ...options, header: convertedHeader });
}

/**
 * Format and print list of objects as a table using `console.log()`.
 * 
 * @param rows 
 * @param options 
 */
export function printTableFromObjects(rows: ObjectList, options: Readonly<FormatTableOptionsFromObject> = DefaultOptionsFromObject): void {
    console.log(formatTableFromObjects(rows, options).join('\n'));
}
