import * as React from 'react';
import { Entry } from '../state';
import { CEntry } from '../components/CEntry';

export class BrowseTag extends React.PureComponent<{tagName: string, entries: Entry[]}, {}> {
  render() {
    const entries: React.ReactElement<undefined>[] = [];
    let key = 0;
    this.props.entries.forEach((e) => {
      entries.push(<CEntry context={true} key={key} entry={e} />);
      key += 1;
      entries.push(<hr key={key} />);
      key += 1;
    });
    return (
      <div>
        <h3>#{this.props.tagName}</h3>
        {entries}
      </div>
    );
  }
}
