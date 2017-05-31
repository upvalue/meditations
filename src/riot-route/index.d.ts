// TypeScript bindings for riot-route

// riot-route is a callable object with functions as properties
// Usage:
// import route from 'riot-route';

// route(function() { ... });
// route.start(true);

// etc

type Callback = (...args: any[]) => void;

interface RouteStatic {
  start: (autoExec?: boolean) => void;
  base: (base: string) => void;
  exec: () => void;
  stop: () => void;
  query: () => { [key: string] : string; };

  (arg1: string | Callback, arg2?: Callback): RouteStatic;
}

declare var route: RouteStatic;

declare module "riot-route" {
  export default route;
}
