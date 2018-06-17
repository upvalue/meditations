// list-octicons.js - generate webpack-friendly octicon bindings
// for TypeScript

// usage: node utils/list-octicons.js > frontend/common/octicons.tsx

const octicons = require('octicons');

const { upperFirst, camelCase } = require('lodash');

console.log(`
import * as React from 'react';

export interface OcticonData {
  name: string;
  width: number;
  height: number;
  viewBox: string;
  pathRender: () => any;
}
`)

for(const o of Object.keys(octicons)) {
  // Convert name
  const tsName = upperFirst(camelCase(o));
  
  // console.log(octicons[o]);

  // console.log(octicons[o]);
  let string = `export const Octicon${tsName} : OcticonData = {
  name: '${o}',
  width: ${octicons[o].width},
  height: ${octicons[o].height},
  viewBox: '${octicons[o].options.viewBox}',
  pathRender: () => {
    // tslint:disable-next-line
    return ${octicons[o].path}
  },
};
`;
  string = string.replace('fill-rule', 'fillRule');
  console.log(string);
}
console.log('// suppress tslint error');