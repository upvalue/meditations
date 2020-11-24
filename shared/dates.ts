// dates.ts - shared date functionality

import { format, parse } from 'date-fns';

/**
 * Format a date to send over the wire, suitable for insertion into postgres
 */
export const formatWireDate = (date: Date) => {
  return format(date, "yyyy-MM-dd HH:mm:ssx");
}

const ref = new Date();

/**
 * Parse a date sent over the wire, suitable for insertion into postgres
 * @param {string} date 
 */
export const parseWireDate = (date: string) => {
  return parse(date, 'yyyy-MM-dd HH:mm:ssx', ref);
}
