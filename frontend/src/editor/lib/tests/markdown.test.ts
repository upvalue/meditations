import { markdownTokens, markdownRanges } from '../markdown';

const tests = [
  /*
  {
    input: '*italic*',
    output: [
      {
        type: 'italic',
        start: 0, end: 7
      }
    ]
  },
  */
  /*
   {
     input: '**bold**',
     output: [
       {
         type: 'bold',
         start: 0, end: 7
       }
     ]
   },
   {
     input: '*italic **and bold** woo*',
     output: [
       {
         type: 'italic',
         start: 0, end: 24
       },
       {
         type: 'bold',
         start: 8, end: 19
       }
     ]
   }
   */
  /*
  {
    input: '**$$$**',
    output: []
  }
  */
  /*
   {
     input: '**nested **bold** power**',
     output: [],
   }
   */

  {
    input: '*random * asterisk* texty',
    output: []
  },

]

/*
it('markdownTokens', () => {
  tests.forEach(test => {
    // console.log(markdownRanges(test.input));
    console.log(markdownTokens(test.input));
    //expect(markdownRanges(test.input)).toEqual(test.output);
  })

});

*/

it('markdownRanges', () => {
  tests.forEach(test => {
    console.log(markdownRanges('*random * asterisk* texty'));
  })
})