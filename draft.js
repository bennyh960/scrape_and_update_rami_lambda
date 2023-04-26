import https from "https";
import unzipper from "unzipper";
import sax from "sax";
import keyTransforms from "./keyTransforms.js";
import { updatePriceFullAvilability, updateStoreFile, insertBatch } from "./utils.js";

const resolvePrices = async (pool, cookie, store, file_name) => {
  return new Promise(async (resolveAll, rejectAll) => {
    console.log("1.start resolve:", file_name);
    //*#region   ----------- sax -------------------------
    const saxStream = sax.createStream(true); // strict mode

    saxStream.on("opentag", (node) => {
      //  do somthing
    });

    saxStream.on("text", (text) => {
      //  do somthing
    });

    saxStream.on("closetag", async (nodeName) => {
      if (nodeName === "Items") {
        console.log("2. finish parse with sax the file");
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
        readStream.on("end", async () => {
          console.log("3. readStream end ");
          resolve();
        });

        readStream.on("error", (err) => {
          reject();
        });
      });

      try {
        await await endPromise;
        console.log(`4.end process file with with ${numOfRecords} records`);

        // update db
        await insertBatch(arrOfRecoreds, pool, store);
        console.log("5. work on the last items...");

        resolveAll(
          `${store}Prices updated with ${file_name} data.\nMemory usage delta: ${memoryUsageDelta.toFixed(2)} MB`
        );
      } catch (error) {
        console.log(error);
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
