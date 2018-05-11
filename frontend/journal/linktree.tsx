// linktree.tsx - implementation of an expandable tree of links
import * as React from 'react';
import { OcticonButton } from '../common/components';

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
    super(props);
    // Deep copy of data
    this.state = { data: JSON.parse(JSON.stringify(props.data)) };
  }

  componentWillReceiveProps(nextProps: LinkTreeProps) {
    this.setState({
      data: JSON.parse(JSON.stringify(nextProps.data)),
    });
  }

  toggleNode(e: React.MouseEvent<HTMLElement>, node: LinkTreeNode) {
    e.preventDefault();
    node.expanded = !node.expanded;
    this.setState({ data: this.state.data });
  }

  renderNode(node: LinkTreeNode, i: number): React.ReactElement<undefined> {
    const classes = node.children ? 'link-tree-parent' : '';
    return <div className={`pt-0 pb-0 ${classes} link-tree-node`}
        key={i}>
      <div className="">
      {node.children && 
        <OcticonButton name={node.expanded ? 'arrow-down' : 'arrow-right'}
          className="link-tree-node-btn"
          onClick={e => e && this.toggleNode(e, node)} />
      }
      {node.href ? 
          <a href={node.href}
            style={{ textDecoration: node.children ? 'underline' : 'none' }}          
            >{node.title}</a>
         : <a className="link-tree-node-anchor"
              onClick={e => this.toggleNode(e, node)}>{node.title}</a>}
      </div>
      {node.expanded === true && 
         node.children && node.children.map((n, i) => this.renderNode(n, i))}
    </div>;
  }

  render() {
    return <div className="link-tree-top">{this.state.data.map((node, i) => {
      return this.renderNode(node, i);
    })}</div>;
  }
}

export default LinkTree;
