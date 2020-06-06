// markdown.ts - limited inline markdown parser for slatejs decorations

// TODO: There is no need to allocate intermediate structures here.
// Both functions in this + decorate should be the same

type Emphases = {
  type: 'strong' | 'emph';
  flank: 'left' | 'right' | 'both';
  start: number;
  end: number;
}

type Token = Emphases | {
  type: 'text';
  text: string;
  begin: number;
  end: number;
}

const isSpace = (c: string) => c.charCodeAt(0) < 33;

/**
 * Convert markdown into a list of tokens which can
 * be parsed to build up ranges
 * @param text 
 */
export const markdownTokens = (text: string) => {
  const tokens: Token[] = [];

  let textBegin = 0;
  let i = 0;

  const pushToken = (i: number, token: Token) => {
    if (i !== textBegin) {
      const before = text.slice(textBegin, i);

      tokens.push({
        type: 'text',
        text: before,
        begin: textBegin,
        end: i - 1,
      });
    }

    tokens.push(token);

    return token.end;
  }

  for (; i < text.length; i += 1) {
    if (text[i] === '*' || text[i] === '_') {
      let rightFlank = false;
      let strong = false;
      // If strong, need to check two characters ahead instead of one
      let offset = 1;
      let leftFlank = false;

      // Check for preceding text (right-flanking)
      if (i > 0 && !isSpace(text[i - 1])) {
        rightFlank = true;
      }

      // Check for strong emphasis 
      if (i + 1 !== text.length && text[i + 1] === text[i]) {
        strong = true;
        offset = 2;
      }

      // Check for succeeding text (left-flanking)
      if (i + offset !== text.length && !isSpace(text[i + offset])) {
        leftFlank = true;
      }

      if (leftFlank || rightFlank) {
        textBegin = pushToken(i, {
          type: strong ? 'strong' : 'emph',
          flank: (leftFlank && rightFlank) ? 'both' : (leftFlank ? 'left' : 'right'),
          start: i,
          end: i + offset,
        });
      }

      i += offset;
      continue;
    }
  }

  if (textBegin < text.length) {
    tokens.push({
      type: 'text',
      text: text.slice(textBegin),
      begin: textBegin,
      end: text.length,
    });
  }

  return tokens;
}

export type MarkdownRange = {
  type: 'strong' | 'emph';
  start: number;
  end: number;
};

/**
 * Build SlateJS ranges out of markdown
 * @param text 
 */
export const markdownRanges = (text: string): MarkdownRange[] => {
  const tokens = markdownTokens(text);

  const ranges: MarkdownRange[] = [];

  const stacks: { [key: string]: Token[] } = {
    emph: [],
    strong: [],
  }

  // Problems with quoty quotes
  // Can't have bold/emph inside of quotes, but as is I think slatejs would make them using
  // these ranges. Does ` have to wipe out other ranges?

  for (const token of tokens) {
    if (token.type === 'emph' || token.type === 'strong') {
      // Left flank = push onto stack
      if (token.flank === 'left') {
        stacks[token.type].push(token);
      } else {
        // Both flank = if there is something, pop from stack and add range
        // Otherwise push to range
        if (stacks[token.type].length > 0) {
          const left = stacks[token.type].pop();
          if (!left || left.type !== token.type) {
            throw new Error('make typescript happy');
          }
          ranges.push({
            type: token.type,
            start: left.start,
            end: token.end,
          });
        } else if (token.flank === 'both') {
          stacks[token.type].push(token);
        }
      }
    }
  }

  return ranges;
}
