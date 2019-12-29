// linktree.tsx - implementation of an expandable tree of links
import * as React from "react";

import { OcticonButton } from "../../common/components/OcticonButton";
import { OcticonArrowRight, OcticonArrowDown } from "../../common/octicons";

export interface LinkTreeNode {
  title: string;
  href?: string;
  children?: LinkTreeNode[];
}

interface LinkTreeItemProps {
  node: LinkTreeNode;
}

interface LinkTreeItemState {
  expanded: boolean;
}

class LinkTreeItem extends React.Component<
  LinkTreeItemProps,
  LinkTreeItemState
  > {
  constructor(props: { node: LinkTreeNode }) {
    super(props);

    this.state = {
      expanded: false
    };
  }

  toggleNode = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  };

  render(): any {
    return (
      <div className="pt-0 pb-0 link-tree-node">
        {this.props.node.children && (
          <OcticonButton
            icon={this.state.expanded ? OcticonArrowDown : OcticonArrowRight}
            className="link-tree-node-btn"
            onClick={e => e && this.toggleNode()}
          />
        )}

        {this.props.node.href ? (
          <a
            href={this.props.node.href}
            style={{
              textDecoration: this.props.children ? "underline" : "none"
            }}
          >
            {this.props.node.title}
          </a>
        ) : (
            <a className="link-tree-node-anchor" onClick={e => this.toggleNode()}>
              {this.props.node.title}
            </a>
          )}

        {this.state.expanded &&
          this.props.node.children &&
          this.props.node.children.map((n, i) => {
            return <LinkTreeItem node={n} key={i} />;
          })}
      </div>
    );
  }
}

export interface LinkTreeProps {
  data: LinkTreeNode[];
}

export interface LinkTreeState {
  data: LinkTreeNode[];
}

/** An expandable tree of links */
export class LinkTree extends React.Component<LinkTreeProps, LinkTreeState> {
  render() {
    return (
      <div className="link-tree-top">
        {this.props.data.map((node, i) => (
          <LinkTreeItem node={node} key={i} />
        ))}
      </div>
    );
  }
}
