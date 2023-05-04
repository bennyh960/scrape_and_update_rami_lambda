import https from "https";

const options = {
  hostname: "blog.jakoblind.no",
  path: "/aws-lambda-github-actions/",
  method: "GET",
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);

  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(data.slice(1,500));
  });
});

req.on("error", (error) => {
  console.error(error);
});

req.end();
