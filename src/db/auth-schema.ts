import { isPostgres } from './dialect'
import * as pg from './auth-schema.pg'
import * as sqlite from './auth-schema.sqlite'

const s = isPostgres() ? pg : sqlite

export const user = s.user
export const session = s.session
export const account = s.account
export const verification = s.verification
