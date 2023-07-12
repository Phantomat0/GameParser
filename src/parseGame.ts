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
import fetch from "node-fetch";

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

// The schedule shows the latest team names for the teams, but on the replay CSV it uses the team names from that current season, so we have to transform the latest team name to the team name used in that season
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
  "8": {
    "Porto Corsa Asteroids": "Flip Gear",
    "Tree House Gamers": "New Jersey Philly Specials",
    "Rio Raptors": "Mexico City Aztecs",
    "Chicago Cockatoos": "Bubble’s Ice Penguins",
    "Red Berries": "Loona Orbits",
    "Vauxhall Vanguard": "Incheon Butterflies",
  },
};

/**
 * Adjusts the names of teams since some teams had changed their names over the course of different seasons
 */
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

const getHomeAndAwayScoreForfeit = (forfeitType: GameLink["isForfeit"]) => {
  const FORFEIT_WIN_SCORE = 22;
  const FORFEIT_LOSE_SCORE = 0;

  if (forfeitType == "none")
    return {
      homeScore: FORFEIT_LOSE_SCORE,
      awayScore: FORFEIT_LOSE_SCORE,
    };

  if (forfeitType == "home")
    return {
      homeScore: FORFEIT_WIN_SCORE,
      awayScore: FORFEIT_LOSE_SCORE,
    };

  return {
    homeScore: FORFEIT_LOSE_SCORE,
    awayScore: FORFEIT_WIN_SCORE,
  };
};

async function processForfeitGame({
  index,
  date,
  homeTeamName,
  awayTeamName,
  forfeitType,
}: {
  index: number;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
  forfeitType: GameLink["isForfeit"];
}) {
  const homeTeamId = await getTeamId(homeTeamName);
  const awayTeamId = await getTeamId(awayTeamName);

  const { homeScore, awayScore } = getHomeAndAwayScoreForfeit(forfeitType);

  if (forfeitType)
    await uploadGame({
      homeTeamId,
      awayTeamId,
      homeElo: { average: 0, net: 0 },
      awayElo: { average: 0, net: 0 },
      homeYards: 0,
      awayYards: 0,
      gameType: "SEASON",
      date,
      players: [],
      index,
      homeTeamScore: homeScore,
      awayTeamScore: awayScore,
      isForfeit: true,
    });
}

async function toGameObject(
  page: Puppeteer.Page,
  game: GameLink,
  index: number
) {
  const { date, isForfeit, type } = game;

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

  if (isForfeit)
    return await processForfeitGame({
      index,
      homeTeamName,
      awayTeamName,
      date,
      forfeitType: isForfeit,
    });

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
    isForfeit: true,
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
  if (awayTeamScore > homeTeamScore) return awayTeamId;
  return null;
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
  isForfeit,
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
  isForfeit: boolean;
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
    // Each team plays once per day, based on the index matchup, we can tell which match day we are on
    // i.e a league with 4 teams means every 2 games the day changes
    // Game 5 would be (4 + (4 / 2)) / (4 / 2) = (4 + 2) / 2 = 6 / 2 = 3, Day 3
    day: Math.floor((index + SETTINGS.TEAMS / 2) / (SETTINGS.TEAMS / 2)),
    type: gameType,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_score: homeTeamScore,
    away_score: awayTeamScore,
    // 13 minutes in seconds
    duration: 780,
    // No OT by default
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
    // By default set that every game has one replay, we will change this later when we are uploading replays
    num_replays: 1,
    is_forfeit: isForfeit,
    players,
  };

  const res = await fetch(`${BASE_LOCALHOST_URL}/parser/uploadgame`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ game }),
  });

  const { id } = (await res.json()) as { id: string };

  if (!id) throw Error("Error uploading game");

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

  // Loop in reverse order that we get the matchdays in chronological order, since they print in reverse
  for (var i = gamesList.length - 1; i > -1; i--) {
    const game = gamesList[i];
    await page.goto(game.link, {
      waitUntil: "networkidle2",
    });

    await toGameObject(page, game, gamesList.length - 1 - i);
  }

  await skippedGames.forEach((el) => console.log(el));
  await console.log("Done");
}

export default parseGames;
