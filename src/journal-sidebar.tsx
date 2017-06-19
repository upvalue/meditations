import * as React from 'react';
import { TabPanel, Tab, TabList, Tabs } from 'react-tabs';
import { connect } from 'react-redux';

import { Spinner } from './common';
import LinkTree, { LinkTreeNode } from './linktree';

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
};

/** Sidebar. Contains convenient navigation methods. */
export const JournalSidebar = connect((state) => { return state.sidebar; })(
  class extends React.Component<SidebarState, undefined> {
    /** Render tag navigation links */
    renderTags() {
      return this.props.TagLinks.map((l, i) => 
        <div key={i}><a href={`#tag/${l.Name}`}>#{l.Name} ({l.Count})</a></div>);
    }
    
    /** Render alphabetical navigation links */
    renderAlphabetically() {
      // This code converts a list of strings like this

      // Notes: Chemistry
      // Notes: Physics

      // Into a tree, based off of colon separators

      // Originally written in JS for simplicity's sake and not properly
      // type-annotated because I'm tired

      const table: any = {};
      for (const link of this.props.NameLinks) {
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
      // Convert to LinkTree structure
      // TODO: No reason the Go code couldn't return this directly
      const tree = this.props.ChronoLinks.map((y) => {
        const year: LinkTreeNode = { title: `${y.Date} (${y.Count})` };
        year.children = y.Sub.map((m) => {
          return { title: `${m.Date} (${m.Count})`, href: `#view/${m.Link}` };
        });
        return year;
      });

      return <LinkTree data={tree} />;
    }
    
    render() {
      if (this.props.mounted) {
        return <Tabs>
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
