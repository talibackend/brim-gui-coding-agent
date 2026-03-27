import { PgVector } from '@mastra/pg'

export const VectorStore = new PgVector({
    id: 'pg-vector-store',
    connectionString : process.env.MASTRA_PG_VECTOR_CONNECTION_STRING
}) as any;