// Helper.tsx - Click on any element in the application and get help
import React, { useContext, useState } from 'react';

import classNames from 'classnames';

import './Helper.css';

interface HelperData {
  active: boolean;
  setHelperActive: (_: boolean) => void;
}

export const HelperContext = React.createContext<HelperData>(undefined as any as HelperData);

interface HelperProviderProps {
  children?: React.ReactNode;
}

export const HelperProvider = (props: HelperProviderProps) => {
  const [active, setHelperActive] = useState<boolean>(false);

  const helperData = { active, setHelperActive };

  return (
    <HelperContext.Provider value={helperData}>
      
      <div className={classNames('flex flex-column flex-auto', active && 'helper-active')}>
        {props.children}
      </div>
    </HelperContext.Provider >
  );
}


interface HelperWrappingProps {
  children?: React.ReactNode;
}


/*
 * Returns a component to wrap help-able items 
 */
export const useHelper = (message: string) => {
  const helperData = useContext(HelperContext);

  if (!helperData.active) return React.Fragment;

  const helpAndDisable = () => {
    console.log(message);
    helperData.setHelperActive(false);
  }

  return (props: HelperWrappingProps) => {
    return (
      <div style={{ display: 'inline', outline: '1' }} onClickCapture={helpAndDisable}>
        {props.children}
      </div>
    );
  }
}
