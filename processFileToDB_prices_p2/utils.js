export const updatePriceFullAvilability = async (pool, file_name, store) => {
  if (file_name.startsWith("PriceFull")) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE products."${store}Prices" SET avilable = false`);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
};

export async function updateStoreFile(pool, file_name, status) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(`UPDATE utils."storeFiles" SET status = $1 where file_name = $2`, [
      status,
      file_name,
    ]);
    await client.query("COMMIT");
  } catch (e) {
    console.log(e);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

export async function insertBatch(records, pool, store) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const placeholders = Array.from(
      Array(records.length),
      (_, i) =>
        `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${
          i * 17 + 7
        }, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${
          i * 17 + 14
        }, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`
    ).join(", ");
    const values = records
      .map((r) => {
        // if (!r) console.log(`Processing record ${i}:`, r);
        return [
          r.price_update_date || new Date(),
          r.item_code || "ERROR_itemCode",
          r.item_type,
          r.item_name,
          r.manufacturer_name,
          r.manufacture_country,
          r.manufacturer_item_description,
          r.unit_qty || -1,
          r.quantity,
          r.b_is_weighted,
          r.unit_of_measure,
          r.qty_in_package || -1,
          r.item_price || -1,
          r.unit_of_measure_price || -1,
          r.allow_discount || -1,
          r.item_status || -1,
          true,
        ];
      })
      .flat();

    await client.query(
      `INSERT INTO products."ramiPrices" (price_update_date, item_code, item_type, item_name, manufacturer_name, manufacture_country, manufacturer_item_description, unit_qty, quantity, b_is_weighted, unit_of_measure, qty_in_package, item_price, unit_of_measure_price, allow_discount, item_status, avilable)
            VALUES ${placeholders}
            ON CONFLICT (item_code) DO UPDATE SET
            price_update_date = EXCLUDED.price_update_date,
            item_type = EXCLUDED.item_type,
            item_name = EXCLUDED.item_name,
            manufacturer_name = EXCLUDED.manufacturer_name,
            manufacture_country = EXCLUDED.manufacture_country,
            manufacturer_item_description = EXCLUDED.manufacturer_item_description,
            unit_qty = EXCLUDED.unit_qty,
            quantity = EXCLUDED.quantity,
            b_is_weighted = EXCLUDED.b_is_weighted,
            unit_of_measure = EXCLUDED.unit_of_measure,
            qty_in_package = EXCLUDED.qty_in_package,
            item_price = EXCLUDED.item_price,
            unit_of_measure_price = EXCLUDED.unit_of_measure_price,
            allow_discount = EXCLUDED.allow_discount,
            item_status = EXCLUDED.item_status,
            avilable = true
            `,
      values
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "21000") {
      //error: ON CONFLICT DO UPDATE command cannot affect row a second time
      console.log(e.message);
      const uniqueArr = Array.from(new Set(records.map((item) => item.item_code))).map((itemCode) => {
        return records.find((item) => item.item_code === itemCode);
      });
      insertBatch(uniqueArr, pool, store);
    } else {
      //! for dev only throw error
      // throw e;
      console.log(e.message);
    }
  } finally {
    client.release();
  }
}
