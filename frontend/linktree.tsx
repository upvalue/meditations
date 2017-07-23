
import * as React from 'react';

export interface LinkTreeNode {
  title: string;
  href?: string;
  expanded? : boolean;
  children?: LinkTreeNode[];
}

export interface LinkTreeProps {
  data: LinkTreeNode[];
}

export interface LinkTreeState {
  data: LinkTreeNode[];
}

/** An expandable tree of links */
export class LinkTree extends React.Component<LinkTreeProps, LinkTreeState> {
  constructor(props: LinkTreeProps) {
    super();
    // Deep copy of data
    this.state = { data: JSON.parse(JSON.stringify(props.data)) };
  }

  toggleNode(e: React.MouseEvent<HTMLElement>, node: LinkTreeNode) {
    e.preventDefault();
    node.expanded = !node.expanded;
    this.setState({ data: this.state.data });
  }

  renderNode(node: LinkTreeNode, i: number): React.ReactElement<undefined> {
    const classes = node.children ? 'menu mb-0' : '';
    return <div className={`menu-item ${classes}`}
        key={i}>
      {node.children && 
        <button
          className={`link-tree-node-btn btn btn-link btn-xs octicon
            octicon-chevron-${node.expanded ? 'down' : 'right'}`}
          onClick={e => this.toggleNode(e, node)} >
        </button>
      }
      {node.href ? 
         <a href={node.href}>{node.title}</a>
         : <a className="link-tree-node-anchor"
              onClick={e => this.toggleNode(e, node)}>{node.title}</a>}
      {node.expanded === true && 
         node.children && node.children.map((n, i) => this.renderNode(n, i))}
    </div>;
  }

  render() {
    return <div className="menu">{this.state.data.map((node, i) => {
      return this.renderNode(node, i);
    })}</div>;
  }
}

export default LinkTree;
