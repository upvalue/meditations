import * as React from "react";

import MediumEditor from "medium-editor";
import MediumEditorTable from "medium-editor-tables";

export interface EditableState {
  editor: MediumEditor.MediumEditor;
  editorOpen: boolean;
}

/** An item that has an editable body. Used for task comments and journal entries */
export class Editable<
  Props,
  State extends EditableState = EditableState
> extends React.Component<Props, State> {
  /**
   * Reference to the HTML element that the MediumEditor will be installed on; should be set in
   * subclass's render method
   */
  body!: HTMLElement;

  componentWillMount() {
    this.setState({ editorOpen: false });
  }

  /** Abstract method; should compare body against model to determine if an update is warranted */
  editorUpdated() {
    console.error("editorUpdated not implemented");
    return false;
  }

  /** Abstract method; dispatch an asynchronous update of the Editable in question */
  editorSave() {
    console.error("editorSave not implemented");
  }

  /** Lazily create an editor; if it already exists, focus on it */
  editorOpen = (e?: React.MouseEvent<HTMLElement>) => {
    console.log("!!! editorOpen Called");
    if (!this.state.editor) {
      const options = {
        autoLink: true,
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

        paste: { cleanPastedHTML: true, forcePlainText: false },
        extensions: {
          table: new MediumEditorTable()
        }
      };

      const editor = new MediumEditor(this.body, options);

      const listener = function(e: BeforeUnloadEvent) {
        const msg = "You have unsaved changes";
        e.returnValue = msg;
        return msg;
      };

      editor.subscribe("focus", () => {
        window.addEventListener("beforeunload", listener);
      });

      editor.subscribe("blur", () => {
        window.removeEventListener("beforeunload", listener);
        // It is possible that blur may have been called because copy-paste causes MediumEditor to
        // create a 'pastebin' element, in which case we do not want to trigger a save.
        if (
          document.activeElement &&
          document.activeElement.id.startsWith("medium-editor-pastebin")
        ) {
          return;
        }

        // Do not update if nothing has changed
        if (!this.editorUpdated()) {
          return;
        }

        this.editorSave();
        this.setState({ editorOpen: false });
      });

      this.setState({ editor, editorOpen: true });
    } else {
      this.setState({ editorOpen: true });
    }

    // Empty comments will have the no-display class added
    this.body.classList.remove("no-display");
    this.body.focus();
  };
}
