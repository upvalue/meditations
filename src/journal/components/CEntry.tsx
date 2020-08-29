import * as React from "react";
import classNames from "classnames";

import { Entry, Tag } from "../state";
import { OcticonButton } from "../../common/components/OcticonButton";

import * as common from "../../common";
import {
  OcticonTag,
  OcticonTextSize,
  OcticonTrashcan,
  OcticonLink,
  OcticonX
} from "../../common/octicons";

import { modalContext, ModalProvider } from "../../common/modal";
import { Editable } from "../../common/components/Editable";
import { entryLock, entryUnlock, sessionuuid } from "../api";

///// REACT COMPONENTS

interface CEntryProps {
  /** If true, a link to the month the entry was created in will be added to the controls. */
  context?: boolean;
  entry: Entry;
  /** A search string to highlight */
  searchString?: string;
}

interface CEntryState {
  editor: MediumEditor.MediumEditor;
}

/** A journal entry. */
export class CEntry extends Editable<CEntryProps> {
  changeName(modal: ModalProvider) {
    return modal.openModalPromptAllowEmpty(
      "What would you like to name this entry? (leave empty to delete)",
      "Name entry",
      this.props.entry.Name,
      name => {
        if (name !== this.props.entry.Name) {
          if (name === "") {
            common.post(`/journal/name-entry/${this.props.entry.ID}`);
          } else {
            common.post(`/journal/name-entry/${this.props.entry.ID}/${name}`);
          }
        }
      }
    );
  }

  addTag(modal: ModalProvider) {
    return modal.openModalPrompt(
      "What tag would you like to add to this entry? (leave empty to cancel)",
      "Tag entry",
      tname => {
        // If input was empty or tag already exists, don't do anything
        if (
          tname === "" ||
          tname == null ||
          (this.props.entry.Tags &&
            this.props.entry.Tags.some(t => t.Name === tname))
        ) {
          return;
        }

        common.post(`/journal/add-tag/${this.props.entry.ID}/${tname}`);
      }
    );
  }

  removeTag(modal: ModalProvider, t: Tag) {
    return modal.openModalConfirm(
      `Are you sure you want to remove the tag #${t.Name}?`,
      "Yes, remove it",
      () => common.post(`/journal/remove-tag/${this.props.entry.ID}/${t.Name}`)
    );
  }

  deleteEntry(modal: ModalProvider) {
    return modal.openModalConfirm(
      "Are you sure you want to remove this entry?",
      "Yes, remove it",
      () => common.post(`/journal/delete-entry/${this.props.entry.ID}`)
    );
  }

  editorUpdated() {
    return this.props.entry.Body !== this.body.innerHTML;
  }

  get locked() {
    const { entry } = this.props;
    const { Lock } = entry;

    return Lock !== null && Lock !== '' && Lock !== sessionuuid;
  }

  onSaveInterval = (interval: NodeJS.Timeout) => {
    console.log('onSaveInterval called with interval: ', interval);
    console.log(`Automatically saving entry ${this.props.entry.ID}`)
    this.editorSave();
  }

  onFocus() {
    entryLock(this.props.entry.ID);
  }

  onBlur() {
    entryUnlock(this.props.entry.ID);
  }

  editorSave() {
    common.post("/journal/update", {
      ID: this.props.entry.ID,
      Body: this.body.innerHTML
    });
  }

  editorOpenLockPrompt = (modal: ModalProvider) => {
    if (!this.locked) {
      this.editorOpen();
    } else {
      modal.openModalConfirm(
        "Are you sure you want to edit this currently locked entry?",
        "Yes, edit",
        () => common.post(`/journal/unlock-entry/${this.props.entry.ID}`)
      )();
    }
  }

  render() {
    // A link to the month the entry was written, if viewing in a non time based context (e.g. by
    // name or by tag)
    const ctxLink = this.props.context
      ? // tslint:disable-next-line
      `#view/${this.props.entry.CreatedAt.local().format(
        common.MONTH_FORMAT
      )}/${this.props.entry.ID}`
      : false;

    // In order, render:
    // A header with title and title-changing control, then tags
    // Other controls and timestamp on the rightmost

    let body = this.props.entry.Body.slice(0);

    if (!this.state.editorOpen && this.props.searchString) {
      // TODO: This highlight needs to be undone during actual editing, otherwise medium-editor
      // just saves the HTML.
      const searchString = this.props.searchString.slice(0);
      const esc = searchString.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const reg = new RegExp(esc, "ig");
      body = body.replace(
        reg,
        `<span class="entry-highlight">${this.props.searchString}</span>`
      );
    }

    return (
      <modalContext.Consumer>
        {modal => (
          <section
            className={classNames("entry border bg-gray", this.locked && "entry-locked")}
            id={`entry-${this.props.entry.ID}`}
          >
            <div className="entry-header border-bottom">
              <div className="d-flex flex-row flex-justify-between flex-items-center">
                <div className="d-flex flex-row flex-items-center ml-2 mb-1 mt-1">
                  <OcticonButton
                    icon={OcticonTextSize}
                    onClick={this.changeName(modal)}
                    tooltip="Change name"
                    tooltipDirection="e"
                    normalButton={true}
                    className="p-1 mr-2 d-flex flex-items-center"
                  />
                  <h3
                    className="ml-1 d-flex flex-column flex-md-row"
                    style={{ display: "inline" }}
                  >
                    <span className="d-flex flex-column flex-md-row">
                      #{this.props.entry.ID}&nbsp;
                      <span>
                        {this.props.entry.Name && (
                          <strong>{this.props.entry.Name}</strong>
                        )}
                      </span>
                    </span>
                  </h3>

                  <div
                    className="ml-2 d-flex flex-md-row flex-column"
                    style={{ display: "inline" }}
                  >
                    <OcticonButton
                      icon={OcticonTag}
                      tooltip="Add tag"
                      tooltipDirection="n"
                      className="p-1 mr-2 d-flex flex-items-center"
                      normalButton={true}
                      onClick={this.addTag(modal)}
                    />
                    {this.props.entry.Tags &&
                      this.props.entry.Tags.map((t, i) => (
                        <button
                          className="mt-4 mt-md-0 ml-md-3 tag d-flex flex-items-center"
                          key={i}
                          style={{ borderRadius: "1px" }}
                        >
                          <a href={`#tag/${t.Name}`}>#{t.Name}</a>
                          &nbsp;
                          <OcticonButton
                            className="d-flex"
                            icon={OcticonX}
                            onClick={this.removeTag(modal, t)}
                          />
                        </button>
                      ))}
                  </div>
                </div>

                <div className="entry-controls mr-2">
                  <strong>
                    {this.props.entry.CreatedAt.local().format(
                      this.props.context ? "M-D-YY h:mm A" : "h:mm A"
                    )}
                  </strong>

                  {ctxLink && (
                    <OcticonButton
                      tooltip="Go to context"
                      icon={OcticonLink}
                      href={ctxLink}
                    />
                  )}

                  <OcticonButton
                    icon={OcticonTrashcan}
                    onClick={this.deleteEntry(modal)}
                    tooltip="Delete this entry"
                    className="btn-danger ml-1"
                  />
                </div>
              </div>
            </div>

            <div
              className="entry-body p-2 "
              id={`entry-body-${this.props.entry.ID}`}
              ref={body => {
                if (body) this.body = body;
              }}
              dangerouslySetInnerHTML={{ __html: body }}
              onClick={() => this.editorOpenLockPrompt(modal)}
            />
          </section>
        )}
      </modalContext.Consumer>
    );
  }
}
