import { query, queryWith } from '../../db.js';

export async function runDbQuery(db, config) {
  return db ? queryWith(db, config) : query(config);
}
