import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig
} from "graphql";
export type Maybe<T> = T | null;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The `Upload` scalar type represents a file upload. */
  Upload: any;
};

export type AddTaskEvent = {
  __typename?: "AddTaskEvent";
  sessionId: Scalars["String"];
  newTask: Task;
};

export enum CacheControlScope {
  Public = "PUBLIC",
  Private = "PRIVATE"
}

export type InputTaskCycleStatus = {
  id: Scalars["Int"];
  status: Scalars["Int"];
};

export type InputTaskMinutes = {
  id: Scalars["Int"];
  scope?: Maybe<Scalars["Int"]>;
  minutes?: Maybe<Scalars["Int"]>;
};

export type InputTaskNew = {
  name: Scalars["String"];
  date: Scalars["String"];
  scope: Scalars["Int"];
};

export type InputTaskPosition = {
  id: Scalars["Int"];
  date: Scalars["String"];
  position: Scalars["Int"];
};

export type Mutation = {
  __typename?: "Mutation";
  updateTask?: Maybe<UpdatedTasksEvent>;
  addTask?: Maybe<AddTaskEvent>;
  updateTaskMinutes?: Maybe<UpdatedTasksEvent>;
  updateTaskStatus?: Maybe<UpdatedTasksEvent>;
  updateTaskPosition?: Maybe<TaskPositionEvent>;
};

export type MutationUpdateTaskArgs = {
  input: InputTaskMinutes;
};

export type MutationAddTaskArgs = {
  input: InputTaskNew;
};

export type MutationUpdateTaskMinutesArgs = {
  input: InputTaskMinutes;
};

export type MutationUpdateTaskStatusArgs = {
  input: InputTaskCycleStatus;
};

export type MutationUpdateTaskPositionArgs = {
  input: InputTaskPosition;
};

export type Query = {
  __typename?: "Query";
  tasks?: Maybe<Array<Maybe<Task>>>;
  tasksByDate?: Maybe<TasksByDateResponse>;
};

export type QueryTasksByDateArgs = {
  date: Scalars["String"];
  includeYear: Scalars["Boolean"];
};

export type Subscription = {
  __typename?: "Subscription";
  taskEvents?: Maybe<UpdatedTasksEvent>;
  addTask?: Maybe<AddTaskEvent>;
  taskPosition?: Maybe<TaskPositionEvent>;
};

export type Task = {
  __typename?: "Task";
  id: Scalars["Int"];
  name: Scalars["String"];
  created_at: Scalars["String"];
  updated_at?: Maybe<Scalars["String"]>;
  date: Scalars["String"];
  status: Scalars["Int"];
  scope: Scalars["Int"];
  position: Scalars["Int"];
  minutes?: Maybe<Scalars["Int"]>;
  comment?: Maybe<Scalars["String"]>;
  total_tasks?: Maybe<Scalars["Int"]>;
  completed_tasks?: Maybe<Scalars["Int"]>;
  total_minutes?: Maybe<Scalars["Int"]>;
};

export type TaskPosition = {
  __typename?: "TaskPosition";
  id: Scalars["Int"];
  task: Task;
  oldPosition: Scalars["Int"];
  oldDate: Scalars["String"];
  newPosition: Scalars["Int"];
  newDate: Scalars["String"];
};

export type TaskPositionEvent = {
  __typename?: "TaskPositionEvent";
  sessionId: Scalars["String"];
  taskPosition: TaskPosition;
};

export type TasksByDateResponse = {
  __typename?: "TasksByDateResponse";
  Days?: Maybe<Array<Maybe<Task>>>;
  Month?: Maybe<Array<Maybe<Task>>>;
  Year?: Maybe<Array<Maybe<Task>>>;
};

export enum TaskScope {
  Day = "DAY",
  Month = "MONTH",
  Year = "YEAR"
}

export type UpdatedOrderEvent = {
  __typename?: "UpdatedOrderEvent";
  sessionId: Scalars["String"];
  updates?: Maybe<Array<Maybe<UpdatedTaskOrder>>>;
};

export type UpdatedTaskOrder = {
  __typename?: "UpdatedTaskOrder";
  id: Scalars["String"];
  date: Scalars["String"];
  position: Scalars["Int"];
};

export type UpdatedTasksEvent = {
  __typename?: "UpdatedTasksEvent";
  sessionId: Scalars["String"];
  updatedTasks: Array<Task>;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type StitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, TParent, TContext, TArgs>;
}

export type SubscriptionResolver<
  TResult,
  TParent = {},
  TContext = {},
  TArgs = {}
> =
  | ((
      ...args: any[]
    ) => SubscriptionResolverObject<TResult, TParent, TContext, TArgs>)
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {}
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Query: ResolverTypeWrapper<{}>;
  Task: ResolverTypeWrapper<Task>;
  Int: ResolverTypeWrapper<Scalars["Int"]>;
  String: ResolverTypeWrapper<Scalars["String"]>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]>;
  TasksByDateResponse: ResolverTypeWrapper<TasksByDateResponse>;
  Mutation: ResolverTypeWrapper<{}>;
  InputTaskMinutes: InputTaskMinutes;
  UpdatedTasksEvent: ResolverTypeWrapper<UpdatedTasksEvent>;
  InputTaskNew: InputTaskNew;
  AddTaskEvent: ResolverTypeWrapper<AddTaskEvent>;
  InputTaskCycleStatus: InputTaskCycleStatus;
  InputTaskPosition: InputTaskPosition;
  TaskPositionEvent: ResolverTypeWrapper<TaskPositionEvent>;
  TaskPosition: ResolverTypeWrapper<TaskPosition>;
  Subscription: ResolverTypeWrapper<{}>;
  CacheControlScope: CacheControlScope;
  TaskScope: TaskScope;
  UpdatedOrderEvent: ResolverTypeWrapper<UpdatedOrderEvent>;
  UpdatedTaskOrder: ResolverTypeWrapper<UpdatedTaskOrder>;
  Upload: ResolverTypeWrapper<Scalars["Upload"]>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Query: {};
  Task: Task;
  Int: Scalars["Int"];
  String: Scalars["String"];
  Boolean: Scalars["Boolean"];
  TasksByDateResponse: TasksByDateResponse;
  Mutation: {};
  InputTaskMinutes: InputTaskMinutes;
  UpdatedTasksEvent: UpdatedTasksEvent;
  InputTaskNew: InputTaskNew;
  AddTaskEvent: AddTaskEvent;
  InputTaskCycleStatus: InputTaskCycleStatus;
  InputTaskPosition: InputTaskPosition;
  TaskPositionEvent: TaskPositionEvent;
  TaskPosition: TaskPosition;
  Subscription: {};
  CacheControlScope: CacheControlScope;
  TaskScope: TaskScope;
  UpdatedOrderEvent: UpdatedOrderEvent;
  UpdatedTaskOrder: UpdatedTaskOrder;
  Upload: Scalars["Upload"];
};

export type CacheControlDirectiveResolver<
  Result,
  Parent,
  ContextType = any,
  Args = {
    maxAge?: Maybe<Maybe<Scalars["Int"]>>;
    scope?: Maybe<Maybe<CacheControlScope>>;
  }
> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AddTaskEventResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["AddTaskEvent"]
> = {
  sessionId?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  newTask?: Resolver<ResolversTypes["Task"], ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["Mutation"]
> = {
  updateTask?: Resolver<
    Maybe<ResolversTypes["UpdatedTasksEvent"]>,
    ParentType,
    ContextType,
    MutationUpdateTaskArgs
  >;
  addTask?: Resolver<
    Maybe<ResolversTypes["AddTaskEvent"]>,
    ParentType,
    ContextType,
    MutationAddTaskArgs
  >;
  updateTaskMinutes?: Resolver<
    Maybe<ResolversTypes["UpdatedTasksEvent"]>,
    ParentType,
    ContextType,
    MutationUpdateTaskMinutesArgs
  >;
  updateTaskStatus?: Resolver<
    Maybe<ResolversTypes["UpdatedTasksEvent"]>,
    ParentType,
    ContextType,
    MutationUpdateTaskStatusArgs
  >;
  updateTaskPosition?: Resolver<
    Maybe<ResolversTypes["TaskPositionEvent"]>,
    ParentType,
    ContextType,
    MutationUpdateTaskPositionArgs
  >;
};

export type QueryResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["Query"]
> = {
  tasks?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Task"]>>>,
    ParentType,
    ContextType
  >;
  tasksByDate?: Resolver<
    Maybe<ResolversTypes["TasksByDateResponse"]>,
    ParentType,
    ContextType,
    QueryTasksByDateArgs
  >;
};

export type SubscriptionResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["Subscription"]
> = {
  taskEvents?: SubscriptionResolver<
    Maybe<ResolversTypes["UpdatedTasksEvent"]>,
    ParentType,
    ContextType
  >;
  addTask?: SubscriptionResolver<
    Maybe<ResolversTypes["AddTaskEvent"]>,
    ParentType,
    ContextType
  >;
  taskPosition?: SubscriptionResolver<
    Maybe<ResolversTypes["TaskPositionEvent"]>,
    ParentType,
    ContextType
  >;
};

export type TaskResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["Task"]
> = {
  id?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  updated_at?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  date?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  status?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  scope?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  position?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  minutes?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  comment?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  total_tasks?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  completed_tasks?: Resolver<
    Maybe<ResolversTypes["Int"]>,
    ParentType,
    ContextType
  >;
  total_minutes?: Resolver<
    Maybe<ResolversTypes["Int"]>,
    ParentType,
    ContextType
  >;
};

export type TaskPositionResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["TaskPosition"]
> = {
  id?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  task?: Resolver<ResolversTypes["Task"], ParentType, ContextType>;
  oldPosition?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  oldDate?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  newPosition?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  newDate?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
};

export type TaskPositionEventResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["TaskPositionEvent"]
> = {
  sessionId?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  taskPosition?: Resolver<
    ResolversTypes["TaskPosition"],
    ParentType,
    ContextType
  >;
};

export type TasksByDateResponseResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["TasksByDateResponse"]
> = {
  Days?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Task"]>>>,
    ParentType,
    ContextType
  >;
  Month?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Task"]>>>,
    ParentType,
    ContextType
  >;
  Year?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Task"]>>>,
    ParentType,
    ContextType
  >;
};

export type UpdatedOrderEventResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["UpdatedOrderEvent"]
> = {
  sessionId?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  updates?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["UpdatedTaskOrder"]>>>,
    ParentType,
    ContextType
  >;
};

export type UpdatedTaskOrderResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["UpdatedTaskOrder"]
> = {
  id?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  date?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  position?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
};

export type UpdatedTasksEventResolvers<
  ContextType = any,
  ParentType = ResolversParentTypes["UpdatedTasksEvent"]
> = {
  sessionId?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  updatedTasks?: Resolver<
    Array<ResolversTypes["Task"]>,
    ParentType,
    ContextType
  >;
};

export interface UploadScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes["Upload"], any> {
  name: "Upload";
}

export type Resolvers<ContextType = any> = {
  AddTaskEvent?: AddTaskEventResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  TaskPosition?: TaskPositionResolvers<ContextType>;
  TaskPositionEvent?: TaskPositionEventResolvers<ContextType>;
  TasksByDateResponse?: TasksByDateResponseResolvers<ContextType>;
  UpdatedOrderEvent?: UpdatedOrderEventResolvers<ContextType>;
  UpdatedTaskOrder?: UpdatedTaskOrderResolvers<ContextType>;
  UpdatedTasksEvent?: UpdatedTasksEventResolvers<ContextType>;
  Upload?: GraphQLScalarType;
};

/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
 */
export type IResolvers<ContextType = any> = Resolvers<ContextType>;
export type DirectiveResolvers<ContextType = any> = {
  cacheControl?: CacheControlDirectiveResolver<any, any, ContextType>;
};

/**
 * @deprecated
 * Use "DirectiveResolvers" root object instead. If you wish to get "IDirectiveResolvers", add "typesPrefix: I" to your config.
 */
export type IDirectiveResolvers<ContextType = any> = DirectiveResolvers<
  ContextType
>;
