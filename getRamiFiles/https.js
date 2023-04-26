import https from "https";

// Function to load login page
export const loadLoginPage = () => {
  const options = {
    hostname: "publishedprices.co.il",
    path: "/login",
    method: "GET",
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const cookie = res.headers["set-cookie"][0].split("=")[1].split(";")[0];
        resolve({ data, cookie });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
};

// Function to perform login request
export const login = (csrfToken, sessionId) => {
  const postData = `r=&username=RamiLevi&password=&Submit=Sign+in&csrftoken=${csrfToken}`;
  const options = {
    method: "POST",
    hostname: "publishedprices.co.il",
    path: "/login/user",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": postData.length,
      Cookie: `cftpSID=${sessionId}`,
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 302) {
        const newSessionId = res.headers["set-cookie"][0].split(";")[0].split("=")[1];
        resolve(newSessionId);
      } else {
        reject(new Error(`Login failed with status code ${res.statusCode}`));
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.write(postData);
    req.end();
  });
};

// Function to retrieve file after login
export const getFile = (sessionId) => {
  const options = {
    method: "GET",
    hostname: "publishedprices.co.il",
    path: "/file",
    headers: {
      Cookie: `cftpSID=${sessionId}`,
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data); //html
          //   resolve(res);
        });
      } else {
        reject(new Error(`Failed to retrieve file with status code ${res.statusCode}`));
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.end();
  });
};

export async function getTableData(cookie, token, sizeOfData) {
  const data = `sEcho=1&iColumns=5&sColumns=%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=${sizeOfData}&mDataProp_0=fname&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=typeLabel&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=false&mDataProp_2=size&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=ftime&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=false&sSearch=&bRegex=false&iSortingCols=0&cd=%2F&csrftoken=${token}`;

  const options = {
    hostname: "publishedprices.co.il",
    port: 443,
    path: "/file/json/dir",
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Length": data.length,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: `cftpSID=${cookie}`,
      Host: "publishedprices.co.il",
      Origin: "https://publishedprices.co.il",
      Pragma: "no-cache",
      Referer: "https://publishedprices.co.il/file",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua": '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "Windows",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const aaData = result.aaData;
          const cookieForFiles = res.headers["set-cookie"][0].split("=")[1].split(";")[0];
          resolve({ aaData, cookieForFiles });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}
