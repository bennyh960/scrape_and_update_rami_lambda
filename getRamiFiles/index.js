// import { updateFileOnDbTest } from "./draft.js";
import { getFile, getTableData, loadLoginPage, login } from "./https.js";
import { filterFilesByDates, getCsrfToken } from "./utils.js";

const scrapeFiles = async () => {
  //load login page
  const loginHtml = await loadLoginPage();
  const { data, cookie } = loginHtml;
  // console.log(data, cookie);
  const csrfToken = getCsrfToken(data);
  console.log(csrfToken);
  // Perform login and get new cookie
  const newSessionCookie = await login(csrfToken, cookie);
  // await new Promise((resolve) => setTimeout(resolve, 1000));

  // get /file content html in order to get the new token
  const fileData = await getFile(newSessionCookie);
  const csrfToken2 = getCsrfToken(fileData);
  const { aaData, cookieForFiles } = await getTableData(newSessionCookie, csrfToken2, 600); // last arg is sizeOfData need to decide about the size
  const files = filterFilesByDates(aaData, 3);

  return {
    files,
    cookie: cookieForFiles,
  };
};
export default scrapeFiles;
