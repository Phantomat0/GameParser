interface EloCalculatorProps {
  div: 1 | 2;
  gameType: GameType;
  team1Elo: number;
  team2Elo: number;
  team1MargVictory: number;
}

// Different Elo K Factor multiplier based on game type
export type GameType = "SEASON" | "PLAYOFF" | "FINAL";

export function getWinChance(elo1: number, elo2: number): [number, number] {
  const elo1Chance = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const elo2Chance = 1 / (1 + Math.pow(10, (elo1 - elo2) / 400));
  return [elo1Chance, elo2Chance];
}

// Elo influenced by the following
// 1. Strength on own team
// 2. Strength of opponent
// 3. Match result (Win or loss)
// 4. Margin of victory (negative in the case of a loss)
// 5. Game type, regular season, playoffs, final
// 6. Division

export default class EloCalculator {
  private K_FACTOR = 32;

  oldElo: number;
  winChance: number;
  delta: number;
  newElo: number;

  constructor(props: EloCalculatorProps) {
    const { team1Elo, team2Elo } = props;

    const [winChance] = getWinChance(team1Elo, team2Elo);

    const kFactorMultiplier = this._getKFactorMultiplier(props);

    const eloDelta = this._getDelta(props, kFactorMultiplier);

    this.oldElo = team1Elo;
    this.winChance = winChance;
    this.delta = eloDelta;
    this.newElo = team1Elo + eloDelta;
  }

  private _getKFactorMultiplier({
    div,
    gameType,
    team1Elo,
    team2Elo,
    team1MargVictory,
  }: EloCalculatorProps): number {
    const GAME_TYPE_MULTIPLIERS: Record<typeof gameType, number> = {
      SEASON: 0.3,
      PLAYOFF: 0.6,
      FINAL: 1.1,
    };

    const DIV_MULTIPLIERS: Record<typeof div, number> = {
      1: 0.3,
      2: 0,
    };

    const winningTeamElo = team1MargVictory > 0 ? team1Elo : team2Elo;
    const losingTeamElo = team1MargVictory > 0 ? team2Elo : team1Elo;

    const corrAdjMultiplier =
      2.2 / ((winningTeamElo - losingTeamElo) * 0.001 + 2.2);

    const margVictoryMultiplier = Math.log(Math.abs(team1MargVictory) + 1);

    return (
      DIV_MULTIPLIERS[div] +
      GAME_TYPE_MULTIPLIERS[gameType] +
      corrAdjMultiplier +
      margVictoryMultiplier
    );
  }

  private _getTeam1Result(team1MargVictory: number) {
    const RESULTS = {
      WIN: 1,
      LOSS: 0,
      DRAW: 0.5,
    } as const;

    if (team1MargVictory === 0) return RESULTS.DRAW;
    if (team1MargVictory > 0) return RESULTS.WIN;
    return RESULTS.LOSS;
  }

  private _getDelta(
    { team1Elo, team2Elo, team1MargVictory }: EloCalculatorProps,
    kFactorMultiplier: number
  ) {
    const [winChance] = getWinChance(team1Elo, team2Elo);

    const team1Result = this._getTeam1Result(team1MargVictory);

    const delta = Math.round(
      this.K_FACTOR * kFactorMultiplier * (team1Result - winChance)
    );

    return delta;
  }
}
