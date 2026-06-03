/// <reference types="vite/client" />

import type { DatabaseService } from './renderer/services/database/types';

declare global {
  interface Window {
    api: DatabaseService;
  }
}

export {};
