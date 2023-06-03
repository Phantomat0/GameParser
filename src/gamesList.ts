export interface GameLink {
  link: string;
  date: string;
  type?: "FINAL" | "PLAYOFF";
  isForfeit?: "home" | "away";
}

const gamesList: GameLink[] = [];

export default gamesList;
