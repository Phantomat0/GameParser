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
  // in the format March 15 2005
  date: string;
  home: string;
  // In the format of 0 - 0 as a string ; not really used
  score: string;
  away: string;
  // The actual text that says "Replay"
  replay_str: string;

  // The URL of the replay, will be an empty string if no replay exists
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
      if (data.replay_two) {
        replays.push({
          // Parse as int as CSV's are strings
          season: parseInt(data.season),
          date: data.date,
          home: data.home,
          score: data.score,
          away: data.away,
          replay_str: data.replay_str,
          replay: data.replay_two,
        });
      }
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

        // Create a unique file name for this replay, that we can easily tell what matchup it is for
        const fileName = `${replay.home}_${replay.away}_${i}`;

        // Get the replayId from the replay link, which is everything after "nagranie="
        const replayId = getQueryParam(replay.replay, "nagranie");

        // Save the replay to the replay folder
        const file = fs.createWriteStream(
          `${path.dirname(__dirname)}\\replays\\${fileName}.hbr2`
        );

        // Get request to download the replay
        const res = await fetch(
          `https://replay.thehax.pl/${replayId}/download`,
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
        // Server will do the following:
        // 1. Get both teams by name, throws an error if teams are not found
        // 2. Using team ids, find the first game record occurrence of that home vs away matchup in that season that has a replay_numb of 1
        // 3. Edit the Game record's numb_replays to to the replayNumb we pass in, in the case of no replay its set to 0
        // 4. Get the id of the game, and rename our replay file we pass in to the gameId + replayNumb
        // 5. Upload the replay file to our supabase bucket
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
