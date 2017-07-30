import * as React from 'react';
import { TabPanel, Tab, TabList, Tabs } from 'react-tabs';
import { connect } from 'react-redux';

import { Spinner } from './common';
import LinkTree, { LinkTreeNode } from './linktree';

import { JournalState } from './journal';

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
export const JournalSidebar = connect((state) => { return state; })(
  class extends React.Component<JournalState, {}> {
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
      if (this.props.sidebar.ChronoLinks.length === 0) {
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
    
    render() {
      if (this.props.sidebar && this.props.sidebar.mounted) {
        const defaultTab = { VIEW_TAG: 2, VIEW_NAMED_ENTRY: 1, VIEW_MONTH: 0 }[this.props.route];
        return <Tabs defaultIndex={defaultTab}>
            <TabList>
              <Tab><span className="octicon octicon-clock" />Time</Tab>
              <Tab><span className="octicon octicon-text-size" />Title</Tab>
              <Tab><span className="octicon octicon-tag" />Tag</Tab>
            </TabList>
            
            <TabPanel>
              {this.renderChronologically()}
            </TabPanel>
            <TabPanel>
              {this.renderAlphabetically()}
            </TabPanel>
            <TabPanel>
              {this.renderTags()}
            </TabPanel>
          </Tabs>;
      } else {
        return <Spinner />;
      }
    }
  },
);
