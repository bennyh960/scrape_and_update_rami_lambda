// https://publishedprices.co.il/file/d/Price7290058140886-001-202304170800.gz
import zlib from "zlib";
import https from "https";

// TODO: CONTINUE TESTING THE DOWNLOADS . somehow i got an error

export const updateFileOnDbTest = async (cookie, fileName) => {
  const options = {
    hostname: "publishedprices.co.il",
    path: `/file/d/${fileName}`,
    method: "GET",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Cookie: `cftpSID=${cookie}`,
      Host: "publishedprices.co.il",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "sec-ch-ua": '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    },
  };

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    const unzip = zlib.createGunzip();
    res.pipe(unzip);

    let data = "";

    unzip.on("data", (chunk) => {
      data += chunk.toString();
    });

    unzip.on("end", () => {
      console.log(data);
    });
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.end();
};

// updateFileOnDbTest("_lal2WY26thwih8zbV4J12h1SKDSdgMfGYIX20hHXmc", "Price7290058140886-001-202304170800.gz");
