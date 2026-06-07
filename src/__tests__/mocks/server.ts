import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup MSW server for Node.js environment (vitest)
export const server = setupServer(...handlers)
