import * as common from '../common';
import { Entry } from "./state";

import uuid4 from 'uuid/v4';

export const sessionuuid = uuid4();

export const entryLock = (entryID: number) => {
  return common.post(`/journal/lock-entry/${entryID}/${sessionuuid}`);
}

export const entryUnlock = (entryID: number) => {
  return common.post(`/journal/unlock-entry/${entryID}/`);
}
