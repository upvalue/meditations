import short from 'short-uuid';

const translator = short();

/**
 * Generate a human readable short UUID prefixed with tipe-
 * @param tipe 
 */
export const generateId = (tipe: string) => {
  return `${tipe}-${translator.new()}`;
}
