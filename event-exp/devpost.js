const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeDevpost() {
//   const url = "https://devpost.com/hackathons";
  const url = "https://devpost.com/hackathons?open_to[]=public";

  const { data } = await axios.get(url);

  require("fs").writeFileSync("devpost.html", data);
//   console.log("Data fetched from Devpost",data);
  const $ = cheerio.load(data);
  console.log("Data fetched from Devpost",$);

  const hackathons = [];

  $(".hackathon-tile").each((i, el) => {
    const title = $(el).find(".title").text().trim();
    const link = $(el).find("a").attr("href");
    const image = $(el).find("img").attr("src");
    const deadline = $(el).find(".submission-period").text().trim();

    hackathons.push({
      title,
      link,
      image,
      deadline,
      platform: "devpost",
    });
  });

  console.log(hackathons);
}

scrapeDevpost();