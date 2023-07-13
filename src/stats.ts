import SETTINGS, { BASE_LOCALHOST_URL } from "./settings";
import { limitNumberWithinRange, parseStringArrToIntArr, round } from "./utils";
import fetch from "node-fetch";

export async function mapPlayerReport(
  playerRow: string[],
  teamId: number,
  teamPtsFor: number,
  teamPtsAgainst: number,
  roomId: number
) {
  // Map the array of strings to an actual object of integer values
  const stats = mapStatsToObject(playerRow);

  const [name] = playerRow;

  // Trim the player name since its not trimmed in some cases
  const playerNameTrimmed = name.trim();

  const playerId = await getPlayerId(playerNameTrimmed, teamId);

  // We say anyone played 26 mins, even if they really didn't, impossible to tell
  const MIN_P = 26;

  const rec_fpts = getFantasyPoints(stats, RECEIVER_FPTS_SCORING);
  const qb_fpts = getFantasyPoints(stats, QB_FPTS_SCORING);

  const w = teamPtsFor > teamPtsAgainst ? 1 : 0;
  const l = w === 1 ? 0 : 1;

  const passAtt = stats.pa_c + stats.pa_d + stats.pa_m;

  const res = await fetch(`${BASE_LOCALHOST_URL}/parser/getplayerelo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({
      playerId: playerId,
      division: SETTINGS.DIVISION,
    }),
  });

  const { elo } = (await res.json()) as { elo: number };

  return {
    player_id: playerId,
    is_verified: true,
    // Every player in a game gets a unique integer ID, for our case this is just the index of the row they appear in the HTML table + 1
    room_id: roomId,
    team_id: teamId,
    name: playerNameTrimmed,
    // Cant extract their IP or Auth
    ip: "",
    w,
    l,
    auth: "",
    minp: MIN_P,
    ptsf: teamPtsFor,
    ptsa: teamPtsAgainst,
    rec_fpts,
    qb_fpts,
    // Decide if they were the QB or not, using stats
    poso: passAtt > 8 && passAtt > stats.rec_c ? "QB" : "WR",
    // We cant track what defensive position they played so its always NA
    posd: "NA",
    elo_change: elo,
    ...stats,
    // If they had a pass attempt, they had played QB the entire snap, only snap stat that is legit
    snp_qb: passAtt,
    snp_wr: 0,
    snp_dr: 0,
    snp_mr: 0,
    snp_fb: 0,
    snp_cb: 0,
    snp_lb: 0,
    snp_fs: 0,
  };
}

/**
 * NFL passer rating formula, adjusted to weight thrown interceptions more since they are rarer in HFL than NFL
 */
function getPasserRating({
  cmp,
  att,
  pyds,
  tdp,
  intt,
}: {
  cmp: number;
  att: number;
  pyds: number;
  tdp: number;
  intt: number;
}) {
  if (att < 5) return null;

  const a = limitNumberWithinRange((cmp / att - 0.3) * 5, 0, 2.375);
  const b = limitNumberWithinRange((pyds / att - 3) * 0.25, 0, 2.375);
  const c = limitNumberWithinRange((tdp / att) * 20, 0, 2.375);
  const d = limitNumberWithinRange(2.375 - (intt / att) * 25, -1, 2.375);

  return round(((a + b + c + d) / 6) * 100, 1);
}

export type PlayerReport = Awaited<ReturnType<typeof mapPlayerReport>>;

async function getPlayerId(
  name: string,
  playerTeamId: number
): Promise<string> {
  // Dont memoize because the getPlayer because the request also:
  // 1. Creates a PlayerSeasonStat record for that season and division if the player doesnt have one
  // 2. Updates the players team if we pass in a different team than the one they are currently on

  // if (PLAYER_ID_MEMO[name]) return PLAYER_ID_MEMO[name];

  const res = await fetch(`${BASE_LOCALHOST_URL}/parser/getplayer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({
      name: name,
      teamId: playerTeamId,
      seasonId: SETTINGS.SEASON,
      division: SETTINGS.DIVISION,
    }),
  });

  const { player_id } = (await res.json()) as { player_id: string };

  return player_id;
}

export const appendEloValue = (
  playerReports: PlayerReport[],
  newEloChange: number
) => {
  playerReports.forEach((report) => {
    report.elo_change = newEloChange;
  });

  return playerReports;
};

export const getTeamAverageElo = (playerReports: PlayerReport[]) => {
  if (playerReports.length === 0) return 1500;

  const { val, count } = playerReports.reduce(
    (acc, val) => {
      // Dont count people who had no fantasy points, since that means they probs played minimal minutes
      // and didn't really impact the game
      // if (val.rec_fpts === 0 && val.qb_fpts === 0) return acc;
      acc.val += val.elo_change;
      acc.count++;
      return acc;
    },
    { val: 0, count: 0 } as { val: number; count: number }
  );

  if (count === 0) return 1500;

  return Math.round(val / count);
};

export const getTeamTotalYards = (playerReports: PlayerReport[]) => {
  return playerReports.reduce((acc, val) => {
    acc += val.rec_c + val.ru_yd + val.pas_yd_c;
    return acc;
  }, 0);
};

function mapStatsToObject(playerRow: string[]) {
  const [_name, ...stats] = playerRow;

  let [recyd, rec, ruyd, ratt, pyds, cmp, att, pd, tak, tdp, tdr, intr, intt] =
    parseStringArrToIntArr(stats);

  const passerRating = getPasserRating({ cmp, att, pyds, tdp, intt });

  // Checks and adjustments to stats as a result of human error when the stats were inputted

  if (recyd > 0 && rec === 0) {
    console.log(
      `${_name} had ${recyd} receiving yards but 0 receptions. FIXED`
    );
    rec = 1;
  }

  if (ruyd > 0 && ratt === 0 && att === 0) {
    console.log(
      `${_name} had ${ruyd} rushing yards but 0 rushing attempts. FIXED`
    );
    ratt = 1;
  }

  if (pyds > 0 && att === 0) {
    console.log(`${_name} had ${pyds} passing yards but 0 attempts. FIXED`);
    att = 1;
  }

  return {
    // Receiving
    rec_c: rec,
    rec_m: 0,
    rec_d: 0,
    rec_yd_c: recyd,
    rec_yd_m: 0,
    rec_yd_d: 0,
    rec_yd_ac: 0,
    ru_att: ratt,
    ru_yd: ruyd,
    td_rec: tdr,
    td_rush: 0,
    // Passing
    pa_c: att,
    pa_m: 0,
    pa_d: 0,
    pc_c: cmp,
    pc_m: 0,
    pc_d: 0,
    pas_yd_c: pyds,
    pas_yd_m: 0,
    pas_yd_d: 0,
    pas_yd_dis: 0,
    qb_rush_yds: 0,
    qb_rush_att: 0,
    qb_sak: 0,
    td_pas: tdp,
    int_t: intt,
    cpa: 0,
    cpc: 0,
    cp_yds: 0,
    dis_bef_pass: 0,
    tim_to_pass: 0,
    qb_rating: passerRating,
    // Defense
    pd: pd,
    tak: tak,
    sak: 0,
    int_r: intr,
    // Misc
    fg_a: 0,
    fg_c: 0,
    fg_ya_a: 0,
    fg_ya_c: 0,
    onside_a: 0,
    onside_c: 0,
    spec_rec: 0,
    spec_rec_yd: 0,
    spec_rec_td: 0,
    spec_tak: 0,
    pen: 0,
  };
}

const RECEIVER_FPTS_SCORING: Partial<
  Record<keyof ReturnType<typeof mapStatsToObject>, number>
> = {
  ru_yd: 0.2,
  td_rush: 8,
  rec_c: 1,
  rec_yd_c: 0.1,
  td_rec: 6,
};

const QB_FPTS_SCORING: Partial<
  Record<keyof ReturnType<typeof mapStatsToObject>, number>
> = {
  pas_yd_c: 0.05,
  td_pas: 4,
  int_t: -3,
};

export function getFantasyPoints(
  stats: ReturnType<typeof mapStatsToObject>,
  scoring: Partial<Record<keyof ReturnType<typeof mapStatsToObject>, number>>
) {
  return round(
    Object.entries(stats).reduce((acc, val) => {
      const [statName, statValue] = val;
      if (!scoring[statName]) return acc;
      if (statValue === null) return acc;

      const statValueMultiplied = statValue * scoring[statName];

      return acc + statValueMultiplied;
    }, 0),
    1
  );
}
