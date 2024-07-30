import { ramiStoreFKId } from "../index.js";

export async function insertBatch(records, pool) {
  // console.log(`connect to db with ${records.length} records and ${recordsNum} as recordsNum from bath ${batchNum}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const numOfColumns = 21;
    const placeholders = Array.from(
      Array(records.length),
      (_, i) =>
        `($${i * numOfColumns + 1}, $${i * numOfColumns + 2}, $${i * numOfColumns + 3}, $${i * numOfColumns + 4}, $${
          i * numOfColumns + 5
        }, $${i * numOfColumns + 6}, $${i * numOfColumns + 7}, $${i * numOfColumns + 8}, $${i * numOfColumns + 9}, $${
          i * numOfColumns + 10
        }, $${i * numOfColumns + 11}, $${i * numOfColumns + 12}, $${i * numOfColumns + 13}, $${
          i * numOfColumns + 14
        }, $${i * numOfColumns + 15}, $${i * numOfColumns + 16}, $${i * numOfColumns + 17}, $${
          i * numOfColumns + 18
        }, $${i * numOfColumns + 19}, $${i * numOfColumns + 20}, $${i * numOfColumns + 21})`
    ).join(", ");
    const values = records
      .map((r) => {
        // if (!r) console.log(`Processing record ${i}:`, r);
        // console.log(r.club_id, typeof r.club_id, typeof [...r.club_id], [...r.club_id], typeof r.club_id[0]);
        return [
          ramiStoreFKId,
          r.promotion_update_date,
          r.item_code || "ERROR_itemCode",
          r.item_type,
          r.is_gift_item,
          r.reward_type,
          r.allow_multiple_discounts,
          r.promotion_id,
          r.promotion_description,
          r.promotion_start_date,
          r.promotion_end_date,
          typeof r.club_id === "number" ? [r.club_id] : r.club_id,
          r.min_qty,
          r.max_qty,
          r.discount_rate,
          r.discount_type,
          r.min_purchase_amount,
          r.discounted_price,
          r.discounted_price_per_mida,
          r.min_no_of_items_offered,
          r.additional_gift_count,
        ];
      })
      .flat();

    await client.query(
      `INSERT INTO public."Promotions" (
        store_id,
        promotion_update_date,
        item_code,
        item_type,
        is_gift_item,
        reward_type,
        allow_multiple_discounts,
        promotion_id,
        promotion_description,
        promotion_start_date,
        promotion_end_date,
        club_id,
        min_qty,
        max_qty,
        discount_rate,
        discount_type,
        min_purchase_amount,
        discounted_price,
        discounted_price_per_mida,
        min_no_of_items_offered,
        additional_gift_count
      )
            VALUES ${placeholders}
            ON CONFLICT (item_code,promotion_id,store_id) DO UPDATE SET
                promotion_update_date = EXCLUDED.promotion_update_date,
                item_type = EXCLUDED.item_type,
                is_gift_item = EXCLUDED.is_gift_item,
                reward_type = EXCLUDED.reward_type,
                allow_multiple_discounts = EXCLUDED.allow_multiple_discounts,
                promotion_description = EXCLUDED.promotion_description,
                promotion_start_date = EXCLUDED.promotion_start_date,
                promotion_end_date = EXCLUDED.promotion_end_date,
                club_id = EXCLUDED.club_id,
                min_qty = EXCLUDED.min_qty,
                max_qty = EXCLUDED.max_qty,
                discount_rate = EXCLUDED.discount_rate,
                discount_type = EXCLUDED.discount_type,
                min_purchase_amount = EXCLUDED.min_purchase_amount,
                discounted_price = EXCLUDED.discounted_price,
                discounted_price_per_mida = EXCLUDED.discounted_price_per_mida,
                min_no_of_items_offered = EXCLUDED.min_no_of_items_offered,
                additional_gift_count = EXCLUDED.additional_gift_count
                WHERE public."Promotions".promotion_update_date < EXCLUDED.promotion_update_date
              `,
      values
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "21000") {
      //error: ON CONFLICT DO UPDATE command cannot affect row a second time
      console.log(e.message);
      // logDuplicateItems(records);
      const uniqueArr = getUniqueItems(records);
      insertBatch(uniqueArr, pool);
    } else {
      console.log("insertBatch ERROR:", e);
      throw e;
    }
  } finally {
    client.release();
  }
}

export async function deleteOldPromotions(pool) {
  const client = await pool.connect();
  try {
    await client.query("COMMIT");
    await client.query(
      `DELETE FROM public."Promotions" WHERE store_id = ${ramiStoreFKId} AND promotion_end_date < NOW()`
    );
  } catch (error) {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

function getUniqueItems(items) {
  const uniqueItems = new Map();

  items.forEach((item) => {
    const key = `${item.promotion_id}:${item.item_code}`;
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item);
    }
  });

  return Array.from(uniqueItems.values());
}
