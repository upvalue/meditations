import { NoteBody } from '../../shared';
import { discoverRelations } from './parse';

const sampleDoc1: NoteBody = [
  {
    type: 'line',
    children: [
      {
        text: 'This is a tagged document'
      },
      {
        type: 'tag',
        tagId: 'tag-3nntmoG2zhqHwt8EZamMiK',
        children: [
          {
            'text': '',
          },
        ]
      }
    ],
  }
]

describe('discoverRelations', () => {
  it('successfully discovers basic relations', () => {
    const relations = discoverRelations(sampleDoc1);

    expect(relations).toMatchSnapshot();
  });
});