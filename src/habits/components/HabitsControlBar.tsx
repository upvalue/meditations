import * as React from "react";
import moment from "moment";
import * as Mousetrap from "mousetrap";

import { routeForView } from "../main";
import { dispatch, HabitsState } from "../state";
import DatePicker from "react-datepicker";

import * as common from "../../common";
import { KEYSEQ_FILTER_FOCUS } from "../../common/constants";
import { TimeNavigator } from "../../common/components/TimeNavigator";

/**
 * Common user interface controls: task filtering and time-based navigation
 */
export class HabitsControlBar extends React.PureComponent<HabitsState> {
  filterByNameElement!: HTMLInputElement | null;

  componentDidMount() {
    Mousetrap.bind(KEYSEQ_FILTER_FOCUS, () => {
      if (this.filterByNameElement) {
        this.filterByNameElement.focus();
      }
      return false;
    });
  }

  componentWillUnmount() {
    Mousetrap.unbind(KEYSEQ_FILTER_FOCUS);
  }

  /** Callback that gives page-appropriate routes to TimeNavigator */
  navigatorRoute = (
    method: "add" | "subtract" | "reset",
    unit?: "month" | "year" | "day"
  ) => {
    if (method === "reset") {
      return routeForView(moment(), this.props.currentProject);
    } else if (unit) {
      // tslint:disable-line
      const ndate = this.props.currentDate.clone()[method](1, unit);
      return routeForView(ndate, this.props.currentProject);
    }
  };

  navigate = (method: "add" | "subtract", unit: "month" | "year") => {
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(routeForView(ndate, this.props.currentProject));
  };

  filterByName = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ name: e.target.value, type: "FILTER_BY_NAME" });
  };

  filterByDate(end: boolean, date: moment.Moment | null) {
    if (date) {
      dispatch({ date, end, type: "FILTER_BY_DATE" });
    }
  }

  clearFilter() {
    dispatch({ type: "FILTER_CLEAR" });
  }

  exportTasks() {
    const body: any = { day: true };
    // Build up a descriptive filename along with the POST body
    let filename = "";

    // Add task name, if available
    if (this.props.filter.name) {
      body.Name = this.props.filter.name;
      filename += `-${this.props.filter.name}`;
    }

    // Add description of date, if available
    if (this.props.filter.begin) {
      body.Begin = this.props.filter.begin.format(common.DAY_FORMAT);
      filename += `-from-${this.props.filter.begin.format(common.DAY_FORMAT)}`;
    }

    if (this.props.filter.end) {
      body.End = this.props.filter.end.format(common.DAY_FORMAT);
      filename += `-to-${this.props.filter.end.format(common.DAY_FORMAT)}`;
    }

    common.post("/habits/export", body, (res: any) => {
      const elt = document.createElement("a");
      elt.setAttribute(
        "href",
        `data:text/plain;charset=utf-8,${encodeURIComponent(res.body)}`
      );
      elt.setAttribute("download", `meditations-export${filename}.txt`);
      elt.style.display = "none";
      document.body.appendChild(elt);
      elt.click();
      document.body.removeChild(elt);
    });
  }

  renderDatePicker(
    end: boolean,
    defaultPlaceholder: string,
    value?: moment.Moment | null
  ) {
    // TODO: Datepicker onClearable does not work unless a SELECTED value is also passed
    return (
      <DatePicker
        className="form-control ml-0 ml-md-1 mb-md-0 mb-1"
        onChange={date => this.filterByDate(end, date)}
        isClearable={true}
        placeholderText={defaultPlaceholder}
        value={value ? value.format(common.DAY_FORMAT) : ""}
        openToDate={this.props.currentDate}
      />
    );
  }

  render() {
    // If any filters have been entered, we'll render a clear button
    const disableButton = !(
      this.props.filter.name ||
      this.props.filter.begin ||
      this.props.filter.end
    );

    // tslint:disable-next-line
    return (
      <div
        id="controls"
        className="d-flex flex-column flex-md-row flex-items-start flex-justify-between ml-3 mr-2 mt-2 mb-2"
      >
        <TimeNavigator
          daysOnly={false}
          getRoute={this.navigatorRoute}
          currentDate={this.props.currentDate}
        />

        <div className="d-flex flex-column flex-md-row">
          <input
            type="text"
            placeholder={`Filter by name (Key: ${KEYSEQ_FILTER_FOCUS})`}
            ref={e => (this.filterByNameElement = e)}
            className="form-control mb-md-0 mb-1 ml-"
            onChange={this.filterByName}
          />

          {this.renderDatePicker(
            false,
            "Filter from...",
            this.props.filter.begin
          )}

          {this.renderDatePicker(true, "...to", this.props.filter.end)}

          <button
            disabled={disableButton}
            className="btn btn-secondary btn-block ml-0 ml-md-1 mb-md-0 mb-1"
            onClick={() => this.clearFilter()}
          >
            Clear date filter
          </button>
          <button
            disabled={disableButton}
            className="btn btn-primary btn-block ml-0 ml-md-1 mb-md-0 mb-1"
            onClick={() => this.exportTasks()}
          >
            Export selected tasks
          </button>
        </div>
      </div>
    );
  }
}
