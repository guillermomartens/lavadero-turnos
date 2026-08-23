const { client } = require('./connection');

/** Devuelve la primera fila que coincida, o undefined. */
async function get(sql, params = []) {
  const res = await client.execute({ sql, args: params });
  return res.rows[0];
}

/** Devuelve todas las filas que coincidan. */
async function all(sql, params = []) {
  const res = await client.execute({ sql, args: params });
  return res.rows;
}

/** Ejecuta un INSERT/UPDATE/DELETE. Devuelve { lastInsertRowid, changes }. */
async function run(sql, params = []) {
  const res = await client.execute({ sql, args: params });
  return {
    lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
    changes: res.rowsAffected
  };
}

/**
 * Ejecuta una serie de operaciones dentro de una transacción de escritura.
 * `fn` recibe un objeto { get, all, run } que opera dentro de la transacción,
 * y debe devolver una promesa. Si `fn` lanza un error, se hace rollback.
 */
async function withTransaction(fn) {
  const tx = await client.transaction('write');
  const txApi = {
    get: async (sql, params = []) => (await tx.execute({ sql, args: params })).rows[0],
    all: async (sql, params = []) => (await tx.execute({ sql, args: params })).rows,
    run: async (sql, params = []) => {
      const res = await tx.execute({ sql, args: params });
      return {
        lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
        changes: res.rowsAffected
      };
    }
  };
  try {
    const result = await fn(txApi);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

module.exports = { get, all, run, withTransaction };
