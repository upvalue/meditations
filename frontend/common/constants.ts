// constants.ts - Constants

/**
 * Determines at what point in time the next day's scope will be made available. The default of 4
 * hours means it will be available at 8PM local time.
 */
export const MOUNT_NEXT_DAY_TIME = 4;

/**
 * Determines at what point in time journal entries will be considered part of the 
 * next day. e.g. if a journal entry is made at 1AM, it will be given a date of
 * the previous day under the assumption that the user is still awake.
 * 
 * In hours.
 */
export const JOURNAL_ROLLOVER_TIME = 4;
