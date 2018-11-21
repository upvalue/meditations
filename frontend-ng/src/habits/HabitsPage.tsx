
import React from 'react';
import { RouteComponentProps } from '@reach/router';
import classNames from 'classnames';

import { MdChevronLeft, MdArrowBack, MdChevronRight, MdArrowForward } from 'react-icons/md';
import { HeaderIconButton } from '../Header';
import { View, Button } from '@upvalueio/third-coast';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { MdCheckCircle } from 'react-icons/md';


export interface HabitsPageProps extends RouteComponentProps { }

const Task = (props: any) => {
  return (
    <Draggable
      draggableId={props.taskId}
      index={props.index}
      type="TASK"
    >
      {(provided, snapshot) => (
        <div className="Task mb1" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
          <div className="flex items-center justify-between">
            {/*<MdCheckCircle color={"green"} />
        <Button className="ml2" style={{ display: 'inline' }}>
          &nbsp;{props.children}
  </Button>*/}
            <Button
              className="" style={{ display: 'inline' }}
            >
              {props.children}
            </Button>

            <div className="mr1">
              <MdCheckCircle />
            </div>
          </div>
          {
            props.comment &&
            <div className="Comment mt2 ml3 pb2">
              This is what a comment might look like. If it were really, really, really fwiggin long
        </div>
          }
        </div >
      )}
    </Draggable>
  );
}

const Scope = (props: any) => {
  return (
    <div className={classNames('scope', 'p2', props.className)} style={props.style}>
      <h4 className="my0 mt1 mx1 mb2">{props.name || 'November'}</h4>

      {/*<div className="Task mt3 mb1 p2">
        <Button intent="secondary">
          Diet 15/18 (83%)
        </Button>
        <p contentEditable={true}
          className="Comment mt3 ml3 mb1">This is a comment about ultimate power</p>
  </div>*/}

      <Droppable
        droppableId={props.name || 'November'}
        type="LIST"
      >
        {(provided, snapshot) => (
          <>
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <Task taskId={`${props.name}-0`} index={0}>Exercise 1/10 (10%)</Task>
              <Task taskId={`${props.name}-1`} index={1}> Diet 15/18 (83%)</Task>
              <Task taskId={`${props.name}-2`} index={2} comment={true}>Feed the lawn</Task>
              <Task taskId={`${props.name}-3`} index={3}>Mow the cat</Task>
              <Task taskId={`${props.name}-4`} index={4}>Something</Task>
              <Task taskId={`${props.name}-5`} index={5}>Whatever</Task>
              <Task taskId={`${props.name}-6`} index={6}>Thing</Task>
              {provided.placeholder}
            </div>
          </>
        )}
      </Droppable>

      <div>
        <Button minimal={true}>
          butens go here
        </Button>
      </div>
    </div>

  )
}

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

        <main className="ml3 pt3 flex-auto">
          <View flex="flex-auto">
            <Scope className="mr2" style={{ width: '33%' }} />
            <Scope name="2018" className="mr2" style={{ width: '33%' }} />
            <Scope name="Project" className="mr2" style={{ width: '33%' }} />
          </View>
        </main>
      </DragDropContext>
    </>
  );
};
