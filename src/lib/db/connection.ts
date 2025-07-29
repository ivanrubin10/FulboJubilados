import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Check if we're running on the server side
const isServer = typeof window === 'undefined';

if (isServer && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Create a proxy that throws an error when used on client side
const createDbProxy = (): ReturnType<typeof drizzle> => {
  if (!isServer) {
    return new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error('Database operations can only be performed on the server side. Use API routes for client-side database access.');
      }
    });
  }
  
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
};

export const db = createDbProxy();