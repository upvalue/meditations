import { NoteRecord, Tag, TCollection } from '../../../shared';

export type TState = {
  /**
   * Maps tag ids to tag names
   */
  tags: { [tagId: string]: Tag },
}
