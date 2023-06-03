import Puppeteer from "puppeteer";

/**
 * Go to the wordpress site and extract the schedule
 */
async function getLinksAndDates() {
  const browser = await Puppeteer.launch({
    headless: true,
  });

  const page = (await browser.pages())[0];

  const SCHEDULE_URL = "http://hflexport.local/schedule/";

  await page.goto(SCHEDULE_URL, {
    waitUntil: "networkidle2",
  });

  const gamesAndDates = await page.$eval<
    string,
    any[],
    Puppeteer.EvaluateFunc<HTMLTableSectionElement[]>
  >("table tbody", (tbody: HTMLTableSectionElement) => {
    return Array.from(tbody.rows).map((row) => {
      // We only really care about the date
      const [date, _, score, _1, ..._rest] = Array.from(row.cells);

      const gameURL = score.querySelector("a")!.href;

      return {
        date: new Date(
          new Date(new Date(Date.parse(date.innerText)).setHours(20))
        ).toISOString(),
        link: gameURL,
      };
    });
  });

  console.log(gamesAndDates);

  await browser.close();
}

export default getLinksAndDates;
