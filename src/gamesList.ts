export interface GameLink {
  link: string;
  date: string;
  type?: "FINAL" | "PLAYOFF";
  /**
   * The team that won the forfeit
   */
  isForfeit?: "home" | "away" | "none";
  customDate?: number;
}

/**
 
    type: "FINAL",
    customDate: 2,

    type: "PLAYOFF",
    customDate: 1,
 */

const gamesList: GameLink[] = [
  {
    date: "2019-08-22T01:00:00.000Z",
    link: "http://hflexport.local/event/baby-otters-vs-baxton-bay-boomers/",
    type: "FINAL",
    customDate: 2,
  },
  {
    date: "2019-08-19T01:00:00.000Z",
    link: "http://hflexport.local/event/panama-beach-vs-baby-otters/",
    type: "PLAYOFF",
    customDate: 1,
  },
  {
    date: "2019-08-12T01:00:00.000Z",
    link: "http://hflexport.local/event/1062/",
  },
  {
    date: "2019-08-12T01:00:00.000Z",
    link: "http://hflexport.local/event/1063/",
    isForfeit: "away",
  },
  {
    date: "2019-08-12T01:00:00.000Z",
    link: "http://hflexport.local/event/1064/",
  },
  {
    date: "2019-08-09T01:00:00.000Z",
    link: "http://hflexport.local/event/1060/",
  },
  {
    date: "2019-08-09T01:00:00.000Z",
    link: "http://hflexport.local/event/1061/",
  },
  {
    date: "2019-08-05T01:00:00.000Z",
    link: "http://hflexport.local/event/1058/",
  },
  {
    date: "2019-08-05T01:00:00.000Z",
    link: "http://hflexport.local/event/1059/",
  },
  {
    date: "2019-08-02T01:00:00.000Z",
    link: "http://hflexport.local/event/1057/",
  },
  {
    date: "2019-08-02T01:00:00.000Z",
    link: "http://hflexport.local/event/1056/",
  },
  {
    date: "2019-07-29T01:00:00.000Z",
    link: "http://hflexport.local/event/1054/",
  },
  {
    date: "2019-07-29T01:00:00.000Z",
    link: "http://hflexport.local/event/1055/",
  },
  {
    date: "2019-07-26T01:00:00.000Z",
    link: "http://hflexport.local/event/1051/",
  },
  {
    date: "2019-07-26T01:00:00.000Z",
    link: "http://hflexport.local/event/1053/",
  },
  {
    date: "2019-07-22T01:00:00.000Z",
    link: "http://hflexport.local/event/1049/",
  },
  {
    date: "2019-07-22T01:00:00.000Z",
    link: "http://hflexport.local/event/1050/",
  },
];

export default gamesList;
