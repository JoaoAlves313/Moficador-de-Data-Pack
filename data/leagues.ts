
interface League {
  key: string;
  name: string;
  ids: string[];
}

export const LEAGUES: League[] = [
  {
    key: 'brasileirao-a',
    name: 'Brasileirão Série A',
    ids: [
      "422", "407", "410", "400", "411", "401", "435", "408", "402", "428", 
      "416", "431", "414", "431", "414", "436", "5383", "438", "403", "6976", 
      "5378", "433"
    ]
  },
  {
    key: 'premier-league',
    name: 'Premier League',
    ids: [
      "810", "811", "802", "829", "830", "845", "856", "868", "877", "909", "915", "919", "920", "928", "933", "970", "977", "984", "990", "834"
    ]
  }
];
