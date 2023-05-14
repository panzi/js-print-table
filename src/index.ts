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
// const ColorYellow  = '\u001b[33m';
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
            ).replaceAll('\t', '    ').replaceAll('\r', '\\r').split('\n');

            let cellMaxlen = 0;
            const lines: ProcessedLine[] = [];
            for (const line of rawLines) {
                let len = 0;
                for (let charIndex = 0; charIndex < line.length; ++ charIndex) {
                    let codepoint = line.charCodeAt(charIndex);
                    if (codepoint >= 0xD800 && codepoint <= 0xDBFF) {
                        const low = line.charCodeAt(charIndex + 1);
                        if (low >= 0xDC00 && low <= 0xDFFF) {
                            codepoint = (codepoint - 0xD800) * 0x400 + (low - 0xDC00) + 0x10_000;
                            ++ charIndex;
                        }
                    }
                    // There is *much* more than these things, it is all hacky,
                    // and depends very much on however your terminal/edotir renders things.
                    if (codepoint <= 0xFF) {
                        // ASCII + latin 1
                        ++ len;
                    } else if (
                        // emojis (very much not exact)
                        ((codepoint >= 0x0231A && codepoint <= 0x01F9FF) && (
                            (                        codepoint <= 0x0231B) ||
                            (codepoint >= 0x023E9 && codepoint <= 0x023FA) ||
                            (codepoint >= 0x02614 && codepoint <= 0x02615) ||
                            codepoint === 0x0267F ||
                            (codepoint >= 0x02648 && codepoint <= 0x02653) ||
                            codepoint === 0x02657 ||
                            codepoint === 0x026A1 ||
                            (codepoint >= 0x026BD && codepoint <= 0x026BE) ||
                            (codepoint >= 0x026C4 && codepoint <= 0x026C5) ||
                            codepoint === 0x026CE ||
                            codepoint === 0x026D4 ||
                            codepoint === 0x026EA ||
                            (codepoint >= 0x026EC && codepoint <= 0x026EB) ||
                            codepoint === 0x026F2 ||
                            codepoint === 0x026F3 ||
                            codepoint === 0x026F5 ||
                            codepoint === 0x026FA ||
                            codepoint === 0x026FD ||
                            codepoint === 0x02705 ||
                            codepoint === 0x0270A ||
                            codepoint === 0x0270B ||
                            (codepoint >= 0x02934 && codepoint <= 0x02935) ||
                            (codepoint >= 0x02B1B && codepoint <= 0x02B1C) ||
                            (codepoint >= 0x1F170 && codepoint <= 0x1F6F9 && codepoint !== 0x1F3F3) ||
                            (codepoint >= 0x1F910) )) ||

                        // asian scripts
                        (
                            // XXX: I don't really know. guessed stuff
                            (codepoint >= 0x3040 && codepoint <= 0xA4CF) ||

                            // Korean Hangul
                            (codepoint >= 0xAC00 && codepoint <= 0xD7FF) ||

                            // CJK Unified Ideographs Extensions
                            (codepoint >= 0x20000 && codepoint <= 0x323AF)
                        ) ||

                        // asian full-width characters
                        (
                            (codepoint >= 0xFF01 && codepoint <= 0xFF60) ||
                            (codepoint >= 0xFFE0 && codepoint <= 0xFFE6)
                        ) ||

                        // Devanagari letter (Hindi) TODO: still not correct
                        (codepoint >= 0x0934 && codepoint <= 0x0939)
                    ) {
                        len += 2;
                    } else if (
                        // TODO: would need all Mn codepoints, but there are so many!

                        // diacritics
                        codepoint !== 0x032A &&
                        !(codepoint >= 0x0346 && codepoint <= 0x034E) &&
                        !(codepoint >= 0x035C && codepoint <= 0x036F) &&
                        !(codepoint >= 0x1AB0 && codepoint <= 0x1AFF) &&
                        !(codepoint >= 0x1DC0 && codepoint <= 0x1DFF) &&
                        !(codepoint >= 0x20D0 && codepoint <= 0x20FF) &&

                        // Arabic (most likely incomplete)
                        !(codepoint >= 0x064B && codepoint <= 0x0657) &&
                        !(codepoint >= 0x0659 && codepoint <= 0x065F) &&

                        // Devanagari vowel signs (Hindi) TODO: still not correct
                        !(codepoint >= 0x08E3 && codepoint <= 0x0902) &&
                        !(codepoint >= 0x093A && codepoint <= 0x093B) &&
                        !(codepoint >= 0x093E && codepoint <= 0x094F) &&
                        !(codepoint == 0xA8E0 || codepoint == 0xA8F1) &&

                        // variant selectors
                        !(codepoint >= 0xFE00 && codepoint <= 0xFE0F) &&

                        // more diacritics
                        !(codepoint >= 0xFE20 && codepoint <= 0xFE2F) &&

                        // zero width space, zero-width non-joiner, zero-width joiner
                        !(codepoint >= 0x200B && codepoint <= 0x200D) &&

                        // word joiner
                        codepoint !== 0x2060 &&

                        // zero-width no-break space
                        codepoint !== 0xFEFF
                    ) {
                        ++ len;
                    }
                }
                // const len = line.length;
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
