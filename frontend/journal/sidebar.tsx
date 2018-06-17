import * as React from 'react';
import { TabPanel, Tab, TabList, Tabs } from 'react-tabs';

import { connect, DAY_FORMAT } from '../common';
import { Spinner, OcticonButton, OcticonSpan } from '../common/components';
import LinkTree, { LinkTreeNode } from './linktree';
import * as moment from 'moment';
import DatePicker from 'react-datepicker';
import route from 'riot-route';

import { JournalState, dispatch } from '../journal/state';
import { OcticonClock, OcticonTextSize, OcticonTag } from '../common/octicons';

export type ChronoLink = {
  Date: string;
  Count: number;
  Sub: ReadonlyArray<ChronoLink>;
  Link: string;
};

export type SidebarState = {
  mounted: boolean;
  TagLinks: ReadonlyArray<{Name: string, Count: string}>;
  ChronoLinks: ReadonlyArray<ChronoLink>;
  NameLinks: ReadonlyArray<{Name: string}>;

  // Navigations
  tag?: string;
};

/** Sidebar. Contains convenient navigation methods. */
export const JournalSidebar = connect()(class extends React.Component<JournalState> {
  /** Render tag navigation links */
  renderTags() {
    if (this.props.sidebar.TagLinks === null) {
      return <p>No tagged entries found.</p>;
    }

    const selectedTag = this.props.route === 'VIEW_TAG' ? this.props.tag : '';

    return <div className="menu">
      {this.props.sidebar.TagLinks.map((l, i) =>
        <div className={`${selectedTag === l.Name ? 'selected' : ''}
          menu-item pt-0 pb-0`} key={i}>
          <a href={`#tag/${l.Name}`}>#{l.Name} <span className="counter">({l.Count})</span></a>
        </div>)}
    </div>;
  }

  /** Render alphabetical navigation links */
  renderAlphabetically() {
    if (this.props.sidebar.ChronoLinks === null) {
      return <p>No alphabetical links yet; have you titled any journal entries?</p>;
    }
    // This code converts a list of strings like this

    // Notes: Chemistry
    // Notes: Physics

    // Into a tree, based off of colon separators

    // Originally written in JS for simplicity's sake and not properly
    // type-annotated because I'm tired

    if (!this.props.sidebar.NameLinks) {
      return <p>No named entries found.</p>;
    }

    const table: any = {};
    for (const link of this.props.sidebar.NameLinks) {
      const elts = link.Name.split(':').map(x => x.trim());
      let tableRef: any = table;
      let last: any = null;
      for (const elt of elts) {
        if (tableRef[elt] === undefined) {
          tableRef[elt] = {};
          tableRef[elt].title = elt;
        }
        tableRef = tableRef[elt];
        last = elt;
      }
      tableRef.link = link.Name;
    }

    const convertTable = (table: any) => {
      const keys: string[] = Object.keys(table).filter(k => k !== 'title' && k !== 'link');
      const obj: any = {};
      if (table.title) obj.title = table.title;
      if (table.link) obj.href = `#name/${table.link}`;
      if (keys.length > 0) obj.children = keys.map(k => convertTable(table[k]));
      return obj;
    };

    const tree = (convertTable(table).children) as LinkTreeNode[];

    return <LinkTree data={tree} />;
  }

  /** Render chronological navigation links */
  renderChronologically() {
    if (!this.props.sidebar.ChronoLinks || this.props.sidebar.ChronoLinks.length === 0) {
      return <p>No chronological links yet. Have you created any journal entries?</p>;
    }

    // Convert to LinkTree structure
    // TODO: No reason the Go code couldn't return this directly
    const tree = this.props.sidebar.ChronoLinks.map((y) => {
      const year: LinkTreeNode = { title: `${y.Date} (${y.Count})` };
      year.children = y.Sub.map((m) => {
        return { title: `${m.Date} (${m.Count})`, href: `#view/${m.Link}` };
      });
      return year;
    });

    return <LinkTree data={tree} />;
  }

  viewDays = (date: moment.Moment | null) => {
    if (date) {
      route(`viewdays/${date.format(DAY_FORMAT)}`);
    }
  }

  render() {
    if (this.props.sidebar && this.props.sidebar.mounted) {
      // Select tabs according to what page is currently being viewed (e.g. view tabs tag if the
      // user is viewing a tab and so on)
      const defaultTab = {
        VIEW_SEARCH: 0, VIEW_TAG: 2, VIEW_NAMED_ENTRY: 1, VIEW_MONTH: 0, VIEW_DAYS: 0,
     }[this.props.route];

      return <div>
        <DatePicker
          className="form-control mb-1"
          onChange={this.viewDays}
          isClearable={true}
          placeholderText={'View all posts from day'}
          openToDate={(this.props.route === 'VIEW_DAYS' || this.props.route === 'VIEW_MONTH') ?
            this.props.date :  moment()}
          />

        <Tabs defaultIndex={defaultTab}>

          <TabList>
            <Tab><OcticonSpan icon={OcticonClock} />Time</Tab>
            <Tab><OcticonSpan icon={OcticonTextSize} />Title</Tab>
            <Tab><OcticonSpan icon={OcticonTag} />Tag</Tab>
          </TabList>

          <TabPanel>
            {this.renderChronologically()}
          </TabPanel>
          <TabPanel forceRender={true}>
            {this.renderAlphabetically()}
          </TabPanel>
          <TabPanel>
            {this.renderTags()}
          </TabPanel>
        </Tabs>
        </div>;
    }
    return <Spinner />;
  }
},
);
