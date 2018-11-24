
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import classNames from 'classnames';
import api, { TasksByDateRequest } from '../api';

import { MdChevronLeft, MdArrowBack, MdChevronRight, MdArrowForward } from 'react-icons/md';
import { HeaderIconButton } from '../Header';
import { View, Button } from '@upvalueio/third-coast';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { MdCheckCircle } from 'react-icons/md';

export interface HabitsPageProps extends RouteComponentProps { }

const Task = (props: any) => {
  let nameString = props.task && props.task.Name;

  if (props.task && props.task.CompletedTasks) {
    // tslint:disable-next-line
    nameString = `${nameString} ${props.task.CompletedTasks}/${props.task.TotalTasks} (${props.task.CompletionRate}%)`
  }


  return (
    <Draggable
      draggableId={props.taskId}
      index={props.index}
      type="TASK"
    >
      {(provided, _snapshot) => (
        <div
          className="Task p1 mb1"
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <div className="flex items-center justify-between">
            {/*<MdCheckCircle color={"green"} />
        <Button className="ml2" style={{ display: 'inline' }}>
          &nbsp;{props.children}
  </Button>*/}
            <Button
              className="" style={{ display: 'inline' }}
            >
              {props.children}
              {nameString}
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
              {!props.tasks &&
                <>
                  <Task taskId={`${props.name}-0`} index={0}>Exercise 1/10 (10%)</Task>
                  <Task taskId={`${props.name}-1`} index={1}> Diet 15/18 (83%)</Task>
                  <Task taskId={`${props.name}-2`} index={2} comment={true}>Feed the lawn</Task>
                  <Task taskId={`${props.name}-3`} index={3}>Mow the cat</Task>
                  <Task taskId={`${props.name}-4`} index={4}>Something</Task>
                  <Task taskId={`${props.name}-5`} index={5}>Whatever</Task>
                  <Task taskId={`${props.name}-6`} index={6} comment={true}>Thing</Task>
                  <Task taskId={`${props.name}-7`} index={7}>Some other type of thing</Task>
                  <Task taskId={`${props.name}-7`} index={7}>There is both rhyme and reason</Task>
                </>
              }

              {props.tasks && props.tasks.map((task: any, i: number) => (
                <Task
                  key={task.ID}
                  taskId={task.ID}
                  index={i}
                  task={task}
                />
              ))}

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

const ScopeContainer = (props: any) => {
  return (
    <Scope {...props} />
  );
}

export const HabitsMain = () => {
  let [tasks, setTasks] = useState<TasksByDateRequest | null>(null);

  useEffect(() => {
    const promise = api.tasksByDate('2018-11-23', ['DAYS', 'MONTH', 'YEAR']);
    promise.then(res => {
      setTasks(res);
    });
  }, []);

  return (
    <main className="ml3 flex-auto mt3">
      <View className="higher-scopes" flex={[]}>
        <ScopeContainer name="Nov 20" className="mr2" />
        <ScopeContainer className="mr2" style={{ width: '33%' }} tasks={tasks && tasks.tasksByDate.Month} />
        <ScopeContainer name="2018" className="mr2" style={{ width: '33%' }} />
        <ScopeContainer name="Project" className="mr2" style={{ width: '33%' }} />
      </View>
    </main>
  );
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

        <HabitsMain />

      </DragDropContext>
    </>
  );
};
