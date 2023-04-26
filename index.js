import pg from "pg";
import resolvePrices from "./processFileToDB_prices_p2/index.js";
import scrapeFiles from "./getRamiFiles/index.js";

// todo open repo on github and integrate with github
// todo create aws lambda function
// todo create ci/cd github and lambda
// todo create storeFiles create/update
// todo perform another filter according DB store files
// todo add resolve promotions

// !bug: probably the memory usage not efficent , its seems like on file size of 12 mb the memory usage is 24 mb (pricefull tested)

const pool = new pg.Pool({
  user: process.env.POSTGRES_USER_DEV || "postgres",
  database: process.env.DB_NAME_DEV || "superim",
  password: process.env.POSTGRES_PASSWORD_DEV || "6711904bh",
  // host: "2" + process.env.DB_HOST_DEV,
  host: "localhost",
  // port: 10149,
  port: 5432,
});

const handler = async () => {
  const { files, cookie } = await scrapeFiles();
  //

  // start iterate over files in order to perform DB update or Create
  for (const file of files) {
    const fname = file.fname;
    try {
      const res = await resolvePrices(pool, cookie, "rami", fname);
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }
};

handler();
