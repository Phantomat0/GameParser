import Puppeteer from "puppeteer";

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
      const [date, _, score, _1, ..._rest] = Array.from(row.cells);

      const link = score.querySelector("a")!.href;

      return {
        date: new Date(
          new Date(new Date(Date.parse(date.innerText)).setHours(20))
        ).toISOString(),
        link: link,
      };
    });
  });

  console.log(gamesAndDates);

  await browser.close();
}

export default getLinksAndDates;
