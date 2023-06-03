import Puppeteer, { ElementHandle } from "puppeteer";
import SETTINGS, { BASE_LOCALHOST_URL } from "./settings";
import gamesList, { GameLink } from "./gamesList";
import EloCalculator, { GameType } from "./EloCalculator";
import {
  mapPlayerReport,
  getTeamAverageElo,
  getTeamTotalYards,
  appendEloValue,
  PlayerReport,
} from "./stats";
import { parseStringArrToIntArr } from "./utils";

const TEAM_ID_MEMO = {};

type TableWithRowElements = string[][];

export const processDataForTeam = async (data: {
  ownScore: number;
  oppScore: number;
  teamName: string;
  roomIdIndex: number;
  teamPlayers: TableWithRowElements;
}) => {
  const { ownScore, oppScore, teamName, roomIdIndex, teamPlayers } = data;

  let newRoomIdIndex = roomIdIndex;

  const teamId = await getTeamId(teamName);

  const playerReports = await Promise.all(
    teamPlayers.map(async (player) => {
      newRoomIdIndex++;
      return await mapPlayerReport(
        player,
        teamId,
        ownScore,
        oppScore,
        newRoomIdIndex
      );
    })
  );

  const averageElo = getTeamAverageElo(playerReports);
  const marginVictory = ownScore - oppScore;
  const totalYards = getTeamTotalYards(playerReports);

  return {
    teamId,
    playerReports,
    averageElo,
    totalYards,
    newRoomIdIndex,
    marginVictory,
  };
};

async function getTeamId(teamName: string): Promise<number> {
  if (TEAM_ID_MEMO[teamName]) return TEAM_ID_MEMO[teamName];

  const res = await fetch(`${BASE_LOCALHOST_URL}/parser/getteam`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({
      name: teamName,
    }),
  });

  const { team_id } = (await res.json()) as { team_id: number };

  TEAM_ID_MEMO[teamName] = team_id;

  return team_id;
}

async function getTextContentArr(elems: ElementHandle[]) {
  return (await Promise.all(
    elems.map(async (el) => (await el.getProperty("textContent")).jsonValue())
  )) as string[];
}

const NEW_NAME_MAP = {
  "6": {
    "Anti Larva Area": "Baxton Bay Boomers",
    "Red Berries": "Baby Otters",
    "Vauxhall Vanguard": "Caerdydd Rheolwyr",
    "Rio Raptors": "Panama Beach",
    "Chicago Cockatoos": "Augusta Mourning Doves",
  },
  "7": {
    "Anti Larva Area": "Anti Larva Area",
    "Red Berries": "Loona Orbits",
    "Vauxhall Vanguard": "Vauxhall Vanguard",
    "Rio Raptors": "Havana Hurricanes",
    "Tree House Gamers": "Riverside Groundhawks",
  },
  "8": {},
};

const getTeamName = ({
  division,
  season,
  teamName,
}: {
  division: number;
  season: number;
  teamName: string;
}) => {
  if (teamName === "LOONAVERSE") return "Loonaverse";

  if (division === 1) return teamName;

  return NEW_NAME_MAP[season.toString()][teamName] as string;
};

async function toGameObject(
  page: Puppeteer.Page,
  date: string,
  index: number,
  type: GameLink["type"]
) {
  const [homeTeamNameStr, awayTeamNameStr] = await getTextContentArr(
    await page.$$(".sp-team-name")
  );
  const [homeTeamScore, awayTeamScore] = parseStringArrToIntArr(
    await getTextContentArr(await page.$$(".sp-team-result"))
  );

  const gameType = type ? type : "SEASON";

  const homeTeamName = getTeamName({
    division: SETTINGS.DIVISION,
    season: SETTINGS.SEASON,
    teamName: homeTeamNameStr,
  });
  const awayTeamName = getTeamName({
    division: SETTINGS.DIVISION,
    season: SETTINGS.SEASON,
    teamName: awayTeamNameStr,
  });

  console.log(
    `Processing: ${homeTeamName}: ${homeTeamScore} vs ${awayTeamName}: ${awayTeamScore}`
  );

  // Three dimensional arrow of table rows
  const [homeTeamPlayers, awayTeamPlayers] = (await page.$$eval<
    string,
    any[],
    Puppeteer.EvaluateFunc<[HTMLTableSectionElement, HTMLTableSectionElement][]>
  >("table tbody", (tableArr: HTMLTableSectionElement[]) => {
    return tableArr.map((table) =>
      Array.from(table.rows).map((row) =>
        Array.from(row.cells).map((cell) => cell.innerText)
      )
    );
  })) as [TableWithRowElements, TableWithRowElements];

  //   if (homeTeamPlayers[0][0] === "0") {
  //     skippedGames.push(`SKIPPED ${date} ${homeTeamName} VS ${awayTeamName}`);
  //     return;
  //   }

  const home = await processDataForTeam({
    ownScore: homeTeamScore,
    oppScore: awayTeamScore,
    roomIdIndex: 0,
    teamName: homeTeamName,
    teamPlayers: homeTeamPlayers,
  });

  const away = await processDataForTeam({
    ownScore: awayTeamScore,
    oppScore: homeTeamScore,
    roomIdIndex: home.newRoomIdIndex,
    teamName: awayTeamName,
    teamPlayers: awayTeamPlayers,
  });

  const { delta: homeDelta } = new EloCalculator({
    div: SETTINGS.DIVISION,
    gameType,
    team1Elo: home.averageElo,
    team2Elo: away.averageElo,
    team1MargVictory: home.marginVictory,
  });

  const { delta: awayDelta } = new EloCalculator({
    div: SETTINGS.DIVISION,
    gameType,
    team1Elo: away.averageElo,
    team2Elo: home.averageElo,
    team1MargVictory: away.marginVictory,
  });

  const homeNewReports = appendEloValue(home.playerReports, homeDelta);
  const awayNewReports = appendEloValue(away.playerReports, awayDelta);

  const { gameId } = await uploadGame({
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    gameType,
    homeTeamScore,
    awayTeamScore,
    date,
    index,
    players: [...homeNewReports, ...awayNewReports],
    homeElo: {
      average: home.averageElo,
      net: homeDelta,
    },
    awayElo: {
      average: away.averageElo,
      net: awayDelta,
    },
    homeYards: home.totalYards,
    awayYards: away.totalYards,
  });
}

function getWinningTeam({
  homeTeamScore,
  awayTeamScore,
  homeTeamId,
  awayTeamId,
}: {
  homeTeamScore: number;
  awayTeamScore: number;
  homeTeamId: number;
  awayTeamId: number;
}) {
  if (homeTeamScore > awayTeamScore) return homeTeamId;
  return awayTeamId;
}

async function uploadGame({
  homeTeamId,
  awayTeamScore,
  homeTeamScore,
  awayTeamId,
  homeYards,
  awayYards,
  date,
  index,
  players,
  homeElo,
  awayElo,
  gameType,
}: {
  homeTeamScore: number;
  awayTeamScore: number;
  homeTeamId: number;
  awayTeamId: number;
  homeYards: number;
  awayYards: number;
  date: string;
  index: number;
  players: PlayerReport[];
  homeElo: {
    net: number;
    average: number;
  };
  awayElo: {
    net: number;
    average: number;
  };
  gameType: GameType;
}) {
  console.log({ homeElo, awayElo });

  const winningTeamId = getWinningTeam({
    homeTeamScore,
    awayTeamScore,
    homeTeamId,
    awayTeamId,
  });

  const game = {
    season_id: SETTINGS.SEASON,
    division: SETTINGS.DIVISION,
    day: Math.floor((index + SETTINGS.TEAMS / 2) / (SETTINGS.TEAMS / 2)),
    type: gameType,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_score: homeTeamScore,
    away_score: awayTeamScore,
    duration: 780,
    is_ot: false,
    winning_team_id: winningTeamId,
    home_elo: homeElo.average,
    away_elo: awayElo.average,
    home_net_elo: homeElo.net,
    away_net_elo: awayElo.net,
    home_yds: homeYards,
    away_yds: awayYards,
    scheduled_date: date,
    played_date: date,
    num_replays: 1,
    players,
  };

  const res = await fetch("http://localhost:3000/api/haxball/uploadgame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ game }),
  });

  const { id } = (await res.json()) as { id: string };

  if (!id) throw Error("RUH ROH");

  return {
    gameId: id,
    homeTeamId,
    awayTeamId,
  };
}

const skippedGames: string[] = [];

async function parseGames() {
  const browser = await Puppeteer.launch({
    headless: true,
  });

  const page = (await browser.pages())[0];

  for (var i = gamesList.length - 1; i > -1; i--) {
    const game = gamesList[i];
    await page.goto(game.link, {
      waitUntil: "networkidle2",
    });

    await toGameObject(page, game.date, gamesList.length - 1 - i, game.type);
  }

  await skippedGames.forEach((el) => console.log(el));
  await console.log("Done");
}

export default parseGames;
