/* eslint-disable no-unused-vars */

// BUG: Deleting everything in Firefox causes an error

// BUG: Firefox doesn't insert new rf-editor-line

// BUG: Test on firefox

// BUG: Introduce rich formatting to a code block, then try to turn it into a code block
// It doesn't work because we only go off of text nodes

// BUG: Blockquote and list separation
// It's possible for user to create a non-logical line by deleting a list bullet

// TODO: HR

// Works, but needs to insert a new line after

// TODO: links
// TODO: Entities

// BUG: shift-command introduces a BR which then messes up start-of-line stuff

// extended

// TODO: saving/loading sanitized
// considered just having sane output but contenteditable makes this hard to do
// TODO: inline code
// TODO: Tables
// TODO: cursor-based popup editor
// TODO: extensible slash-commands (?)

// TODO: Table of contents 
// TODO: Hashtags

// TODO: Some kind of state-update callback that allows client app to track usage of the above

/**
 * True if running on Firefox
 */
const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

// TODO: Combine these somehow, and get a better list of separators upon which to process 
// markdown (or is this important? do we need to do it immediately or is EOL fine?)

// For normal editing, we require some kind of breaking
// character (whitespace, comma) to disambiguate
const normalRegexen = [
  // TODO: Better separation characters
  [/\*\*(.+?)\*\*([\s,])/g, '<strong>$1</strong>$2'],
  [/__(.+?)__([\s,])/g, '<strong>$1</strong>$2'],
  [/\*(.+?)\*[\s,]/g, '<em>$1</em>&nbsp;'],
  [/_(.+?)_[\s,]/g, '<em>$1</em>&nbsp;'],
  // Inline code blocks, WIP
  // [/`(.+?)`/g, '<span class="rf-inline-code">$1</span>&#8203;']
]

// For EOL we don't require subsequent whitespace, in order to handle things at the
// the end of the line 
const eolRegexen = [
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/__(.+?)__/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/_(.+?)_/g, '<em>$1</em>'],
]

/**
 * Move a cursor to a particular location within a node
 * Used when splicing DOM nodes
 * @param {*} node 
 * @param {*} start 
 */
const moveCursor = (node, start = 0) => {
  const range = document.createRange();
  const sel = window.getSelection();
  try {
    range.setStart(node, start);
  } catch (e) {
    range.setStart(node, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}


/**
 * Insert a node after a particular node
 * @param {*} parent 
 * @param {*} node 
 * @param {*} newNode 
 */
const insertAfter = (parent, node, newNode) => {
  if (node.nextSibling) {
    parent.insertBefore(newNode, node.nextSibling);
  } else {
    parent.appendChild(newNode);
  }
}

/**
 * Check if a node is or has an ancestor with a particular nodeName (DIV, LI, etc)
 * @param {*} node 
 * @param {*} nodeNames Can be a string or an array of strings
 */
const nodeAncestorOfNames = (node, nodeNames) => {
  if (typeof nodeNames === 'string') nodeNames = [nodeNames];

  let next = node;
  while (!next.classList.contains('rf-editor')) {
    if (nodeNames.includes(next.nodeName)) return next;
    next = next.parentNode;
  }
  return false;
}

const nodeHasNoUserEnteredText = (node) => {
  return node.innerHTML === '<br>';
}

/**
 * Remove contenteditable state e.g. bold
 * @param {*} name 
 */
const disableCommandState = (name) => {
  if (document.queryCommandState(name) === true) {
    document.execCommand(name);
  }
}

const disableCommandStates = (...names) =>
  names.forEach(disableCommandState);

/**
 * Return the actively edited element
 */
const getActiveElement = () => {
  const node = document.getSelection().anchorNode;
  return (node.nodeType === 3 ? node.parentNode : node);
}

/*
 * Return the last node in a node tree, if it is text, regardless of depth
 */
const lastNodeIfText = (node) => {
  if (!node) return;
  let i = node;
  while (i.nodeType !== Node.TEXT_NODE) {
    if (i.childNodes.length > 0) {
      let j = i.childNodes.length - 1;
      // Skip over BRs which Firefox inserts for some fun reason
      for (; j > 0; j -= 1) {
        if (i.childNodes[j].nodeName !== 'BR') break;
      }
      i = i.childNodes[i.childNodes.length - 1];
      continue;
    }
    return;
  }
  return i;
}

/**
 * Given some arbitrary text determine what kind of transformation, if any
 * should be done to it, e.g. __hello__ becomes <strong>hello</strong>
 * 
 * This function returning a transformation doesn't guarantee that it will happen
 * e.g. we don't allow headers and lists anywhere except toplevel
 * @param {boolean} toplevelLineStart true if this is the start of a line at the toplevel
 * which is the only point at which certain things (lists, headers) are valid
 * @param {string} str 
 * @param {*} regexen pairs of regex and replacements 
 * @returns a tuple describing what should occur
 */
const transformText = (toplevelLineStart, str, regexen) => {
  // Some things (headers, lists) are only allowed at the beginning of a line
  if (toplevelLineStart) {
    // These are only processed when they are the first non-whitespace character
    // in the first four characters of a string
    const formatChar = str.slice(0, 4).trimLeft();
    if (formatChar.startsWith('#')) {
      let newStr = str.trimLeft()
      let headerSize = 0;
      // check for consecutive #'s to determine header size, check that there is a whitespace
      // char following the # to indicate desire to header-ify
      let i;
      for (i = 0; i !== newStr.length; i += 1) {
        if (newStr[i] === '#') {
          headerSize += 1;
          if (headerSize === 6) break;
        } else {
          i -= 1;
          break;
        }
      }

      // We have to use \s here instead of just checking for a space
      // because different browsers use different whitespacing strategies ;_;
      if (newStr.length > (i + 1) && /\s/.test(newStr[i + 1])) {
        return ['header', headerSize];
      }
    } else if (formatChar.startsWith('* ') && formatChar.length >= 2) {
      return ['list', 'unordered'];
    } else if (formatChar.match(/\d\d?.\s/)) {
      return ['list', 'ordered'];
    } else if (formatChar.startsWith('> ') && formatChar.length >= 2) {
      return ['blockquote'];
    } else if (formatChar.startsWith('---')) {
      return ['sub', '<hr />'];
    }
  }

  // Look at this I mean can you believe I did this?
  // It's truly awful
  return ['sub', regexen.reduce((a, b) => a.replace(b[0], b[1]), str)];
}

const assert = (desc, expr) => {
  if (!expr) {
    console.warn(`assertion: ${desc} failed`);
  }
}

export default class Editor {
  state = {
    /**
     * When inserting a markdown list, contains the 
     * first character of content
     */
    insertingList: false,

    /**
     * Used to avoid redundant observer dispatches
     */
    disableObserver: false,
  };

  processLastTextNode(node) {
    if (!node) return; // This can happen if all text is deleted
    if (node.nodeType === Node.TEXT_NODE) {
      this.processTextNode(node, eolRegexen);
    } else {
      if (node.childNodes.length === 0) return;
      this.processLastTextNode(node.childNodes[node.childNodes.length - 1]);
    }
  }

  processTextNode(textNode, regexen = normalRegexen) {
    let parent = textNode.parentElement;
    // TODO: Why did I add this? does this ever happen? :thonk:
    if (!parent) return;

    const isToplevel = textNode.parentElement.parentElement === this.editor &&
      (textNode.previousSibling === null || ['BR', 'HR'].includes(textNode.previousSibling.nodeName));

    const [type, result] = transformText(isToplevel, textNode.wholeText, regexen);

    // Sub is the default return, but it doesn't mean anything actually changed, so check
    // if it did before continuing
    if (type === 'sub' && result !== textNode.wholeText) {
      // Use a temporary element to convert this to real DOM nodes
      this.tmp.innerHTML = result;

      while (this.tmp.childNodes.length) {
        parent.insertBefore(this.tmp.childNodes[0], textNode);
      }
      parent.removeChild(textNode);
    } else if (type === 'header') {
      // Refuse to create a header at non-toplevel
      if (!parent.classList.contains("rf-editor-line")) return;

      // Create a header node
      const hnode = document.createElement(`h${result}`);

      // Insert a zero-width space and put the user's cursor after it
      hnode.innerHTML = '&#8203;';

      parent.insertBefore(hnode, textNode);
      parent.removeChild(textNode);

      moveCursor(hnode, 1);
    } else if (type === 'hr') {
      parent.removeChild(textNode);
      document.execCommand('insertHorizontalRule');
    } else if (type === 'list') {
      if (result === 'unordered') {
        this.state.insertingList = {
          content: textNode.wholeText.split('*')[1].trimLeft(),
        }

        document.execCommand('insertUnorderedList');
      } else {
        const [start] = textNode.wholeText.split('.');
        this.state.insertingList = {
          content: '',
          start,
        }

        document.execCommand('insertOrderedList');
      }
    } else if (type === 'blockquote') {
      this.state.insertingList = {
        className: 'blockquote',
        content: textNode.wholeText.split('>')[1].trimLeft(),
      };

      document.execCommand('insertUnorderedList');
    }
  }

  save() {
    return this.editor.innerHTML;
  }

  mount(editor) {
    this.editor = editor;
    this.tmp = document.createElement('span');

    editor.classList.add('rf-editor');

    editor.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return;

      const activeElement = getActiveElement();

      // Trap tabs, allow them to indent an active list (but only when within the list)
      if (e.keyCode === 9) {
        const listItem = nodeAncestorOfNames(activeElement, 'LI');
        if (listItem) {
          e.preventDefault();
          // Refuse to indent "blockquotes"
          const ul = listItem.parentElement;
          if (ul.classList.contains('blockquote')) return;
          document.execCommand('indent');
        }
      }
    })

    const observer = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        if (this.state.disableObserver) {
          this.state.disableObserver = false;
          return;
        }

        if (mutation.type === 'characterData') {
          this.processTextNode(mutation.target);
        } else if (mutation.type === 'childList') {
          const node = mutation.addedNodes[0];

          if (!node) return;

          if (node.nodeName === 'BR' && isFirefox) {
            // Firefox inserts BRs with new lines for fun
            this.processTextNode(mutation.previousSibling, eolRegexen);
            return;
          }


          if (node.nodeName === 'HR') {
            // Horizontal rules are added at the toplevel for some reason, but we don't want
            // them to create a new text node after so select the div after them
            /*
            const newLine = document.createElement('div');
            newLine.innerHTML = "";
            newLine.classList.add('rf-editor-line');
            if (node.parentElement.nextSibling) {
              node.parentElement.parentElement.insertBefore(node, node.parentElement.nextSibling);
            } else {
              node.parentElement.parentElement.appendChild(node);
            }
            moveCursor(newLine, 0);
            console.log('hehe');
            */
            // node.parentElement.nextSibling
            //console.log(mutation, node);
            // moveCursor(newLine, 0);
            /*
              const parent = node.parentElement;
              node.parentElement.removeChild(node);
              parent.parentElement.insertBefore(node, parent.nextSibling);
              node.classList.add('rf-editor-line');
              */
          }

          // TODO: Some major cleanup is required here
          // It would be nice to codify these branches into something more formal, for example
          // a table of rules e.g. what to do when user inserts a blockquote, etc

          // Another way to clean this up is that I'm being super defensive with some of these
          // conditions and perhaps they should be converted to assertions within the body
          // and logs monitored to see if they ever actually happen

          if (mutation.target === editor && mutation.addedNodes.length === 1) {
            if (node.nodeName === 'DIV') {
              // If the user has created a new line, try to process the final piece of text
              // they entered in case it is some markdown
              const prevTextNode = lastNodeIfText(mutation.addedNodes[0].previousSibling);
              if (prevTextNode) this.processTextNode(prevTextNode, eolRegexen);
            }
          } else if (mutation.addedNodes.length === 1) {
            if (this.state.insertingList && (node.nodeName === 'UL' || node.nodeName === 'OL')) {
              if (node.nodeName === 'OL') {
                node.setAttribute('start', this.state.insertingList.start);
              }
              // If true, we've just done an execCommand to create a list, and now we need to 
              // modify the text content
              const li = node.childNodes[0];
              // Modify the text content to 1) remove the * (done in transformText) and 2)
              // move the cursor to the front so the user can keep typing
              const { className, content } = this.state.insertingList;

              if (className) {
                node.classList.add(className);
              }

              li.innerHTML = content;

              moveCursor(li, 1);

              this.state.insertingList = false;
            } else if (this.state.insertingList && node.nodeName === 'LI') {
              // It's possible for an LI to be inserted as a list, because
              // execCommand insertXList at the end of a list splices the LI
              // back onto the list
              this.state.insertingList = false;
              node.innerHTML = '';
            } else if (node.nodeName === 'LI' && node.previousSibling) {
              // Detect when an LI has been added to a list in order to fully process
              // the text nodes of the last LI
              const lastTextNode = lastNodeIfText(node.previousSibling);
              if (lastTextNode) {
                this.processLastTextNode(lastTextNode);
              }
            } else if (node.nodeName === 'DIV' && node.parentElement !== editor) {
              // Detect if a single div has been inserted, at non-toplevel
              // If it has, splice it up to a toplevel .rf-editor-line
              const parent = node.parentElement;
              node.parentElement.removeChild(node);
              parent.parentElement.insertBefore(node, parent.nextSibling);
              node.classList.add('rf-editor-line');
              // Move cursor to new node
              moveCursor(node, 0);
              return;

              // Remove any formatting that is present
            }
          }

          // If user backspaces into a backtick inline code box, detransform it
          if (mutation.removedNodes.length === 1) {
            const node = mutation.removedNodes[0];
            if (node.nodeType === Node.TEXT_NODE && node.wholeText === '' && mutation.previousSibling && mutation.previousSibling.classList.contains('rf-inline-code')) {
              const codeSpan = mutation.previousSibling;
              const detransformed = document.createTextNode(`\`${codeSpan.innerHTML}`);
              codeSpan.parentElement.insertBefore(detransformed, codeSpan);
              codeSpan.parentElement.removeChild(codeSpan);
            }
          }

          // Also, if user spaces out of a code bo

          // Don't carry over formatting to new lines
          if (mutation.target === editor && mutation.addedNodes.length === 1 && mutation.addedNodes[0].nodeType !== Node.TEXT_NODE && mutation.addedNodes[0].classList.contains('rf-editor-line')) {
            disableCommandStates('bold', 'italic', 'underline', 'strikethrough');
          }
        }
      }
    });

    observer.observe(editor, {
      attributes: true, childList: true, subtree: true, characterData: true
    });

    this.observer = observer;
  };
}