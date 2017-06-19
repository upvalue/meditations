import * as React from 'react';
import { TabPanel, Tab, TabList, Tabs } from 'react-tabs';
import { connect } from 'react-redux';


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
    componentWillMount() {
      const tree = [{ title: 'Chicken', children: [{ title: 'Egg' }] }];
      this.setState({ data: tree });
    }

    /** Render tag navigation links */
    renderTags() {
      return this.props.TagLinks.map((l, i) => 
        <div key={i}><a href={`#tag/${l.Name}`}>#{l.Name} ({l.Count})</a></div>)
    }
    
    /** Render alphabetical navigation links */
    renderAlphabetically() {
      return this.props.NameLinks.map((l, i) => 
        <div key={i}><a href={`#name/${l.Name}`}>{l.Name}</a></div>);
    }
    
    /** Render chronological navigation links */
    renderChronologically() {
      let key = 0;
      const years: JSX.Element[] = [];
      for (const year of this.props.ChronoLinks) {
        const months: JSX.Element[] = [];
        for (const month of year.Sub) {
          key += 1;
          months.push(
            <li key={key}><a href={`#view/${month.Link}`}>{month.Date} ({month.Count})</a></li>
           );
        }
        key += 1;
        years.push(
          <li key={key}>
            <a href={`#chrono-nav-${year.Date}`} data-toggle="collapse"
               aria-expanded="false" aria-controls={`chrono-nav-${year.Date}`}>
               {year.Date} ({year.Count})
            </a>
          </li>);
        key += 1;
        years.push(
          <ul key={key} id={`chrono-nav-${year.Date}`} className="navigation-list collapse">
            {months}            
          </ul>);
      }
      return <ul className="navigation-list">{years}</ul>;
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
        return <span>Loading sidebar...</span>;
      }
    }
  },
);
