import * as moment from 'moment';

import * as common from '../src/common';

describe('test suite', () => {
  it('runs', () => {
  });

  it('makes assertions', () => {
    expect(true).toBe(true);
  });
});

describe('common', () => {
  it('formats dates properly', () => {
    expect(moment('2015-01-01', 'YYYY-MM-DD').format(common.DAY_FORMAT)).toBe('2015-01-01');
  });
});
