/** Types generated for queries found in "src/db/queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'SelectOne' parameters type */
export type ISelectOneParams = void;

/** 'SelectOne' return type */
export interface ISelectOneResult {
  one: number | null;
}

/** 'SelectOne' query type */
export interface ISelectOneQuery {
  params: ISelectOneParams;
  result: ISelectOneResult;
}

const selectOneIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT 1 as one"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 as one
 * ```
 */
export const selectOne = new PreparedQuery<ISelectOneParams,ISelectOneResult>(selectOneIR);


/** 'UpdateDocById' parameters type */
export interface IUpdateDocByIdParams {
  body?: Json | null | void;
  id?: string | null | void;
  revision?: number | null | void;
}

/** 'UpdateDocById' return type */
export type IUpdateDocByIdResult = void;

/** 'UpdateDocById' query type */
export interface IUpdateDocByIdQuery {
  params: IUpdateDocByIdParams;
  result: IUpdateDocByIdResult;
}

const updateDocByIdIR: any = {"usedParamSet":{"body":true,"revision":true,"id":true},"params":[{"name":"body","required":false,"transform":{"type":"scalar"},"locs":[{"a":23,"b":27}]},{"name":"revision","required":false,"transform":{"type":"scalar"},"locs":[{"a":41,"b":49}]},{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":84}]}],"statement":"UPDATE docs\nSET body = :body, revision = :revision, updated_at = now()\nWHERE id = :id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE docs
 * SET body = :body, revision = :revision, updated_at = now()
 * WHERE id = :id
 * ```
 */
export const updateDocById = new PreparedQuery<IUpdateDocByIdParams,IUpdateDocByIdResult>(updateDocByIdIR);


/** 'DropDocTags' parameters type */
export interface IDropDocTagsParams {
  id?: string | null | void;
}

/** 'DropDocTags' return type */
export type IDropDocTagsResult = void;

/** 'DropDocTags' query type */
export interface IDropDocTagsQuery {
  params: IDropDocTagsParams;
  result: IDropDocTagsResult;
}

const dropDocTagsIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":36,"b":38}]}],"statement":"DELETE FROM doc_tags\nWHERE doc_id = :id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM doc_tags
 * WHERE doc_id = :id
 * ```
 */
export const dropDocTags = new PreparedQuery<IDropDocTagsParams,IDropDocTagsResult>(dropDocTagsIR);


/** 'InsertDocTags' parameters type */
export interface IInsertDocTagsParams {
  doc_id?: string | null | void;
  doc_location?: string | null | void;
  tag_name?: string | null | void;
}

/** 'InsertDocTags' return type */
export type IInsertDocTagsResult = void;

/** 'InsertDocTags' query type */
export interface IInsertDocTagsQuery {
  params: IInsertDocTagsParams;
  result: IInsertDocTagsResult;
}

const insertDocTagsIR: any = {"usedParamSet":{"doc_id":true,"doc_location":true,"tag_name":true},"params":[{"name":"doc_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":68}]},{"name":"doc_location","required":false,"transform":{"type":"scalar"},"locs":[{"a":71,"b":83}]},{"name":"tag_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":94}]}],"statement":"INSERT INTO doc_tags (doc_id, doc_location, tag_name)\nVALUES (:doc_id, :doc_location, :tag_name)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO doc_tags (doc_id, doc_location, tag_name)
 * VALUES (:doc_id, :doc_location, :tag_name)
 * ```
 */
export const insertDocTags = new PreparedQuery<IInsertDocTagsParams,IInsertDocTagsResult>(insertDocTagsIR);


