import fetch from "node-fetch";
import { parse as csvParse } from "csv-parse";
import fs from "fs";
import { BASE_LOCALHOST_URL } from "./settings";
import { getQueryParam } from "./utils";
import path from "path";
import FormData from "form-data";

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

/**
 * Handles a game with no replay by sending a post request to the server with no replay file and replayNumb set to 0
 */
const handleNoReplay = async (formData: FormData) => {
  // Set replayNumb to 0 to indicate the game does not have a replay
  formData.append("replayNumb", "0");

  // Send game data to server and update the num_replays field to 0
  const replayRes = await fetch(`${BASE_LOCALHOST_URL}/parser/replay`, {
    method: "POST",
    body: formData,
  });

  const replayData = (await replayRes.json()) as ReplayResponseData;

  console.log(replayData);
};

type ReplayResponseData =
  | { success: true }
  | { success: false; message: string };

async function parseReplays() {
  const replays: ReplayData[] = [];

  // Read the csv file and add data to replays array
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

          await handleNoReplay(formData);

          continue;
        }

        const fileName = `${replay.home}_${replay.away}_${i}`;

        // Get the replayId from the replay link, which is everything after "nagranie="
        const replayId = getQueryParam(replay.replay, "nagranie");

        // Save the replay to the replay folder
        const file = fs.createWriteStream(
          `${path.dirname(__dirname)}\\replays\\${fileName}.hbr2`
        );

        // Get request to download the replay
        const res = await fetch(
          `https://thehax.pl/forum/powtorki.php?action=pobierz&nagranie=${replayId}`,
          {
            method: "GET",
          }
        );

        // Replay not found or broken link
        if (res.status === 503) {
          console.log(
            `Replay Link Error: ${replay.home} vs ${replay.away} | ${replay.date} `
          );

          await handleNoReplay(formData);

          continue;
        }

        await new Promise((resolve, reject) => {
          // For some reason the file wasn't downloaded
          if (res.body === null) {
            console.error("File failed to download");
            return reject();
          }

          // Pipe the file into the write stream to send it to the replays directory
          res.body.pipe(file);

          res.body.on("error", reject);
          file.on("finish", resolve);
        });

        // Get the downloaed replay file
        const replayFile = fs.createReadStream(
          `${path.dirname(__dirname)}\\replays/${fileName}.hbr2`
        );

        // Append the file to our formData to send to the server
        formData.append("file", replayFile);
        formData.append("date", replay.date);
        formData.append("replayNumb", REPLAY_NUMB);

        // Send to our server
        const replayRes = await fetch(`${BASE_LOCALHOST_URL}/parser/replay`, {
          method: "POST",
          body: formData,
        });

        const replayData = (await replayRes.json()) as ReplayResponseData;

        console.log(replayData);
      }
    });
}

export default parseReplays;
