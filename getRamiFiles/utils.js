export const getCsrfToken = (html) => {
  const startPoint = '<meta name="csrftoken" content="';
  const startIndex = html.indexOf(startPoint) + startPoint.length;
  const endIndex = html.indexOf('"/>', startIndex);
  const token = html.slice(startIndex, endIndex);
  return token.trim();
};

export const filterFilesByDates = (data, hours = 3) => {
  return data.filter(
    (file) =>
      file.fname.split("-")[1] === "039" && new Date(file.time).getTime() > new Date().getTime() - hours * 1000 * 3600
  );
};

export const validateIfFileIsNew = async (pool, records) => {
  if (records.length === 0) return [];

  const placeholders = Array.from(
    Array(records.length),
    (_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
  ).join(", ");

  const values = records
    .map((r) => {
      return [r.fname, "rami", "READY", new Date(), new Date(), r.fname];
    })
    .flat();

  const query = {
    text: `
        INSERT INTO utils."storeFiles" (file_name, store, status, created_at, updated_at, file_url)
          VALUES ${placeholders}
          ON CONFLICT (file_name)
          DO UPDATE SET
            status = CASE WHEN utils."storeFiles".status = \'DONE\' THEN utils."storeFiles".status ELSE \'READY\' END,
            updated_at = NOW() 
          WHERE utils."storeFiles".status = \'ERROR\'
          RETURNING *;
          `,
    values,
  };

  // console.log(query);

  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM utils."storeFiles" WHERE updated_at < NOW() - INTERVAL '30 days';`);
    const res = await client.query(query);
    return Promise.resolve(res.rows);
  } catch (e) {
    console.log(e);
    return Promise.reject(records);
    // todo update to error
  } finally {
    client.release();
  }
};
