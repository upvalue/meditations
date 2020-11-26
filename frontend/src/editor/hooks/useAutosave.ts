// useAutosave.ts - automatic save functionality. handles saving on intervals / flushing
import { useCallback, useEffect, useRef, MutableRefObject } from "react";
import { useUpdateNoteMutation } from "../../api/client";
import { List } from 'ts-toolbelt';
import { formatWireDate, Maybe, NoteBody } from "../../shared";

const log = (...args: any[]) => {
  args.unshift(`[autosave]`);
  console.log.apply(console, args as any);
}

type AutosaveState = {
  noteId: string,
  savedBody: NoteBody,
  body: NoteBody,
  interval?: number,
  revision: number,
  saving: boolean,
}

type UpdateNoteMutation = List.At<ReturnType<typeof useUpdateNoteMutation>, 1>;

const autosave = async (stateRef: MutableRefObject<AutosaveState>, update: UpdateNoteMutation) => {
  const state = stateRef.current;

  const { body, savedBody, saving, noteId, revision } = state;

  // We need revisions to be strictly in-order, so keep a lock to prevent saving
  if (saving) return;

  // No need to mutate anything if nothing has changed
  if (body === savedBody) return;

  log('dispatching autosave')

  try {
    state.saving = true;
    await update({
      noteId,
      noteRevisionId: revision + 1,
      updatedAt: formatWireDate(new Date()),
      body: JSON.stringify(body),
    })
    state.savedBody = state.body;
    state.revision = revision + 1;
  } catch (e) {
    console.error(e);
  }

  state.saving = false;
}

/**
 * Autosave hook -- manages intervals and dispatching save events, if contents have changed
 * 
 * How it works: Each time we use this with a noteId, an interval is created
 * When the interval fires, we'll try to save
 * When this is unmounted, we'll try to save
 * "Try to save" means:
 * Check if the body has actually changed
 * @param noteId 
 * @param revision 
 */
export const useAutosave = (noteId: string, body: NoteBody, revision?: Maybe<number>) => {
  const [, updateNoteMutation] = useUpdateNoteMutation();

  // Apologia: I tried rewriting this into a reducer that fired after every update and saved every
  // 3s, but ultimately it is so side-effecty and stateful that it ended up being more confusing
  // than just... using a big ref pile
  const state = useRef<AutosaveState>({
    noteId,
    savedBody: body,
    revision: revision ? revision : -1,
    body: body,
    saving: false,
  });

  useEffect(() => {
    log('creating interval');
    state.current.interval = window.setInterval(() => {
      autosave(state, updateNoteMutation);
    }, 3000);

    return () => {
      autosave(state, updateNoteMutation);
      if (state.current.interval) {
        log('clearing interval');
        clearInterval(state.current.interval);
        state.current.interval = undefined;
      }
    }
  }, []);

  const onUpdate = useCallback((body: NoteBody) => {
    state.current.body = body;
  }, []);

  return {
    onUpdate,
  }
}

