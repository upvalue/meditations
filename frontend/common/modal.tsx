// modal.tsx - Modal implementation based on React 16 Contexts

import * as React from 'react';
import { OcticonButton } from './components/OcticonButton';
import { OcticonX } from './octicons';

export const modalContext = React.createContext<ModalProvider>(undefined as any as ModalProvider);

interface ModalInputData {

}

export interface ModalStateCommon {
  modalOpen: boolean;
  modalType: 'CONFIRM' | 'INPUT' | 'EMPTY';
  modalData: null | ModalInputData;
  modalError?: string;
}

interface ModalInputState extends ModalStateCommon {
  modalType: 'INPUT';
  modalData: {
    /**
     * The body text of the modal
     */
    body: string;

    /**
     * The text of the submission button
     */
    ok: string;

    /**
     * Success callback
     */
    callback: (result: string) => void;

    /**
     * Default value for the input
     */
    defaultValue?: string;

    /**
     * If true, submission of empty values will be allowed
     */
    allowEmpty?: boolean;

    /**
     * Input validator; returns an error description if string is problematic, or empty string
     * if it is okay
     */
    checker?: (chk: string) => string;
  };
}

interface ModalConfirmState extends ModalStateCommon {
  modalType: 'CONFIRM';
  modalData: {
    /**
     * The body of the confirmation modal i.e. "Are you sure you want to delete this?"
     */
    bodyText: string;

    /**
     * The text of the confirmation button i.e. "Delete" or something indicative of the
     * action being taken instead of just "OK"
     */
    confirmText: string;

    callback: () => void;
  };
}

interface ModalEmptyState extends ModalStateCommon {
  modalOpen: false;
  modalType: 'EMPTY';
  modalData: null;
}

type ModalState = ModalInputState | ModalEmptyState | ModalConfirmState;

/**
 * Optional arguments for an input modal
 */
interface ModalPromptOptions {
  allowEmpty?: boolean;
  checker?: (chk: string) => string;
}

export interface ModalProviderProps {
  socketClosed: boolean;
}

/**
 * Modal provider handles global modal state. It is also responsible for styling the entire app
 * in the case of error notifications or modals.
 */
export class ModalProvider extends React.Component<ModalProviderProps, ModalState> {
  modalInput?: HTMLInputElement;

  constructor(props: any) {
    super(props);

    this.state = {
      modalOpen: false,
      modalType: 'EMPTY',
      modalData: null,
    };
  }

  /*
  componentWillUpdate(nextProps : ModalProviderProps, nextState: ModalState) {
    if (this.state.modalOpen && !nextState.modalOpen) {
      mousetrap.unbind(KEYSEQ_MODAL_EXIT);
    } else if (!this.state.modalOpen && nextState.modalOpen) {
      mousetrap.bindGlobal('escape', () => {
        console.log('quit modal');
      });
    }
  }
  */

  openModalPrompt(body: string, ok: string, callback: (result: string) => void,
    defaultValue?: string, options?: ModalPromptOptions) {

    return () => {
      this.setState({
        modalOpen: true,
        modalType: 'INPUT',
        modalData: {
          body, ok, callback,
          defaultValue,
          ...options,
        },
      });
    };
  }

  /**
   * Open a modal prompt that allows empty text
   * @param body
   * @param ok
   * @param defaultValue
   * @param checker
   * @param callback
   */
  openModalPromptAllowEmpty(body: string, ok: string, defaultValue: string,
    callback: (result: string) => void) {

    return this.openModalPrompt(body, ok, callback, defaultValue, {
      allowEmpty: true,
    });
  }

  openModalPromptChecked(body: string, ok: string, defaultValue: string,
    checker: (chk: string) => string,
    callback: (result: string) => void) {

    return this.openModalPrompt(body, ok, callback, defaultValue, {
      checker,
    });
  }

  openModalConfirm(bodyText: string, confirmText: string, callback: () => void) {
    return () => {
      this.setState({
        modalOpen: true,
        modalType: 'CONFIRM',
        modalData: {
          bodyText, confirmText, callback,
        },
      });
    };
  }

  dismissModal = () => {
    this.setState({ modalOpen: false });
  }

  submitModal = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
    }

    const state = this.state;

    if (this.state.modalType === 'INPUT' && this.modalInput) {
      const { callback, checker, allowEmpty } = this.state.modalData;

      // Optional error checking
      if (checker) {
        const errmsg = checker(this.modalInput.value);
        if (errmsg !== '') {
          this.setState({
            modalError: errmsg,
          });
          return;
        }
      }

      if (allowEmpty || this.modalInput.value !== '') {
        callback(this.modalInput.value);
      }
    } else if (this.state.modalType === 'CONFIRM') {
      this.state.modalData.callback();

    }

    this.setState({
      modalOpen: false,
    });
  }

  getGlobalStyleOverride(): React.CSSProperties | undefined {
    if (this.state.modalOpen) {
      return {
        opacity: 0.75,
        pointerEvents: 'none',
      };
    } else if (this.props.socketClosed) {
      return {
        pointerEvents: 'none',
        filter: 'blur(1px)',
      };
    }
  }

  render() {
    return (
    <>
      <modalContext.Provider value={this}>
        {this.state.modalOpen &&
          <div id="modal" className="bg-white border border-gray-dark p-2">
            <div className="float-right pb-1">
              <OcticonButton
                icon={OcticonX}
                tooltip="Dismiss prompt"
                onClick={this.dismissModal}
              />
            </div>

            {this.state.modalType === 'INPUT' &&
              <form onSubmit={this.submitModal}>
                <span>{this.state.modalData.body}</span>
                {this.state.modalError &&
                  <div className="flash flash-error mt-1 mb-1">{this.state.modalError}</div>
                }
                <input
                  ref={(e) => { if (e) { this.modalInput = e; e.focus(); } }}
                  className="form-control input-block mb-1"
                  type="text"
                />
                <button className="btn btn-primary btn-block mb-1" onClick={this.submitModal}>
                  {this.state.modalData.ok}
                </button>

                <button className="btn btn-secondary btn-block" onClick={this.dismissModal}>
                  Close
                </button>
              </form>
            }

            {this.state.modalType === 'CONFIRM' &&
              <div>
                <span>{this.state.modalData.bodyText}</span>
                <button
                  className="btn btn-danger btn-block mb-1"
                  onClick={this.submitModal}
                  ref={(e) => { if (e) { e.focus(); } }}
                >
                  {this.state.modalData.confirmText}
                </button>
                <button className="btn btn-secondary btn-block mb-1" onClick={this.dismissModal}>
                  Cancel
                </button>
              </div>
            }
          </div>
        }

        <div style={this.getGlobalStyleOverride()}>
          {this.props.children}
        </div>
      </modalContext.Provider>
    </>
    );
  }
}
