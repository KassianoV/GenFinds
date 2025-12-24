// src/types/sql.d.ts
declare module 'sql.js' {
  export default function initSqlJs(config?: any): Promise<any>;
  
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export type SqlValue = number | string | null | Uint8Array;
}