import { isPostgres } from './dialect'
import * as authSchemaPg from './auth-schema.pg'
import * as authSchemaSqlite from './auth-schema.sqlite'
import * as schemaPg from './schema.pg'
import * as schemaSqlite from './schema.sqlite'

export const businessSchema = isPostgres() ? schemaPg : schemaSqlite
export const authSchema = isPostgres() ? authSchemaPg : authSchemaSqlite

export const fullSchema = { ...businessSchema, ...authSchema }
