import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";
import { BASE_LOCALHOST_URL } from "./settings";

interface Schedule {
  home: string;
  away: string;
  date: string;
}

async function parseSchedule() {
  const schedule: Schedule[] = [];

  fs.createReadStream("schedule.csv")
    .pipe(csvParse({ columns: true }))
    .on("data", (data) => {
      schedule.push({
        home: data.home,
        away: data.away,
        date: data.date,
      });
    })
    .on("end", async () => {
      const res = await fetch(`${BASE_LOCALHOST_URL}/parser/load/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schedule }),
      });

      const data = (await res.json()) as string;

      console.log(data);
    });
}

export default parseSchedule;
