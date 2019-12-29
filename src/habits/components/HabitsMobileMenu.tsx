import * as React from "react";
import DatePicker from "react-datepicker";
import * as Scroll from "react-scroll";
import { OcticonButton } from "../../common/components/OcticonButton";
import { OcticonThreeBars } from "../../common/octicons";

/**
 * A menu for easy navigation between scopes on mobile devices
 */
export class HabitsMobileMenu extends React.PureComponent<
  {},
  { opened: boolean }
> {
  constructor(props: {}) {
    super(props);
    this.state = { opened: false };
  }

  toggle() {
    this.setState({ opened: !this.state.opened });
  }

  renderLink(name: string, text: string) {
    // NOTE: activeClass doesn't work here when there are not many tasks as
    // the month/year/projects scope may fit into the screen without going past the day tasks
    return (
      <Scroll.Link
        to={name}
        smooth={true}
        duration={500}
        spy={true}
        onClick={() => this.toggle()}
        className="menu-item"
      >
        {text}
      </Scroll.Link>
    );
  }

  render() {
    return (
      <div id="mobile-menu" className="d-flex flex-column">
        <OcticonButton
          icon={OcticonThreeBars}
          tooltip="Toggle mobile menu"
          normalButton={true}
          className="flex-self-end mb-1"
          onClick={() => this.toggle()}
        />
        {this.state.opened && (
          <nav className="menu" id="mobile-menu-nav">
            {this.renderLink("scope-days", "Day")}
            {this.renderLink("scope-month", "Month")}
            {this.renderLink("scope-year", "Year")}
            {this.renderLink("scope-projects", "Projects")}
          </nav>
        )}
      </div>
    );
  }
}
