import { PostgresStore } from '@mastra/pg';

export const Store = new PostgresStore({
    id: "pg-store",
    connectionString : process.env.MASTRA_PG_CONNECTION_STRING,
}) as any; // An attempt to fix a type mismatch issue.