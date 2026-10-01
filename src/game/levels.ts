// Legend
// # wall   . floor   G glass (bullets pass, breakable)   T furniture (blocks walking, not bullets)
// D door (auto orientation)   E exit   P player start
// Enemies: m=bat  k=knife  p=pistol  s=shotgun  u=uzi  r=rifle  f=unarmed  B=BIG BOSS
// Pickups: b=bat  n=knife  K=katana  i=pipe  1=pistol  2=shotgun  3=uzi  4=rifle  Z=sniper

export interface LevelDef {
  name: string;
  sub: string;
  map: string[];
  environment?: 'rooftop';
  entryAngle?: number;
  starterLoadout?: boolean;
  introHint?: string;
  helipad?: { x: number; y: number; radius: number };
}

// A rectangular arena with strategic wall cover, tactical flanking routes and entry doors.
function createRooftopMap(): string[] {
  const width = 48, height = 26;
  const grid: string[][] = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.'));
  // Perimeter glass railings (bullets can pass or shatter)
  for (let x = 2; x < width - 2; x++) grid[1][x] = 'G';
  for (let y = 2; y < 22; y++) { grid[y][1] = 'G'; grid[y][width - 2] = 'G'; }

  // Solid tactical pillars & blast barricades providing real bullet cover from the boss
  for (const [px, py] of [[6, 6], [15, 13], [10, 18], [34, 6], [31, 12], [36, 18], [20, 17], [27, 17]]) {
    for (let y = py; y < py + 2; y++) for (let x = px; x < px + 2; x++) grid[y][x] = '#';
  }

  // Tactical cover furniture for flanking
  for (const [tx, ty] of [[18, 14], [29, 14], [7, 12], [40, 12]]) grid[ty][tx] = 'T';

  // Entry blast wall separating staging area
  for (let x = 1; x < width - 1; x++) grid[22][x] = '#';
  // Strategic entry doors that block bullets until pushed/kicked open
  grid[22][23] = grid[22][24] = 'D';

  // Player start and strategic loadout in staging room
  grid[24][20] = 'P';
  grid[23][22] = '2'; // Entry shotgun
  grid[24][27] = 'E'; // Exit

  // High-value weapons in strategic cover spots inside arena:
  grid[4][24] = 'B';  // BIG BOSS at helipad command post
  grid[14][4] = 'Z';  // Sniper rifle on left flank (clear sniper firing lane)
  grid[13][24] = 'K'; // Katana in central zone behind bunker cover
  grid[17][7] = 'm';
  grid[17][40] = 'm';

  return grid.map((row) => row.join(''));
}

export const LEVELS: LevelDef[] = [
  {
    name: 'OFFICE',
    sub: 'FLOOR 23 — 03:12 AM',
    map: [
      '##########################################',
      '#......#.........G.......#...............#',
      '#..P...#..TT..TT.G..TT...#..TT....TT.....#',
      '#......D.........G.......D...............#',
      '#......#..TT..TT.G..TT...#..TT..p.TT.....#',
      '#..b...#......m..G.......#...............#',
      '####D###.........G...f...#######D#########',
      '#......#GGGGDGGGGG.......#...............#',
      '#......#.................D.......m.......#',
      '#..1...#...TTTT...p......#...............#',
      '#......#...TTTT..........#..TTTTTTTT.....#',
      '#......D.................#..TTTTTTTT..u..#',
      '#......#.......k.........#...............#',
      '#..E...###########D#######.....p.........#',
      '#......#.................................#',
      '#......#....s.......TTT..........B.......#',
      '#......D............TTT..................#',
      '##########################################',
    ],
  },
  {
    name: 'LOBBY',
    sub: 'MARBLE HALL — ELEVATOR B',
    map: [
      '##############################################',
      '#.........#......................#...........#',
      '#..P......#...TT.......TT........#...p.......#',
      '#.........#......................#...........#',
      '#.........D.......u..............D...........#',
      '#.........#...TT.......TT........#.....s.....#',
      '#....n....#.....................m#...........#',
      '#####D#####GGGGGGG.....GGGGGGGGGG#####D#######',
      '#..........................................r.#',
      '#...TTTTTT.......p..............TTTTTT.......#',
      '#............................................#',
      '#...TTTTTT..........m...........TTTTTT...p...#',
      '#........................f...................#',
      '######D###########GGG.GGG##########D##########',
      '#.........#..............#...................#',
      '#...k.....#.....TTT......D......p.....TT.....#',
      '#.........D.....TTT......#............TT..m..#',
      '#..E......#..............#...................#',
      '##############################################',
    ],
  },
  {
    name: 'BAR',
    sub: 'LAST CALL — BASEMENT CLUB',
    map: [
      '############################################',
      '#P...#.............................#.......#',
      '#....#..TT....TT....TT....TT.......#...s...#',
      '#....D.............................D.......#',
      '#....#..TT....TT....TT....TT...m...#.......#',
      '#.i..#.............................#...p...#',
      '##D###...............p.............#########',
      '#....#.............................#.......#',
      '#....#TTTTTTTTTTTTTTTT.....TTT.....D...K...#',
      '#....#.....................TTT.....#.......#',
      '#....#...m......u..................#...f...#',
      '#....#################D#############D#######',
      '#....D.........................#...........#',
      '#....#...TTT........TTT.....p..D...r.......#',
      '#.E..#...TTT...k....TTT........#.......TT..#',
      '#....#.........................#.......TT..#',
      '############################################',
    ],
  },
  {
    name: 'SUBWAY',
    sub: 'LINE 9 — LAST TRAIN',
    map: [
      '##################################################',
      '#P.......#.......................................#',
      '#........#..#....#....#....#....#....#....#......#',
      '#...1....D.....p............m.........u..........#',
      '#........#..#....#....#....#....#....#....#......#',
      '#........#.............................s.........#',
      '##D#######GGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGG##D##',
      '#................................................#',
      '#..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...#',
      '#..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...#',
      '#......p..........f.........r..............k.....#',
      '##GGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGG####',
      '#...........#......................#.............#',
      '#..E........D....m.......TT....p...D.....u.......#',
      '#...........#............TT........#.............#',
      '##################################################',
    ],
  },
  {
    name: 'PENTHOUSE',
    sub: 'TOP FLOOR — THE END',
    map: [
      '##############################################',
      '#.......#...........G..........G.............#',
      '#.P.....#....TT.....G....r.....G....TTTT.....#',
      '#.......D....TT.....G..........G....TTTT..s..#',
      '#...K...#...........D..........D.............#',
      '#.......#....p......G....TT....G.........u...#',
      '####D####...........G....TT....G.............#',
      '#.......#GGGGGGDGGGGG..........GGGGGGGDGGGGGG#',
      '#.......D........................m...........#',
      '#...3...#...TTTTTT.........p.........TTTTT...#',
      '#.......#...TTTTTT...................TTTTT...#',
      '#.......#........u.........f.................#',
      '#.......####D#########D##########D############',
      '#.E.....#.........#..........#...............#',
      '#.......D...s.....D....m.....D.....r....TT...#',
      '#.......#.........#..........#..........TT.p.#',
      '##############################################',
    ],
  },
  {
    name: 'ROOFTOP',
    sub: 'HELIPAD — THE FINAL CALL',
    environment: 'rooftop',
    entryAngle: -Math.PI / 2,
    starterLoadout: false,
    helipad: { x: 24, y: 11, radius: 5 },
    introHint: 'BIG BOSS / M16 — pilar solid = cover. Sniper di sisi kiri, katana di tengah.',
    map: createRooftopMap(),
  },
];
