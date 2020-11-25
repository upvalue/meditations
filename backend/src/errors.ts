import { ApolloError } from "apollo-server-express";


export class NotFoundError extends ApolloError {
  constructor(message: string, properties?: { [key: string]: any }) {
    super(message, "NOT_FOUND", properties);
    Object.defineProperty(this, "name", { value: 'NotFound' });
  }
}

export class DatabaseError extends ApolloError {
  constructor(message: string, properties?: { [key: string]: any }) {
    super(message, "DATABASE", properties);
    Object.defineProperty(this, "name", { value: 'Database' });
  }
}

/**
 * Error 
 */
export class InvariantError extends ApolloError {
  constructor(message: string, properties?: { [key: string]: any }) {
    super(message, "INVARIANT", properties);
    Object.defineProperty(this, "name", { value: 'Invariant' });
  }
}