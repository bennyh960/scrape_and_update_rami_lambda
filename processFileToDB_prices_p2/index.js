import https from "https";
import unzipper from "unzipper";
import sax from "sax";
import keyTransforms from "./keyTransforms.js";
import { updatePriceFullAvailability, updateStoreFile, insertBatch } from "./utils.js";

const resolvePrices = async (pool, cookie, store, file_name) => {
  let numOfRecords = 0;
  const initialMemoryUsage = process.memoryUsage().heapUsed;
  return new Promise(async (resolveAll, rejectAll) => {
    await updatePriceFullAvailability(pool, file_name, store);

    // console.log("1. Start resolve:", file_name);
    let arrOfRecoreds = [];
    //*#region   ----------- sax -------------------------
    const saxStream = sax.createStream(true); // strict mode

    let currentElement = null;
    let currentObject = null;

    saxStream.on("opentag", (node) => {
      if (node.name === "Item") {
        currentObject = {};
      } else {
        currentElement = keyTransforms[node.name] || node.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      }
    });

    saxStream.on("text", (text) => {
      if (currentElement && currentObject) {
        if (
          ["item_type", "quantity", "qty_in_package", "allow_discount", "item_status", "b_is_weighted"].includes(
            currentElement
          )
        ) {
          currentObject[currentElement] = text !== "לא ידוע" ? parseInt(text) : -1;
        } else if (["item_price", "unit_of_measure_price"].includes(currentElement)) {
          currentObject[currentElement] = parseFloat(text);
        } else if (currentElement === "price_update_date") {
          currentObject[currentElement] = new Date(text);
        } else currentObject[currentElement] = text.trim();
      }
    });

    saxStream.on("closetag", async (nodeName) => {
      if (nodeName === "Items") {
        // console.log("2. Finish parse with sax the file");
      }
      if (nodeName === "Item") {
        // process the current object
        if (arrOfRecoreds.length <= 150 && currentObject) {
          arrOfRecoreds.push(currentObject);
          numOfRecords += 1;
          // console.log("update");
        }

        if (arrOfRecoreds.length === 150) {
          insertBatch(arrOfRecoreds, pool, store);
          arrOfRecoreds = [];
        }

        // reset the current object
        currentObject = null;
      } else {
        currentElement = null;
      }
    });

    //#endregion   ----------- sax -------------------------

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

    const request = https.request(options, async (response) => {
      if (response.statusCode !== 200) {
        console.error(`Failed to download file. Server responded with status code ${response.statusCode}`);
        pool.end();
        return;
      }

      // ---------------------------------------

      const unzipCB = (entry) => {
        if (entry.path.endsWith(".xml")) {
          entry.pipe(saxStream);
        } else {
          entry.autodrain();
        }
      };

      const readStream = response.pipe(unzipper.Parse()).on("entry", unzipCB);
      // ---------------------------------------

      const endPromise = new Promise((resolve, reject) => {
        readStream.on("finish", async () => {
          // console.log("3. Finish and readStream on finish ommited -- check on.end ");
          resolve();
        });

        readStream.on("error", (err) => {
          console.log(err);
          reject(err);
        });
      });

      try {
        await endPromise;
        // console.log(`4. End process file with with ${numOfRecords} records`);
        if (arrOfRecoreds.length > 0) {
          await insertBatch(arrOfRecoreds, pool, store);
          // console.log("5. Work on the last items...");
        }
        await updateStoreFile(pool, file_name, "DONE");
        const finalMemoryUsage = process.memoryUsage().heapUsed;
        const memoryUsageDelta = (finalMemoryUsage - initialMemoryUsage) / 1024 / 1024;
        // const strMessage2 = `==================================================================================\n
        // ${store}Prices updated with ${file_name} data.\n
        // Memory usage delta: ${memoryUsageDelta.toFixed(2)} MB
        // \n===================================================================================\n\n`;
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
        await new Promise((resolve) => saxStream.on("end", resolve));
        pool.end();
      }
    });

    request.on("error", (err) => {
      console.error(err);
    });
    request.end();
  });
};

export default resolvePrices;
