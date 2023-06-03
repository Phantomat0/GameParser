import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";
import { BASE_LOCALHOST_URL } from "./settings";
import { getQueryParam } from "./utils";
import path from "path";
import FormData from "form-data";

// const downloadPath = path.resolve("./replays");

const REPLAY_NUMB = "1";

interface ReplayData {
  season: number;
  date: string;
  home: string;
  score: string;
  away: string;
  replay_str: string;
  replay: string;
}

async function parseReplays() {
  const replays: ReplayData[] = [];

  fs.createReadStream("replays.csv")
    .pipe(csvParse({ columns: true }))
    .on("data", (data) => {
      replays.push({
        season: parseInt(data.season),
        date: data.date,
        home: data.home,
        score: data.score,
        away: data.away,
        replay_str: data.replay_str,
        replay: data.replay,
      });
    })
    .on("end", async () => {
      for (let i = 0; i < replays.length; i++) {
        const replay = replays[i];

        const hasNoReplay = replay.replay.length === 0;

        const formData = new FormData();

        formData.append("season", replay.season);
        formData.append("home", replay.home);
        formData.append("away", replay.away);

        if (hasNoReplay) {
          console.log("No Replay");
          formData.append("replayNumb", "0");

          // Send to our server
          const replayRes = await fetch(`${BASE_LOCALHOST_URL}/parser/replay`, {
            method: "POST",
            body: formData,
          });

          const replayData = await replayRes.json();

          console.log(replayData);

          continue;
        }

        const fileName = `${replay.home}_${replay.away}_${i}`;

        const replayId = getQueryParam(replay.replay, "nagranie");

        const file = fs.createWriteStream(
          `${path.dirname(__dirname)}\\replays\\${fileName}.hbr2`
        );

        const res = await fetch(
          `https://thehax.pl/forum/powtorki.php?action=pobierz&nagranie=${replayId}`,
          {
            method: "GET",
          }
        );

        if (res.status === 503) {
          console.log(
            `Replay Link Error: ${replay.home} vs ${replay.away} | ${replay.date} `
          );

          formData.append("replayNumb", "0");

          // Send to our server
          const replayRes = await fetch(`${BASE_LOCALHOST_URL}/parser/replay`, {
            method: "POST",
            body: formData,
          });

          const replayData = await replayRes.json();

          console.log(replayData);

          continue;
        }

        await new Promise((resolve, reject) => {
          if (res.body === null) {
            console.log("yikes");
            return reject();
          }
          res.body.pipe(file);
          res.body.on("error", reject);
          file.on("finish", resolve);
        });

        const replayFile = fs.createReadStream(
          `${path.dirname(__dirname)}\\replays/${fileName}.hbr2`
        );

        formData.append("file", replayFile);
        formData.append("date", replay.date);
        formData.append("replayNumb", REPLAY_NUMB);

        // Send to our server
        const replayRes = await fetch(`${BASE_LOCALHOST_URL}/parser/replay`, {
          method: "POST",
          body: formData,
        });

        const replayData = await replayRes.json();

        console.log(replayData);
      }
    });
}

export default parseReplays;
