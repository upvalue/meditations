import * as React from 'react';
import * as moment from 'moment';

import * as common from '../../common';
import { CommonUI }
  from '../../common/components';

import { JournalState, Entry } from '../state';
import { JournalSidebar } from '../components/Sidebar';

import { BrowseChrono } from '../components/BrowseChrono';
import { BrowseTag } from '../components/BrowseTag';
import { CEntry } from '../components/CEntry';
import { JournalNavigation } from '../containers/JournalNavigation';

const ViewEntry = (props: {entry: Entry | null}) => {
  return props.entry ? <CEntry context={true} entry={props.entry} /> : <p>Entry deleted</p>;
};

export const JournalRoot = common.connect()(class extends React.Component<JournalState, {}> {
  render() {
    return (
      <CommonUI {...this.props}>
        <div className="d-flex flex-column flex-md-row flex-justify-between mr-md-1">
          <div id="journal-sidebar" className="mb-1">
            {React.createElement(JournalSidebar)}
          </div>

          <div id="journal-main" className="ml-md-1">
            {React.createElement(JournalNavigation)}
            {((this.props.route === 'VIEW_MONTH' || this.props.route === 'VIEW_DAYS') ||
              this.props.searchResults) &&
              <BrowseChrono
                searchString={this.props.searchString}
                daysView={this.props.route === 'VIEW_DAYS'}
                date={
                  (this.props.route === 'VIEW_MONTH' || this.props.route === 'VIEW_DAYS') ?
                    this.props.date : moment()
                }
                entries={this.props.entries}
              />}
            {this.props.route === 'VIEW_TAG' &&
              <BrowseTag tagName={this.props.tag} entries={this.props.entries} /> }
            {this.props.route === 'VIEW_NAMED_ENTRY' &&
              <ViewEntry
                entry={this.props.entries.length === 0 ? null
                  : this.props.entries[0]}
              />}
            {this.props.route === 'VIEW_SEARCH' &&
              <span>Search not implemented yet</span>}
          </div>
        </div>
      </CommonUI>
    );
  }
});
