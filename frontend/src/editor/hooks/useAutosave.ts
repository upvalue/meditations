// useAutosave.ts - automatic save functionality. handles saving on intervals / flushing

import { useEffect, useRef } from "react";
import { NoteBody } from "../../shared";

// each update checks time
// if it's been more than 3s since last save, we save
// if it's unmounted, we save

const log = (noteId: string, ...args: any[]) => {
  // const args2 = Array.prototype.slice.call(args);
  args.unshift(`[autosave] ${noteId}`);
  console.log.apply(console, args as any);
}


export const useAutosave = (noteId: string) => {
  const interval = useRef<any>();
  const noteBody = useRef<NoteBody>();
  const savedBody = useRef<NoteBody>();

  const save = () => {
    if (savedBody.current === noteBody.current) {
      log('body has not changed, ignoring')
      return;
    }

    log('body has changed, dispatching save');
    savedBody.current = noteBody.current;
  }


  useEffect(() => {
    log(noteId, 'interval opened');
    interval.current = setInterval(() => {
      log(noteId, 'interval fired');

      save();
    }, 3000);

    return () => {
      log(noteId, 'interval closed');
      clearInterval(interval.current);
      interval.current = 0;
      save();
    }
  }, [noteId]);

  return {
    onUpdate: (newBody: NoteBody) => {
      noteBody.current = newBody;
    },
  }
}

