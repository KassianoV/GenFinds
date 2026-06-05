import { isDesktop, isCapacitor } from '../platform'
import { desktopDatabaseService } from './desktop'
import { mobileDatabaseService } from './mobile'
import { webDatabaseService } from './web'

export const db = isDesktop()
  ? desktopDatabaseService
  : isCapacitor()
    ? mobileDatabaseService
    : webDatabaseService

export type { DatabaseService } from './types'
