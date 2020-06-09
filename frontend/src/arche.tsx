/*
 * arche is a single-file React component library. It is intended to be copied (or symlinked)
 * directly into projects.
 */

import { createElement } from 'react';

/**
 * Converts an array to space-separated strings, if it is an array.
 * Used for example for padding 'p1' => 'a-p1', ['px1', 'py2'] => 'a-px1 a-py2'
 */
export const arrayToString = (x: ReadonlyArray<string> | string | undefined, prepend?: string) =>
  Array.isArray(x) ?
    (prepend ? x.map(x => `${prepend}-${x}`) : x).join(' ') : ((prepend && x) ? `${prepend}-${x}` : x);

const buildClassNames = (className: string, props: any) => {
  const classNames = [
    className,
    props.flex && arrayToString(props.flex),
    props.margin && arrayToString(props.margin),
  ];

  return classNames.join(' ');
}

const excludeProps: { [key: string]: true } = {
  children: true,
  flex: true,
}

/**
 * Creates an atomic element, passing through any props 
 * (except typed styling props)
 * @param elementType type of element (button, div etc)
 * @param className classnames to always pass to classname
 * @param props props of element
 */
const createAtom = (elementType: string, className: string, props: any) => {
  const nonStylePropsKeys = Object.keys(props);
  const nonStyleProps: any = {};

  nonStylePropsKeys.forEach(k => {
    if (excludeProps[k]) return;
    nonStyleProps[k] = props[k];
  });

  return createElement(elementType, {
    ...nonStyleProps,
    className: buildClassNames(className, props),
  }, props.children);
}

type FlexConstants = 'justify-center';
type PaddingConstants = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'pl1' | 'pl2' | 'pl3' | 'pl4' | 'pl5' | 'pr1' | 'pr2' | 'pr3' | 'pr4' | 'pr5' | 'pt1' | 'pt2' | 'pt3' | 'pt4' | 'pt5' | 'pb1' | 'pb2' | 'pb3' | 'pb4' | 'pb5' | 'px1' | 'px2' | 'px3' | 'px4' | 'px5' | 'py1' | 'py2' | 'py3' | 'py4' | 'py5';
type MarginConstants = 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'ml1' | 'ml2' | 'ml3' | 'ml4' | 'ml5' | 'mr1' | 'mr2' | 'mr3' | 'mr4' | 'mr5' | 'mt1' | 'mt2' | 'mt3' | 'mt4' | 'mt5' | 'mb1' | 'mb2' | 'mb3' | 'mb4' | 'mb5' | 'mx1' | 'mx2' | 'mx3' | 'mx4' | 'mx5' | 'my1' | 'my2' | 'my3' | 'my4' | 'my5';

type FlexProps = FlexConstants | ReadonlyArray<FlexConstants>;
type PaddingProps = PaddingConstants | ReadonlyArray<PaddingConstants>;
type MarginProps = MarginConstants | ReadonlyArray<MarginConstants>;

type AtomProps = {
  flex?: FlexProps;
  padding?: PaddingProps;
  margin?: MarginProps;
}

type ButtonProps = AtomProps & React.HTMLProps<HTMLButtonElement>;

/**
 * A button
 * @param props 
 */
export const Button = (props: ButtonProps) => {
  return createAtom('button', 'a-Button a-flex a-py1 a-px2', props);
}

