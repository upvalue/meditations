
import React from 'react';
import { RouteComponentProps } from '@reach/router';

import { MdChevronLeft, MdArrowBack, MdChevronRight, MdArrowForward } from 'react-icons/md';
import { HeaderIconButton } from '../Header';
import { View, Button } from '@upvalueio/third-coast';

export interface HabitsPageProps extends RouteComponentProps { }

export const HabitsPage = (props: HabitsPageProps) => {
  return (
    <>
      <View flex="flex-column" style={{ width: '20em' }}>
        <View className="sidebar" flex={['flex-column', 'flex-auto']}>
          <div className="flex justify-between items-center">
            <div className="flex">
              {/* What this needs is a double arrow like a VHS rewind */}
              <HeaderIconButton icon={MdChevronLeft} />
              <HeaderIconButton icon={MdArrowBack} />
            </div>

            <div
              className="flex-auto"
              style={{ textAlign: 'center' }}
            >
              <h3 className="m0">
                December 2018
              </h3>
            </div>

            <div className="flex">
              <HeaderIconButton icon={MdArrowForward} />
              <HeaderIconButton icon={MdChevronRight} />
            </div>

          </div>
          <span>some other controls or whatever</span>
        </View>
      </View>

      <div className="ml3 pt3">
        <div className="raised">
          <h4 className="m0">Sunday 18th</h4>

          <div className="mt3">
            <Button intent="secondary">
              Diet 15/18 (83%)
            </Button>
            <p className="mt1">This is a comment about something.</p>
          </div>
          <div className="mt2">
            <Button intent="secondary">
              Exercise 1/10 (10%)
            </Button>
          </div>
        </div>

        <div>
          monthly scope
        </div>
      </div>
    </>
  );
};
