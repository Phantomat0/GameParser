import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";
import { BASE_LOCALHOST_URL } from "./settings";

interface Manager {
  season_id: number;
  team: string;
  player: string;
}

async function parseManagers() {
  const managers: Manager[] = [];

  fs.createReadStream("managers.csv")
    .pipe(csvParse({ columns: true }))
    .on("data", (data) => {
      managers.push({
        season_id: parseInt(data.season),
        team: data.team,
        player: data.player,
      });
    })
    .on("end", async () => {
      const res = await fetch(`${BASE_LOCALHOST_URL}/parser/loadmanagers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managers }),
      });

      const data = (await res.json()) as string;

      console.log(data);
    });
}

export default parseManagers;
