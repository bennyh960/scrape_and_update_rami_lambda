import pg from "pg";
import resolvePrices from "./processFileToDB_prices_p2/resolvePrices.js";
import scrapeFiles from "./getRamiFiles/index.js";
import { validateIfFileIsNew } from "./getRamiFiles/utils.js";
import resolvePromotion from "./processFileToDB_promostions_p2/resolvePropmotions.js";

// todo open repo on github and integrate with github
// todo create aws lambda function
// todo create ci/cd github and lambda
// todo create storeFiles create/update
// todo perform another filter according DB store files
// todo add resolve promotions

export const ramiStoreFKId = 6;

// !bug: probably the memory usage not efficent , its seems like on file size of 12 mb the memory usage is 24 mb (pricefull tested)
let config;
try {
  if (!process.env.POSTGRES_USER_DEV) {
    config = await import("./db.config.js");
  }
} catch (error) {
  console.error("Error importing config:", error);
}

let ngrokPrefix = "7";
let ngrokPort = 5432;

const pool = new pg.Pool({
  user: process.env.POSTGRES_USER_DEV || config.default.user,
  database: process.env.DB_NAME_DEV || config.default.database,
  password: process.env.POSTGRES_PASSWORD_DEV || config.default.password,
  host: process.env.DB_HOST_DEV ? ngrokPrefix + process.env.DB_HOST_DEV : config.default.host,
  port: process.env.POSTGRES_USER_DEV ? ngrokPort : 5432,
});

export const handler = async (event) => {
  // console.log("pool", pool);
  const { files, cookie } = await scrapeFiles();
  const validateFiles = await validateIfFileIsNew(pool, files);

  const result = {
    memory: 0,
    ok: null,
    failed: null,
    files: [],
  };
  // start iterate over files in order to perform DB update or Create
  for (const file of validateFiles) {
    const fname = file.file_name;
    try {
      let res;
      if (fname.startsWith("price")) res = await resolvePrices(pool, cookie, "rami", fname);
      else if (fname.startsWith("promo")) res = await resolvePromotion(pool, cookie, "rami", fname);
      else throw new Error("resolvers problem");
      // console.log(res);
      result.memory += parseFloat(res?.memory.split("MB")[0]);
      result.ok += res.result === true ? 1 : -1;
      result.files.push(res.file_name);
    } catch (error) {
      console.log(error);
      console.log(fname);
    }
  }

  result.failed = result.files.length - result.ok;
  const response = {
    statusCode: result.files.length > 0 && !result.failed ? 200 : 401,
    body: JSON.stringify(result),
  };
  return response;
};

// handler().then((res) => {
//   console.log(res);
// });
