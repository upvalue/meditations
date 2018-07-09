import * as React from 'react';
import { MOBILE_WIDTH } from '../constants';

interface FormFactorProviderState {
  mobile: boolean;
}

export class FormFactorManager extends React.Component<{}, FormFactorProviderState> {
  state = {
    mobile: false,
  };

  handleScreenResize = () => {
    this.setState({
      mobile: (window.innerWidth) <= MOBILE_WIDTH,
    });
  }

  componentDidMount() {
    this.handleScreenResize();
    window.onresize = this.handleScreenResize;
  }

  render() {
    return (
      <formFactorContext.Provider value={this.state}>
        {this.props.children}
      </formFactorContext.Provider>
    );
  }
}

export const formFactorContext = React.createContext(undefined as any as FormFactorProviderState);
