import { BlackOrWhitePipe } from '../pipes/black-or-white.pipe';

enum Tag {
    Bold = 'BOLD',
    Italics = 'ITALICS',
    BoldItalics = 'BOLDITALICS',
    Strike = 'STRIKE',
    Action = 'ACTION',
}

interface Token {
    tag: Tag;
    match: string;
}

const renderTag = new Map<Tag, { open: (color: string) => string, close: string }>([
    [Tag.Action, {
        open: (color) => {
            const contrast = (new BlackOrWhitePipe).transform(color);
            return `<span class="rpn-message-star-tag" style="background-color:${color}; color:${contrast};">*`;
        },
        close: '*</span>'
    }],
    [Tag.Bold, { open: () => '<b>', close: '</b>' }],
    [Tag.Italics, { open: () => '<i>', close: '</i>' }],
    [Tag.BoldItalics, { open: () => '<b><i>', close: '</i></b>' }],
    [Tag.Strike, { open: () => '<del>', close: '</del>' }],
]);

function escape(str: string): string {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

const tagLexers = [
    { r: /^https?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]/i, replace: link => `<a href="${link}">${link}</a>` },
    { r: /^____/ }, // if there's a lot of _, don't treat it as anything
    { r: /^___/, tag: Tag.BoldItalics },
    { r: /^__/, tag: Tag.Bold },
    { r: /^_/, tag: Tag.Italics },
    { r: /^\//, tag: Tag.Italics },
    { r: /^~~/, tag: Tag.Strike },
    { r: /^\*/, tag: Tag.Action },
    { r: /^(?:\r\n|\n\r|\r|\n)/, replaceWith: '<br>' },
    { r: /^--/, replaceWith: '&mdash;' },
    { r: /^\s/ },
    { r: /^\S/, replace: escape },
];

export function transformRpMessage(str: string, color: string|null): string {
    // processed tokens
    const tokens: (Token|string)[] = [];
    // currently open tags on a stack
    let tagTokenStack: Token[] = [];

    // iterate through the string...
    while (str.length > 0) {
        let match: string;
        let tag: Tag;
        let replace: ((str: string) => string);
        let replaceWith: string;

        // see if the front of the string matches any token types
        for (const tagLexer of tagLexers) {
            const result = tagLexer.r.exec(str);
            if (result) {
                match = result[0];
                ({replace, replaceWith, tag} = tagLexer);
                break;
            }
        }

        // determine what to do with what we got from the front of the string
        if (tag) {
            // if it's an open/close tag, do some stack logic with it
            const opener = tagTokenStack.find(t => t.match === match);
            const openerStackIdx = tagTokenStack.indexOf(opener);
            if (openerStackIdx >= 0) {
                // closing tag found!
                // discard all tags atop this one
                tagTokenStack.slice(openerStackIdx + 1).forEach(t => {
                    const idx = tokens.indexOf(t);
                    tokens[idx] = t.match;
                });
                // apply both tags
                tokens[tokens.indexOf(opener)] = renderTag.get(tag).open(color);
                tokens.push(renderTag.get(tag).close);
                // pop stack
                tagTokenStack = tagTokenStack.slice(0, openerStackIdx);
            } else if (tagTokenStack.find(t => t.tag === tag)) {
                // same tag, but different syntax? = ignore it
                // example: "this should /not_ be italics"
                tokens.push(match);
            } else {
                // opening tags
                const token = { tag, match };
                tokens.push(token);
                tagTokenStack.push(token);
            }
        } else if (replace) {
            // replace text using a function
            tokens.push(replace(match));
        } else if (replaceWith) {
            // replace text with a string
            tokens.push(replaceWith);
        } else if (match) {
            // just add it as is
            tokens.push(match);
        } else {
            throw new Error('Could not match ' + str[0]);
        }

        // cut off the processed part of the string
        str = str.substr(match.length);
    }

    // discard remaining open tags
    tagTokenStack.forEach(t => {
        const idx = tokens.indexOf(t);
        tokens[idx] = t.match;
    });

    return tokens.join('');
}
