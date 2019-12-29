// components.tsx - Common components
import * as React from "react";

import { OcticonData } from "../octicons";

interface OcticonButtonProps {
  icon: OcticonData;
  title?: string;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  /** Tooltip text */
  tooltip?: string;
  /** Tooltip direction, default w */
  tooltipDirection?: string;
  /** Additional classes to apply */
  className?: string;

  normalButton?: boolean;
  children?: any;

  /** Href for a link, if given */
  href?: string;
  /** If true, just a span, not a button */
  span?: boolean;
}

/**
 * A muted Octicon button. Also used to implement octicon spans.
 */
export const OcticonButton: React.SFC<OcticonButtonProps> = (
  props: OcticonButtonProps
) => {
  const {
    children,
    icon,
    onClick,
    href,
    tooltip,
    normalButton,
    tooltipDirection,
    className,
    span,
    title
  } = props;
  let klassName = `${span ? " " : "btn "} ${className} `;

  if (tooltip) {
    klassName = `${klassName} tooltipped tooltipped-${tooltipDirection}`;
  }

  if (!normalButton) {
    klassName = `${klassName} btn-octicon`;
  }

  return React.createElement(
    span ? "span" : "a",
    {
      href,
      title,
      onClick,
      className: klassName,
      "aria-label": tooltip
    },
    <>
      <svg
        className="octicon-svg"
        width={icon.width}
        height={icon.height}
        viewBox={icon.viewBox}
      >
        {icon.pathRender()}
      </svg>
      {children}
    </>
  );
};

/**
 * A muted, non-clickable Octicon.
 */
export const OcticonSpan: React.SFC<OcticonButtonProps> = props => (
  <OcticonButton {...props} span={true} />
);

OcticonButton.defaultProps = {
  tooltip: undefined,
  tooltipDirection: "w",
  className: "",
  normalButton: false
};
