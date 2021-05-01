import * as React from "react";

import MediumEditor from "medium-editor";
import MediumEditorTable from "medium-editor-tables";

export interface EditableState {
  editorOpen: boolean;
}

// Quick and dirty interval management for this component.

// Managing this on an individual editor basis was extremely error-prone since focusing and
// unfocusing happen often. Instead this tracks active editors using a key and ensures there is only
// one active 5-second interval for any instance of meditations

const activeCallbacks: { [key: string]: (t: NodeJS.Timeout) => void } = {};

setInterval((interval) => {
  // console.log(`5s tick, calling ${Object.keys(activeCallbacks).length} save callbacks`);
  Object.keys(activeCallbacks).forEach(ac => {
    activeCallbacks[ac](interval);
  });
}, 3000);

type EditableProps = {
  editableID: string,
};

/** An item that has an editable body. Used for task comments and journal entries */
export class Editable<
  Props,
  State extends EditableState = EditableState
  > extends React.Component<Props & EditableProps, State> {
  /**
   * Reference to the HTML element that the MediumEditor will be installed on; should be set in
   * subclass's render method
   */
  body!: HTMLElement;
  editor?: MediumEditor.MediumEditor;
  interval?: NodeJS.Timeout;
  pasting: boolean = false;

  componentWillMount() {
    this.setState({ editorOpen: false })
  }

  /** Abstract method; should compare body against model to determine if an update is warranted */
  editorUpdated() {
    console.error("editorUpdated not implemented");
    return false;
  }

  componentWillUnmount() {
    console.log('ha ha ha i know what im doing');
    if (this.interval) clearInterval(this.interval);
    if (!this.editorUpdated()) {
      return;
    }
    this.editorSave();
    this.onBlur();
  }

  /** Abstract method; dispatch an asynchronous update of the Editable in question */
  editorSave() {
    console.error("editorSave not implemented");
  }

  onFocus(e: any) { }
  onBlur() {
    // console.log('base onblur called');
  }
  onSaveInterval(interval: NodeJS.Timeout) {
    console.log('onSaveInterval called with interval:', interval);
  }

  /** Lazily create an editor; if it already exists, focus on it */
  editorOpen = (e?: React.MouseEvent<HTMLElement>) => {
    console.log("!!! editorOpen Called");
    if (!this.editor) {
      console.log('making new editor');
      const options = {
        autoLink: false,
        placeholder: true,

        toolbar: {
          buttons: [
            "bold",
            "italic",
            "underline",
            "anchor",
            "image",
            "quote",
            "orderedlist",
            "unorderedlist",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "table"
          ]
        },

        keyboardCommands: false,

        paste: { cleanPastedHTML: true, forcePlainText: true },
        extensions: {
          table: new MediumEditorTable()
        }
      };

      const editor = new MediumEditor(this.body, options);

      const listener = function (e: BeforeUnloadEvent) {
        const msg = "You have unsaved changes";
        e.returnValue = msg;
        return msg;
      };

      editor.subscribe("focus", (e) => {
        if (
          (document.activeElement &&
            document.activeElement.id.startsWith("medium-editor-pastebin")) || this.pasting
        ) {
          console.log('ignoring focus on paste');
          this.pasting = false;
          return;
        }

        console.log('editor focus');
        window.addEventListener("beforeunload", listener);
        this.onFocus(e);
      });

      editor.subscribe("blur", () => {
        // It is possible that blur may have been called because copy-paste causes MediumEditor to
        // create a 'pastebin' element, in which case we do not want to trigger a save.
        if (
          document.activeElement &&
          document.activeElement.id.startsWith("medium-editor-pastebin")
        ) {
          this.pasting = true;
          console.log('ignoring save on copy and paste');
          return;
        }

        window.removeEventListener("beforeunload", listener);

        console.log('clearing autosave');
        delete activeCallbacks[this.props.editableID];

        this.onBlur();

        // Do not update if nothing has changed
        if (!this.editorUpdated()) {
          return;
        }

        this.editorSave();

        this.setState({ editorOpen: false });
      });
      this.editor = editor;
    }

    activeCallbacks[this.props.editableID] = this.onSaveInterval;

    this.setState({ editorOpen: true });

    // Empty comments will have the no-display class added
    this.body.classList.remove("no-display");
    this.body.focus();
  };
}
