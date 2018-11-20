
import React from 'react';
import { RouteComponentProps } from '@reach/router';
import classNames from 'classnames';

import { MdChevronLeft, MdArrowBack, MdChevronRight, MdArrowForward } from 'react-icons/md';
import { HeaderIconButton } from '../Header';
import { View, Button } from '@upvalueio/third-coast';

import { MdCheckCircle } from 'react-icons/md';


export interface HabitsPageProps extends RouteComponentProps { }

const Task = (props: any) => {
  return (
    <div className="Task mt3 mb1">
      <div className="flex items-center justify-between">
        {/*<MdCheckCircle color={"green"} />
        <Button className="ml2" style={{ display: 'inline' }}>
          &nbsp;{props.children}
  </Button>*/}
        <Button draggable={true} className="" style={{ display: 'inline' }}>
          {props.children}
        </Button>

        <div className="mr1">
          <MdCheckCircle />
        </div>
      </div>
      {props.comment &&
        <div contentEditable={true} className="Comment mt3 ml3 pb3">
          This is what a comment might look like. If it were really, really, really fwiggin long
        </div>
      }
    </div>
  );
}

const Scope = (props: any) => {
  return (
    <div className={classNames('scope', 'p2', props.className)} style={props.style}>
      <h4 className="my0 mt1 mx1">{props.name || 'November'}</h4>

      {/*<div className="Task mt3 mb1 p2">
        <Button intent="secondary">
          Diet 15/18 (83%)
        </Button>
        <p contentEditable={true}
          className="Comment mt3 ml3 mb1">This is a comment about ultimate power</p>
  </div>*/}

      <Task>Exercise 1/10 (10%)</Task>
      <Task>Diet 15/18 (83%)</Task>
      <Task>Feed the lawn</Task>
      <Task comment={true}>Mow the cat</Task>

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
      <View flex="flex-column" style={{ width: '26em' }}>
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
        <View>

        </View>
      </main>
    </>
  );
};
