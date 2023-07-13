import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";
import { BASE_LOCALHOST_URL } from "./settings";

interface DraftPick {
  season_id: number;
  round: number;
  pick: number;
  team: string;
  // Will be an empty string if the pick wasn't traded
  orig_owner: string;
  // Can be an empty string if no selection was made
  player: string;
}

async function parseDraft() {
  const picks: DraftPick[] = [];

  fs.createReadStream("draft.csv")
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
      const res = await fetch(`${BASE_LOCALHOST_URL}/parser/load/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ picks }),
      });

      const data = (await res.json()) as string;

      console.log(data);
    });
}

export default parseDraft;
