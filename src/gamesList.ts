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
    date: "2019-12-16T02:00:00.000Z",
    link: "http://hflexport.local/event/flip-gear-vs-new-jersey-sweaty-specials/",
    type: "FINAL",
    customDate: 2,
  },
  {
    date: "2019-12-13T02:00:00.000Z",
    link: "http://hflexport.local/event/mexico-city-aztecs-vs-flip-gear/",
    type: "PLAYOFF",
    customDate: 1,
  },
  {
    date: "2019-12-13T02:00:00.000Z",
    link: "http://hflexport.local/event/new-jersey-philly-specials-vs-bubbles-ice-penguins/",
    type: "PLAYOFF",
    customDate: 1,
  },
  {
    date: "2019-12-09T02:00:00.000Z",
    link: "http://hflexport.local/event/1358/",
  },
  {
    date: "2019-12-09T02:00:00.000Z",
    link: "http://hflexport.local/event/1359/",
  },
  {
    date: "2019-12-09T02:00:00.000Z",
    link: "http://hflexport.local/event/1360/",
  },
  {
    date: "2019-12-06T02:00:00.000Z",
    link: "http://hflexport.local/event/1355/",
  },
  {
    date: "2019-12-06T02:00:00.000Z",
    link: "http://hflexport.local/event/1356/",
  },
  {
    date: "2019-12-06T02:00:00.000Z",
    link: "http://hflexport.local/event/1357/",
  },
  {
    date: "2019-12-02T02:00:00.000Z",
    link: "http://hflexport.local/event/1354/",
  },
  {
    date: "2019-12-02T02:00:00.000Z",
    link: "http://hflexport.local/event/1352/",
  },
  {
    date: "2019-12-02T02:00:00.000Z",
    link: "http://hflexport.local/event/1353/",
  },
  {
    date: "2019-11-29T02:00:00.000Z",
    link: "http://hflexport.local/event/1349/",
  },
  {
    date: "2019-11-29T02:00:00.000Z",
    link: "http://hflexport.local/event/1350/",
  },
  {
    date: "2019-11-29T02:00:00.000Z",
    link: "http://hflexport.local/event/1351/",
  },
  {
    date: "2019-11-25T02:00:00.000Z",
    link: "http://hflexport.local/event/1346/",
  },
  {
    date: "2019-11-25T02:00:00.000Z",
    link: "http://hflexport.local/event/1347/",
  },
  {
    date: "2019-11-25T02:00:00.000Z",
    link: "http://hflexport.local/event/1348/",
  },
  {
    date: "2019-11-22T02:00:00.000Z",
    link: "http://hflexport.local/event/1343/",
  },
  {
    date: "2019-11-22T02:00:00.000Z",
    link: "http://hflexport.local/event/1344/",
  },
  {
    date: "2019-11-22T02:00:00.000Z",
    link: "http://hflexport.local/event/1345/",
  },
  {
    date: "2019-11-18T02:00:00.000Z",
    link: "http://hflexport.local/event/1340/",
  },
  {
    date: "2019-11-18T02:00:00.000Z",
    link: "http://hflexport.local/event/1341/",
  },
  {
    date: "2019-11-18T02:00:00.000Z",
    link: "http://hflexport.local/event/1342/",
  },
  {
    date: "2019-11-15T02:00:00.000Z",
    link: "http://hflexport.local/event/1338/",
    isForfeit: "home",
  },
  {
    date: "2019-11-15T02:00:00.000Z",
    link: "http://hflexport.local/event/1339/",
  },
  {
    date: "2019-11-15T02:00:00.000Z",
    link: "http://hflexport.local/event/1337/",
  },
  {
    date: "2019-11-11T02:00:00.000Z",
    link: "http://hflexport.local/event/1334/",
  },
  {
    date: "2019-11-11T02:00:00.000Z",
    link: "http://hflexport.local/event/1335/",
  },
  {
    date: "2019-11-11T02:00:00.000Z",
    link: "http://hflexport.local/event/1336/",
  },
  {
    date: "2019-11-08T02:00:00.000Z",
    link: "http://hflexport.local/event/1331/",
  },
  {
    date: "2019-11-08T02:00:00.000Z",
    link: "http://hflexport.local/event/1332/",
  },
  {
    date: "2019-11-08T02:00:00.000Z",
    link: "http://hflexport.local/event/1333/",
  },
];

export default gamesList;
