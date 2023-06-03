import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";

interface DraftPick {
  season_id: number;
  round: number;
  pick: number;
  team: string;
  orig_owner: string;
  player: string;
}

async function parseDraft() {
  const picks: DraftPick[] = [];

  fs.createReadStream("data.csv")
    .pipe(csvParse({ columns: true }))
    .on("data", (data) => {
      picks.push({
        season_id: parseInt(data.season_id),
        round: parseInt(data.round),
        pick: parseInt(data.pick),
        team: data.team,
        orig_owner: data.orig_owner,
        player: data.player,
      });
    })
    .on("end", async () => {
      const res = await fetch("http://localhost:3000/api/parser/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ picks }),
      });

      const x = await res.json();

      console.log("GOT HERE ", x);
    });
}

export default parseDraft;
