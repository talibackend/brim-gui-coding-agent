import { open } from 'lmdb';
import path from 'path';

const db = open({
  path: path.resolve(process.cwd(), '.cache/lmdb'),
  compression: true,
});

export function getCache() {
  return db;
}
