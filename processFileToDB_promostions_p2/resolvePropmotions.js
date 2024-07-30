import https from "https";
import unzipper from "unzipper";
import sax from "sax";

import { keyTransforms, floatsKeys, integerKeys } from "./keyTransforms.js";
import { deleteOldPromotions, insertBatch } from "./utils.js";
import { updateStoreFile } from "../processFileToDB_prices_p2/utils.js";

const restrictedPromotionId = [];

async function resolvePromotion(pool, cookie, store, file_name) {
  const initialMemoryUsage = process.memoryUsage().heapUsed;
  return new Promise((resolveAll) => {
    // delete old promotions
    deleteOldPromotions(pool);

    const parser = sax.createStream(true);
    let currentObject = null;
    let currentItem = null;
    let currentElement = null;
    let items = [];
    let club_ids;
    let tempItems = [];

    // filter forbiden promotion id
    let isValidPromotionId = true;

    parser.onopentag = function (node) {
      if (node.name === "Promotion") {
        currentObject = {};
        club_ids = new Set();
      } else if (isValidPromotionId && node.name === "Item") {
        currentItem = {};
      } else {
        currentElement = keyTransforms[node.name];
      }
    };

    parser.onclosetag = function (name) {
      if (name === "Promotion") {
        currentObject = null;
        isValidPromotionId = true;
      } else if (isValidPromotionId && name === "Item") {
        if (tempItems.length < 200) tempItems.push(currentItem);
        currentItem = null;
      } else if (name === "ClubId") {
        currentObject.club_id = [...club_ids];
      } else if (name === "Clubs") {
        if (tempItems.length) {
          items.push(...tempItems.map((i) => ({ ...i, club_id: [...club_ids] })));
          tempItems = [];
        }
      } else {
        currentElement = null;
      }

      if (items.length > 100) {
        //   update DB
        insertBatch(items, pool);
        items = [];
      }
    };

    parser.ontext = function (text) {
      //----- new code start
      if (currentElement === "promotion_id" && restrictedPromotionId.includes(text.trim())) {
        isValidPromotionId = false;
      }
      //---- new code end

      if (currentObject && isValidPromotionId) {
        if (currentElement && !currentItem) {
          // parse int/float/char
          if (integerKeys.includes(currentElement)) currentObject[currentElement] = parseInt(text.trim());
          else if (floatsKeys.includes(currentElement)) currentObject[currentElement] = parseFloat(text.trim());
          else currentObject[currentElement] = text.trim();
        } else if (currentItem && currentElement) {
          if (currentItem === "item_code") currentItem[currentElement] = text.trim();
          else currentItem[currentElement] = parseInt(text.trim());
          currentItem = { ...currentItem, ...currentObject };
        }

        if (
          (parser.tag?.name === "PromotionStartHour" && typeof currentObject.promotion_start_date === "string") ||
          currentElement === "promotion_start_hour"
        ) {
          currentObject.promotion_start_date = new Date(currentObject.promotion_start_date + " " + text.trim());
          delete currentObject.promotion_start_hour;
        } else if (
          (parser.tag?.name === "PromotionEndHour" && typeof currentObject.promotion_end_date === "string") ||
          currentElement === "promotion_end_hour"
        ) {
          currentObject.promotion_end_date = new Date(currentObject.promotion_end_date + " " + text.trim());
          delete currentObject.promotion_end_hour;
        } else if (currentElement === "promotion_update_date") {
          currentObject.promotion_update_date = new Date(text.trim());
        } else if (typeof club_ids === "object" && currentElement === "club_id" && text.trim()) {
          club_ids.add(parseInt(text.trim()));
        }
      }
    };

    // -----------------
    const options = {
      hostname: "publishedprices.co.il",
      path: `/file/d/${file_name}`,
      headers: {
        "Accept-Encoding": "gzip",
        Cookie: `cftpSID=${cookie}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      },
    };

    const request = https.get(options, async (response) => {
      if (response.statusCode !== 200) {
        console.error(`Failed to download file. Server responded with status code ${response.statusCode}`);
        pool.end();
        return;
      }

      const unzipCB = (entry) => {
        if (entry.path.endsWith(".xml")) {
          entry.pipe(parser);
        } else {
          entry.autodrain();
        }
      };

      const readStream = response.pipe(unzipper.Parse()).on("entry", unzipCB);

      const endPromise = new Promise((resolve, reject) => {
        readStream.on("finish", async () => {
          resolve();
        });

        readStream.on("error", (err) => {
          console.log(err);
          reject();
        });
      });

      try {
        await await endPromise;
        if (items.length > 0) {
          await insertBatch(items, pool);
        }
        await updateStoreFile(pool, file_name, "DONE");
        const finalMemoryUsage = process.memoryUsage().heapUsed;
        const memoryUsageDelta = (finalMemoryUsage - initialMemoryUsage) / 1024 / 1024;
        const strMessage = `${store}Prices updated with ${file_name} data. Memory usage delta: ${memoryUsageDelta.toFixed(
          2
        )} MB`;
        resolveAll({ strMessage, result: true, memory: `${memoryUsageDelta.toFixed(2)} MB`, file_name });
      } catch (error) {
        console.log(error);
        await updateStoreFile(pool, file_name, "ERROR");
        const finalMemoryUsage = process.memoryUsage().heapUsed;
        const memoryUsageDelta = (finalMemoryUsage - initialMemoryUsage) / 1024 / 1024;
        rejectAll({ strMessage: error.message, result: false, memory: memoryUsageDelta.toFixed(2) });
      } finally {
        await new Promise((resolve) => parser.on("end", resolve));
        pool.end();
      }
    });

    request.on("error", (err) => {
      console.error(err);
    });
    request.end();
    // -----------------
  });
}

export default resolvePromotion;
