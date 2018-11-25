
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import classNames from 'classnames';
import { tasksByDate, TasksByDateRequest, TaskStatus, cycleTaskStatus } from '../api';

import { MdChevronLeft, MdArrowBack, MdChevronRight, MdArrowForward } from 'react-icons/md';
import { HeaderIconButton } from '../Header';
import { View, Button } from '@upvalueio/third-coast';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { MdCheckCircle } from 'react-icons/md';
import { HabitsMain } from './HabitsMain';

export interface HabitsPageProps extends RouteComponentProps { }

export const HabitsPage = (props: HabitsPageProps) => {
  return (
    <>
      <DragDropContext
        onDragEnd={e => console.log('hot dog')}
      >
        <View flex="flex-column" style={{ width: '26em', minWidth: '26em' }}>
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

        <HabitsMain />

      </DragDropContext>
    </>
  );
};
