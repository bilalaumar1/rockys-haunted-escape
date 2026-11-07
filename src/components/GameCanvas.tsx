import { useEffect, useRef } from 'react'
import './GameCanvas.css'
import rockyImage from '../assets/rocky/rocky-original.png'
import seismicImage from '../assets/collectibles/seismic-logo.png'
import gameBackgroundImage from '../assets/backgrounds/game-background.png'

const WIDTH = 960
const HEIGHT = 540
let WORLD_WIDTH = 3200
let GAME_DURATION = 180
let currentLevel = 1

type Platform = {
  x: number
  y: number
  width: number
}

type Player = {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  grounded: boolean
  facing: 1 | -1
}

type Collectible = {
  x: number
  y: number
}

type Ghost = {
  x: number
  y: number
  minX: number
  maxX: number
  speed: number
  direction: 1 | -1
  kind?: 'ghost' | 'pumpkin' | 'zombie' | 'vampire'
}

type GameCanvasProps = {
  onExit?: () => void
  soundVolume?: number
  musicVolume?: number
}

let platforms: Platform[] = [
  { x: 0, y: 455, width: 650 },
  { x: 720, y: 455, width: 500 },
  { x: 1300, y: 455, width: 550 },
  { x: 1930, y: 455, width: 500 },
  { x: 2510, y: 455, width: 690 },
  { x: 280, y: 360, width: 180 },
  { x: 820, y: 350, width: 190 },
  { x: 1100, y: 285, width: 180 },
  { x: 1480, y: 355, width: 190 },
  { x: 1760, y: 295, width: 180 },
  { x: 2110, y: 355, width: 190 },
  { x: 2400, y: 285, width: 180 },
]

let collectibles: Collectible[] = [
  { x: 350, y: 315 },
  { x: 900, y: 305 },
  { x: 1180, y: 240 },
  { x: 1550, y: 310 },
  { x: 1815, y: 250 },
]

let spikePositions = [570, 1050, 1680, 2310, 2810]

let initialGhosts: Ghost[] = [
  { x: 850, y: 405, minX: 760, maxX: 1160, speed: 90, direction: 1 },
  { x: 1450, y: 405, minX: 1320, maxX: 1810, speed: 110, direction: -1 },
  { x: 2050, y: 405, minX: 1950, maxX: 2380, speed: 100, direction: 1 },
  { x: 2650, y: 405, minX: 2530, maxX: 3050, speed: 120, direction: -1 },
]

// Level 2: longer route, tighter jumps, more traps and faster ghosts.
const LEVEL_2 = {
  worldWidth: 3200,
  duration: 210,
  platforms: [
    { x: 0, y: 455, width: 470 },
    { x: 555, y: 455, width: 365 },
    { x: 1010, y: 455, width: 360 },
    { x: 1460, y: 455, width: 365 },
    { x: 1915, y: 455, width: 355 },
    { x: 2360, y: 455, width: 350 },
    { x: 2800, y: 455, width: 400 },
    { x: 205, y: 365, width: 135 },
    { x: 610, y: 345, width: 145 },
    { x: 865, y: 300, width: 125 },
    { x: 1110, y: 355, width: 135 },
    { x: 1375, y: 292, width: 130 },
    { x: 1615, y: 350, width: 145 },
    { x: 1875, y: 290, width: 130 },
    { x: 2110, y: 350, width: 145 },
    { x: 2350, y: 285, width: 135 },
    { x: 2580, y: 350, width: 145 },
    { x: 2860, y: 330, width: 145 },
  ] as Platform[],
  collectibles: [
    { x: 270, y: 320 },
    { x: 690, y: 300 },
    { x: 925, y: 255 },
    { x: 1435, y: 247 },
    { x: 2580, y: 310 },
  ] as Collectible[],
  spikes: [390, 790, 1260, 1740, 2190, 2690, 2740],
  ghosts: [
    { x: 640, y: 405, minX: 570, maxX: 890, speed: 125, direction: 1 as const },
    { x: 1120, y: 405, minX: 1030, maxX: 1350, speed: 145, direction: -1 as const },
    { x: 1580, y: 405, minX: 1480, maxX: 1800, speed: 155, direction: 1 as const },
    { x: 2040, y: 405, minX: 1930, maxX: 2250, speed: 165, direction: -1 as const },
    { x: 2490, y: 405, minX: 2380, maxX: 2690, speed: 175, direction: 1 as const },
  ] as Ghost[],
}


// Level 3: tighter platform rhythm, elevated routes, denser spikes and faster ghosts.
// Every jump remains within the existing player physics range.
const LEVEL_3 = {
  worldWidth: 3200,
  duration: 230,
  platforms: [
    { x: 0, y: 455, width: 420 },
    { x: 510, y: 455, width: 340 },
    { x: 940, y: 455, width: 330 },
    { x: 1370, y: 455, width: 340 },
    { x: 1810, y: 455, width: 340 },
    { x: 2250, y: 455, width: 330 },
    { x: 2670, y: 455, width: 530 },
    { x: 180, y: 365, width: 135 },
    // Safe stepping stones bridge the long elevated-route gaps.
    // Each landing is within the player's horizontal and vertical jump range.
    { x: 400, y: 390, width: 120 },
    { x: 620, y: 340, width: 135 },
    { x: 850, y: 375, width: 120 },
    { x: 1080, y: 315, width: 135 },
    { x: 1290, y: 380, width: 120 },
    { x: 1510, y: 350, width: 140 },
    { x: 1730, y: 380, width: 120 },
    { x: 1950, y: 310, width: 140 },
    { x: 2160, y: 375, width: 120 },
    { x: 2370, y: 345, width: 140 },
    { x: 2580, y: 380, width: 120 },
    { x: 2780, y: 350, width: 145 },
  ] as Platform[],
  collectibles: [
    { x: 245, y: 320 },
    { x: 685, y: 295 },
    { x: 1145, y: 270 },
    { x: 2015, y: 265 },
    { x: 2435, y: 300 },
  ] as Collectible[],
  spikes: [330, 760, 1180, 1600, 2050, 2480, 2700, 2990],
  ghosts: [
    { x: 560, y: 405, minX: 520, maxX: 830, speed: 155, direction: 1 as const },
    { x: 990, y: 405, minX: 950, maxX: 1240, speed: 170, direction: -1 as const },
    { x: 1430, y: 405, minX: 1380, maxX: 1680, speed: 180, direction: 1 as const },
    { x: 1870, y: 405, minX: 1820, maxX: 2120, speed: 190, direction: -1 as const },
    { x: 2310, y: 405, minX: 2260, maxX: 2560, speed: 200, direction: 1 as const },
    { x: 2740, y: 405, minX: 2680, maxX: 3000, speed: 210, direction: -1 as const },
  ] as Ghost[],
  key: { x: 2845, y: 310, hitboxX: 2820, hitboxY: 285 },
}


// Level 4: a longer haunted route with carefully spaced stepping stones,
// more patrol ghosts and crystal traps. Gaps are kept within jump range.
const LEVEL_4 = {
  worldWidth: 3200,
  duration: 250,
  platforms: [
    // Continuous playable ground route with manageable gaps.
    { x: 0, y: 455, width: 390 },
    { x: 475, y: 455, width: 390 },
    { x: 950, y: 455, width: 390 },
    { x: 1425, y: 455, width: 390 },
    { x: 1900, y: 455, width: 390 },
    { x: 2375, y: 455, width: 390 },
    { x: 2850, y: 455, width: 350 },

    // Elevated route: alternate heights to create deliberate jumps.
    { x: 155, y: 365, width: 125 },
    { x: 365, y: 395, width: 115 },
    { x: 570, y: 335, width: 130 },
    { x: 790, y: 380, width: 115 },
    { x: 1000, y: 320, width: 130 },
    { x: 1220, y: 375, width: 120 },
    { x: 1435, y: 330, width: 135 },
    { x: 1660, y: 385, width: 120 },
    { x: 1875, y: 325, width: 135 },
    { x: 2100, y: 375, width: 120 },
    { x: 2315, y: 315, width: 135 },
    { x: 2540, y: 375, width: 120 },
    { x: 2755, y: 330, width: 145 },
    { x: 2960, y: 365, width: 130 },
  ] as Platform[],
  collectibles: [
    { x: 215, y: 320 },
    { x: 630, y: 290 },
    { x: 1060, y: 275 },
    { x: 1940, y: 280 },
    { x: 2815, y: 285 },
  ] as Collectible[],
  spikes: [315, 705, 1125, 1510, 1935, 2355, 2730, 2920],
  ghosts: [
    { x: 535, y: 405, minX: 490, maxX: 830, speed: 185, direction: 1 as const },
    { x: 1000, y: 405, minX: 965, maxX: 1310, speed: 195, direction: -1 as const },
    { x: 1480, y: 405, minX: 1440, maxX: 1790, speed: 205, direction: 1 as const },
    { x: 1960, y: 405, minX: 1915, maxX: 2260, speed: 215, direction: -1 as const },
    { x: 2440, y: 405, minX: 2390, maxX: 2730, speed: 225, direction: 1 as const },
    { x: 2890, y: 405, minX: 2860, maxX: 3150, speed: 230, direction: -1 as const },
  ] as Ghost[],
  key: { x: 2900, y: 305, hitboxX: 2875, hitboxY: 280 },
}


// Level 5: a longer route with alternating low/high stepping stones.
// The gaps and height changes stay inside the existing jump physics range.
const LEVEL_5 = {
  worldWidth: 3200,
  duration: 270,
  platforms: [
    // Main route: short, consistent ground gaps remain jumpable.
    { x: 0, y: 455, width: 360 },
    { x: 430, y: 455, width: 365 },
    { x: 865, y: 455, width: 365 },
    { x: 1300, y: 455, width: 365 },
    { x: 1735, y: 455, width: 365 },
    { x: 2170, y: 455, width: 365 },
    { x: 2605, y: 455, width: 595 },

    // Elevated stepping-stone route. Horizontal gaps are deliberately limited.
    { x: 145, y: 365, width: 125 },
    { x: 330, y: 395, width: 115 },
    { x: 515, y: 345, width: 125 },
    { x: 700, y: 385, width: 120 },
    { x: 885, y: 335, width: 130 },
    { x: 1080, y: 390, width: 115 },
    { x: 1260, y: 340, width: 130 },
    { x: 1455, y: 390, width: 120 },
    { x: 1640, y: 335, width: 130 },
    { x: 1835, y: 385, width: 120 },
    { x: 2020, y: 330, width: 135 },
    { x: 2220, y: 385, width: 120 },
    { x: 2405, y: 335, width: 130 },
    { x: 2600, y: 385, width: 120 },
    { x: 2790, y: 340, width: 135 },
    { x: 2985, y: 375, width: 135 },
  ] as Platform[],
  collectibles: [
    { x: 205, y: 320 },
    { x: 575, y: 300 },
    { x: 950, y: 290 },
    { x: 1695, y: 290 },
    { x: 2845, y: 295 },
  ] as Collectible[],
  spikes: [290, 650, 1010, 1450, 1885, 2315, 2700, 3060],
  ghosts: [
    { x: 475, y: 405, minX: 440, maxX: 760, speed: 205, direction: 1 as const },
    { x: 910, y: 405, minX: 875, maxX: 1195, speed: 215, direction: -1 as const },
    { x: 1345, y: 405, minX: 1310, maxX: 1630, speed: 225, direction: 1 as const },
    { x: 1780, y: 405, minX: 1745, maxX: 2065, speed: 235, direction: -1 as const },
    { x: 2215, y: 405, minX: 2180, maxX: 2500, speed: 245, direction: 1 as const },
    { x: 2650, y: 405, minX: 2620, maxX: 3000, speed: 255, direction: -1 as const },
  ] as Ghost[],
  key: { x: 3040, y: 300, hitboxX: 3015, hitboxY: 275 },
}


// Level 6: the Crypt Crossing. Longer alternating jumps and faster patrols,
// while every ground gap remains reachable with the existing jump physics.
const LEVEL_6 = {
  worldWidth: 3400,
  duration: 280,
  platforms: [
    // Harder than Level 5: wider but still reachable ground gaps (90 px).
    { x: 0, y: 455, width: 320 },
    { x: 410, y: 455, width: 330 },
    { x: 830, y: 455, width: 330 },
    { x: 1250, y: 455, width: 330 },
    { x: 1670, y: 455, width: 330 },
    { x: 2090, y: 455, width: 330 },
    { x: 2510, y: 455, width: 330 },
    // Long final landing area keeps the exit completely accessible.
    { x: 2930, y: 455, width: 470 },

    // Elevated route: deliberate jumps with reachable vertical differences.
    { x: 135, y: 365, width: 115 },
    { x: 330, y: 395, width: 105 },
    { x: 535, y: 335, width: 115 },
    { x: 735, y: 390, width: 105 },
    { x: 945, y: 325, width: 115 },
    { x: 1145, y: 390, width: 105 },
    { x: 1360, y: 335, width: 115 },
    { x: 1565, y: 390, width: 105 },
    { x: 1780, y: 325, width: 115 },
    { x: 1985, y: 390, width: 105 },
    { x: 2200, y: 330, width: 115 },
    { x: 2405, y: 390, width: 105 },
    { x: 2620, y: 330, width: 115 },
    { x: 2825, y: 390, width: 105 },
  ] as Platform[],
  collectibles: [
    { x: 185, y: 320 },
    { x: 575, y: 285 },
    { x: 985, y: 275 },
    { x: 1815, y: 275 },
    { x: 2670, y: 280 },
  ] as Collectible[],
  // Hazards guard the route, but the final doorway approach stays clear.
  spikes: [270, 690, 1110, 1530, 1950, 2370, 2790],
  ghosts: [
    { x: 455, y: 405, minX: 420, maxX: 700, speed: 225, direction: 1 as const },
    { x: 875, y: 405, minX: 840, maxX: 1120, speed: 235, direction: -1 as const },
    { x: 1295, y: 405, minX: 1260, maxX: 1540, speed: 245, direction: 1 as const },
    { x: 1715, y: 405, minX: 1680, maxX: 1960, speed: 255, direction: -1 as const },
    { x: 2135, y: 405, minX: 2100, maxX: 2380, speed: 265, direction: 1 as const },
    { x: 2555, y: 405, minX: 2520, maxX: 2800, speed: 275, direction: -1 as const },
    // Last ghost patrol ends before the exit arch; it cannot camp inside the door.
    { x: 2865, y: 405, minX: 2845, maxX: 2960, speed: 255, direction: 1 as const },
  ] as Ghost[],
  // Key is deliberately before the exit, never beyond the gate.
  key: { x: 2890, y: 315, hitboxX: 2865, hitboxY: 290 },
}


// Level 7: Halloween Pumpkin Hunt.
const LEVEL_7 = {
  worldWidth: 3400, duration: 285,
  platforms: [
    { x: 0, y: 455, width: 300 }, { x: 385, y: 455, width: 315 },
    { x: 785, y: 455, width: 315 }, { x: 1185, y: 455, width: 315 },
    { x: 1585, y: 455, width: 315 }, { x: 1985, y: 455, width: 315 },
    { x: 2385, y: 455, width: 315 }, { x: 2785, y: 455, width: 615 },
    { x: 120, y: 365, width: 115 }, { x: 305, y: 395, width: 105 },
    { x: 490, y: 335, width: 115 }, { x: 680, y: 390, width: 105 },
    { x: 875, y: 325, width: 115 }, { x: 1070, y: 390, width: 105 },
    { x: 1270, y: 330, width: 115 }, { x: 1470, y: 390, width: 105 },
    { x: 1670, y: 325, width: 115 }, { x: 1870, y: 390, width: 105 },
    { x: 2070, y: 325, width: 115 }, { x: 2270, y: 390, width: 105 },
    { x: 2470, y: 330, width: 115 }, { x: 2670, y: 390, width: 105 },
    { x: 2870, y: 365, width: 125 },
  ] as Platform[],
  collectibles: [
    { x: 165, y: 320 }, { x: 535, y: 285 }, { x: 920, y: 275 },
    { x: 1715, y: 275 }, { x: 2515, y: 280 },
  ] as Collectible[],
  spikes: [250, 635, 1035, 1435, 1835, 2235, 2635],
  ghosts: [
    { x: 430, y: 405, minX: 400, maxX: 660, speed: 235, direction: 1 as const },
    { x: 830, y: 405, minX: 800, maxX: 1060, speed: 245, direction: -1 as const },
    { x: 1230, y: 405, minX: 1200, maxX: 1460, speed: 255, direction: 1 as const },
    { x: 1630, y: 405, minX: 1600, maxX: 1860, speed: 265, direction: -1 as const },
    { x: 2030, y: 405, minX: 2000, maxX: 2260, speed: 275, direction: 1 as const },
    { x: 2430, y: 405, minX: 2400, maxX: 2660, speed: 285, direction: -1 as const },
    { x: 2740, y: 405, minX: 2710, maxX: 2870, speed: 205, direction: 1 as const, kind: 'pumpkin' as const },
  ] as Ghost[],
  key: { x: 2960, y: 315, hitboxX: 2935, hitboxY: 290 },
}


// Level 8: The Ancient Stone Catacombs — a new map layout and weathered stone palette.
const LEVEL_8 = {
  worldWidth: 3600, duration: 300,
  platforms: [
    // Main route: broad safe landings separated by controlled gaps.
    { x: 0, y: 455, width: 330 }, { x: 415, y: 455, width: 310 },
    { x: 810, y: 455, width: 310 }, { x: 1205, y: 455, width: 310 },
    { x: 1600, y: 455, width: 310 }, { x: 1995, y: 455, width: 310 },
    { x: 2390, y: 455, width: 310 }, { x: 2785, y: 455, width: 815 },
    // Raised stepping-stones form a new zig-zag route.
    { x: 115, y: 365, width: 125 }, { x: 315, y: 395, width: 105 },
    { x: 505, y: 330, width: 115 }, { x: 700, y: 385, width: 105 },
    { x: 900, y: 315, width: 120 }, { x: 1095, y: 375, width: 105 },
    { x: 1290, y: 320, width: 120 }, { x: 1485, y: 385, width: 105 },
    { x: 1680, y: 310, width: 120 }, { x: 1875, y: 375, width: 105 },
    { x: 2070, y: 315, width: 120 }, { x: 2265, y: 385, width: 105 },
    { x: 2460, y: 320, width: 120 }, { x: 2655, y: 385, width: 105 },
    { x: 2860, y: 365, width: 135 },
  ] as Platform[],
  collectibles: [
    { x: 165, y: 320 }, { x: 550, y: 285 }, { x: 945, y: 270 },
    { x: 1725, y: 265 }, { x: 2505, y: 275 },
  ] as Collectible[],
  // Slightly tougher hazard rhythm: extra spike pockets are kept in the gaps.
  spikes: [275, 665, 865, 1060, 1455, 1850, 2050, 2245, 2640],
  // Level 8 is a Pumpkin Stalker-only level: no ghosts appear here.
  // Patrol ranges stay on their own ground sections so the exit approach remains clear.
  ghosts: [
    { x: 455, y: 405, minX: 435, maxX: 690, speed: 265, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 850, y: 405, minX: 830, maxX: 1085, speed: 275, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 1245, y: 405, minX: 1225, maxX: 1480, speed: 280, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 1640, y: 405, minX: 1620, maxX: 1875, speed: 290, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 2035, y: 405, minX: 2015, maxX: 2270, speed: 295, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 2430, y: 405, minX: 2410, maxX: 2665, speed: 305, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 2820, y: 405, minX: 2800, maxX: 2970, speed: 285, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 560, y: 405, minX: 435, maxX: 690, speed: 250, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 960, y: 405, minX: 830, maxX: 1085, speed: 260, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 1750, y: 405, minX: 1620, maxX: 1875, speed: 270, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 2140, y: 405, minX: 2015, maxX: 2270, speed: 280, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 2520, y: 405, minX: 2410, maxX: 2665, speed: 290, direction: 1 as const, kind: 'pumpkin' as const },
  ] as Ghost[],
  // Key is placed on the final approach, before the exit door.
  key: { x: 2960, y: 315, hitboxX: 2935, hitboxY: 290 },
}


// Level 9: The Forsaken Graveyard — an 80% challenge with one final zombie guardian.
// Ground gaps are kept around 80–90px and elevated steps use manageable height changes.
const LEVEL_9 = {
  worldWidth: 4200,
  duration: 300,
  platforms: [
    // Main route: graveyard stone slabs with deliberate, jumpable gaps.
    { x: 0, y: 455, width: 300 },
    { x: 390, y: 455, width: 250 },
    { x: 730, y: 455, width: 250 },
    { x: 1070, y: 455, width: 250 },
    { x: 1410, y: 455, width: 250 },
    { x: 1750, y: 455, width: 250 },
    { x: 2090, y: 455, width: 250 },
    { x: 2430, y: 455, width: 250 },
    { x: 2770, y: 455, width: 260 },
    // Final arena is one continuous floor: key, boss and exit are all reachable.
    { x: 3120, y: 455, width: 1080 },
    // Raised tombstones create alternate landings and require controlled jumps.
    { x: 110, y: 365, width: 110 },
    { x: 300, y: 395, width: 90 },
    { x: 500, y: 330, width: 105 },
    { x: 650, y: 390, width: 90 },
    { x: 845, y: 325, width: 110 },
    { x: 990, y: 390, width: 90 },
    { x: 1185, y: 330, width: 110 },
    { x: 1330, y: 390, width: 90 },
    { x: 1525, y: 320, width: 110 },
    { x: 1670, y: 390, width: 90 },
    { x: 1865, y: 325, width: 110 },
    { x: 2010, y: 390, width: 90 },
    { x: 2205, y: 320, width: 110 },
    { x: 2350, y: 390, width: 90 },
    { x: 2545, y: 330, width: 110 },
    { x: 2690, y: 390, width: 90 },
    { x: 2885, y: 345, width: 120 },
    { x: 3180, y: 375, width: 130 },
    { x: 3370, y: 355, width: 120 },
  ] as Platform[],
  collectibles: [
    { x: 155, y: 320 }, { x: 535, y: 285 }, { x: 875, y: 280 },
    { x: 1555, y: 275 }, { x: 2575, y: 285 },
  ] as Collectible[],
  // Traps are on the ground lanes, not under the only safe landing points.
  spikes: [
    245, 445, 790, 1130, 1470, 1810, 2150, 2490, 2830, 2970,
    3215, 3290,
  ],
  ghosts: [
    { x: 430, y: 405, minX: 405, maxX: 610, speed: 285, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 770, y: 405, minX: 750, maxX: 950, speed: 300, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 1110, y: 405, minX: 1090, maxX: 1290, speed: 315, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 1450, y: 405, minX: 1430, maxX: 1630, speed: 325, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 1790, y: 405, minX: 1770, maxX: 1970, speed: 335, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 2130, y: 405, minX: 2110, maxX: 2310, speed: 345, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 2470, y: 405, minX: 2450, maxX: 2650, speed: 355, direction: 1 as const, kind: 'pumpkin' as const },
    // One boss only. It patrols the final arena before the gate, never inside the doorway.
    { x: 3550, y: 405, minX: 3380, maxX: 3660, speed: 350, direction: -1 as const, kind: 'zombie' as const },
  ] as Ghost[],
  // The key is safely before the boss arena and before the exit.
  key: { x: 3200, y: 315, hitboxX: 3175, hitboxY: 290 },
}

const LEVEL_10 = {
  worldWidth: 5200,
  duration: 420,
  platforms: [
    // Long final journey: connected ground islands with fair, readable gaps.
    { x: 0, y: 455, width: 360 }, { x: 455, y: 455, width: 300 },
    { x: 850, y: 455, width: 310 }, { x: 1260, y: 455, width: 300 },
    { x: 1660, y: 455, width: 330 }, { x: 2090, y: 455, width: 300 },
    { x: 2490, y: 455, width: 320 }, { x: 2910, y: 455, width: 300 },
    { x: 3310, y: 455, width: 330 }, { x: 3740, y: 455, width: 310 },
    { x: 4150, y: 455, width: 1050 },
    // Raised castle ruins and stepping stones.
    { x: 150, y: 365, width: 125 }, { x: 370, y: 395, width: 100 },
    { x: 585, y: 330, width: 125 }, { x: 770, y: 390, width: 100 },
    { x: 980, y: 325, width: 130 }, { x: 1170, y: 385, width: 105 },
    { x: 1390, y: 315, width: 130 }, { x: 1575, y: 385, width: 105 },
    { x: 1790, y: 325, width: 135 }, { x: 1980, y: 390, width: 105 },
    { x: 2220, y: 315, width: 135 }, { x: 2400, y: 385, width: 105 },
    { x: 2620, y: 325, width: 135 }, { x: 2820, y: 390, width: 105 },
    { x: 3040, y: 310, width: 140 }, { x: 3240, y: 385, width: 110 },
    { x: 3460, y: 320, width: 140 }, { x: 3650, y: 385, width: 110 },
    { x: 3890, y: 330, width: 140 }, { x: 4090, y: 390, width: 110 },
    // Final vampire arena: broad, safe floor for a readable boss fight.
    { x: 4380, y: 455, width: 700 },
    // Keep the doorway approach clear: the old raised block at x=4880
    // overlapped the exit arch and physically blocked the entrance.
    { x: 4450, y: 365, width: 150 },
  ] as Platform[],
  collectibles: [
    { x: 205, y: 320 }, { x: 625, y: 285 }, { x: 1025, y: 280 },
    { x: 1440, y: 270 }, { x: 1840, y: 280 }, { x: 2260, y: 270 },
    { x: 2660, y: 280 }, { x: 3085, y: 265 }, { x: 3505, y: 275 },
    { x: 3935, y: 285 },
  ] as Collectible[],
  spikes: [295, 535, 900, 1310, 1710, 2140, 2540, 2955, 3350, 3780, 4190],
  ghosts: [
    { x: 500, y: 405, minX: 470, maxX: 710, speed: 245, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 900, y: 405, minX: 870, maxX: 1120, speed: 255, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 1320, y: 405, minX: 1280, maxX: 1530, speed: 265, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 1750, y: 405, minX: 1690, maxX: 1950, speed: 275, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 2160, y: 405, minX: 2120, maxX: 2360, speed: 285, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 2580, y: 405, minX: 2520, maxX: 2780, speed: 295, direction: -1 as const, kind: 'pumpkin' as const },
    { x: 3000, y: 405, minX: 2940, maxX: 3180, speed: 305, direction: 1 as const, kind: 'pumpkin' as const },
    { x: 3420, y: 405, minX: 3360, maxX: 3610, speed: 315, direction: -1 as const, kind: 'pumpkin' as const },
    // A single zombie guards the approach to the final castle.
    { x: 4020, y: 405, minX: 3900, maxX: 4270, speed: 330, direction: -1 as const, kind: 'zombie' as const },
    // Final boss: vampire. Defeated by three well-timed stomps during its recovery window.
    { x: 4660, y: 405, minX: 4510, maxX: 4830, speed: 190, direction: -1 as const, kind: 'vampire' as const },
  ] as Ghost[],
  // The key appears after Rocky passes the vampire, just before the exit arch.
  key: { x: 4920, y: 315, hitboxX: 4895, hitboxY: 290 },
}

function createTransparentSprite(
  image: HTMLImageElement,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d')
  if (!context) return canvas

  context.drawImage(image, 0, 0)

  const imageData = context.getImageData(
    0, 0, canvas.width, canvas.height,
  )

  const { data, width, height } = imageData
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)

  let head = 0
  let tail = 0

  const isBackground = (index: number) => {
    const offset = index * 4
    return (
      data[offset] > 215 &&
      data[offset + 1] > 215 &&
      data[offset + 2] > 215
    )
  }

  const addPixel = (index: number) => {
    if (index < 0 || index >= width * height) return
    if (visited[index] || !isBackground(index)) return
    visited[index] = 1
    queue[tail++] = index
  }

  for (let x = 0; x < width; x++) {
    addPixel(x)
    addPixel((height - 1) * width + x)
  }

  for (let y = 0; y < height; y++) {
    addPixel(y * width)
    addPixel(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    data[index * 4 + 3] = 0

    const x = index % width
    const y = Math.floor(index / width)

    if (x > 0) addPixel(index - 1)
    if (x < width - 1) addPixel(index + 1)
    if (y > 0) addPixel(index - width)
    if (y < height - 1) addPixel(index + width)
  }

  context.putImageData(imageData, 0, 0)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) return canvas

  const trimmed = document.createElement('canvas')
  trimmed.width = maxX - minX + 1
  trimmed.height = maxY - minY + 1

  trimmed.getContext('2d')?.drawImage(
    canvas,
    minX, minY,
    trimmed.width, trimmed.height,
    0, 0,
    trimmed.width, trimmed.height,
  )

  return trimmed
}

function intersects(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by
  )
}

// SOUND EFFECTS + AMBIENT HALLOWEEN MUSIC

let gameAudioContext: AudioContext | null = null
let gameSoundVolume = 0.8
let gameMusicVolume = 0.7
let gameMusicGain: GainNode | null = null
let gameMusicOscillators: OscillatorNode[] = []
let gameMusicStarted = false
let gameMusicElement: HTMLAudioElement | null = null

type GameSound =
  | 'jump'
  | 'collect'
  | 'damage'
  | 'key'
  | 'victory'
  | 'gameover'

function setGameAudioLevels(sound: number, music: number) {
  gameSoundVolume = Math.max(0, Math.min(1, sound))
  gameMusicVolume = Math.max(0, Math.min(1, music))

  if (gameMusicElement) {
    gameMusicElement.volume = gameMusicVolume
  }

  if (gameMusicGain && gameAudioContext) {
    gameMusicGain.gain.setTargetAtTime(
      gameMusicVolume * 0.018,
      gameAudioContext.currentTime,
      0.08,
    )
  }
}

function startBackgroundMusic() {
  const audio = gameAudioContext
  if (!audio || audio.state !== 'running' || gameMusicStarted) return

  try {
    const masterGain = audio.createGain()
    masterGain.gain.value = 0.0001
    masterGain.connect(audio.destination)

    const frequencies = [110, 164.81, 220]

    frequencies.forEach((frequency, index) => {
      const oscillator = audio.createOscillator()
      const voiceGain = audio.createGain()

      oscillator.type = index === 1 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      voiceGain.gain.value = index === 0 ? 0.45 : 0.18

      oscillator.connect(voiceGain)
      voiceGain.connect(masterGain)
      oscillator.start()

      gameMusicOscillators.push(oscillator)
    })

    gameMusicGain = masterGain
    gameMusicStarted = true

    masterGain.gain.setTargetAtTime(
      gameMusicVolume * 0.018,
      audio.currentTime,
      0.8,
    )
  } catch {
    // Audio is optional; gameplay must continue without it.
  }
}

// Keep the legacy oscillator helper available without starting it; gameplay uses halloween-ambient.mp3.
void startBackgroundMusic

function unlockGameAudio() {
  if (typeof window === 'undefined' || !window.AudioContext) return

  try {
    if (!gameAudioContext || gameAudioContext.state === 'closed') {
      gameAudioContext = new window.AudioContext()
      gameMusicStarted = false
      gameMusicGain = null
      gameMusicOscillators = []
    }

    if (gameAudioContext.state === 'suspended') {
      void gameAudioContext.resume()
    }
  } catch {
    // Audio is optional.
  }
}

function playGameSound(sound: GameSound) {
  unlockGameAudio()

  const audio = gameAudioContext
  if (!audio || audio.state !== 'running' || gameSoundVolume <= 0) return

  const now = audio.currentTime

  const presets: Record<
    GameSound,
    {
      start: number
      end: number
      duration: number
      wave: OscillatorType
      volume: number
    }
  > = {
    jump: {
      start: 300,
      end: 540,
      duration: 0.13,
      wave: 'square',
      volume: 0.045,
    },
    collect: {
      start: 620,
      end: 1040,
      duration: 0.19,
      wave: 'sine',
      volume: 0.07,
    },
    damage: {
      start: 190,
      end: 75,
      duration: 0.28,
      wave: 'sawtooth',
      volume: 0.065,
    },
    key: {
      start: 440,
      end: 880,
      duration: 0.38,
      wave: 'triangle',
      volume: 0.065,
    },
    victory: {
      start: 520,
      end: 1040,
      duration: 0.65,
      wave: 'triangle',
      volume: 0.07,
    },
    gameover: {
      start: 260,
      end: 65,
      duration: 0.7,
      wave: 'sawtooth',
      volume: 0.055,
    },
  }

  const preset = presets[sound]
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()

  oscillator.type = preset.wave
  oscillator.frequency.setValueAtTime(preset.start, now)
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(1, preset.end),
    now + preset.duration,
  )

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, preset.volume * gameSoundVolume),
    now + 0.018,
  )
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + preset.duration,
  )

  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start(now)
  oscillator.stop(now + preset.duration + 0.02)
}

export default function GameCanvas({
  onExit,
  soundVolume = 0.8,
  musicVolume = 0.7,
}: GameCanvasProps) {
  setGameAudioLevels(soundVolume, musicVolume)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameMusicRef = useRef<HTMLAudioElement>(null)

  // Play the supplied Halloween ambient track during gameplay.
  useEffect(() => {
    const audio = gameMusicRef.current
    if (!audio) return

    gameMusicElement = audio
    audio.volume = Math.max(0, Math.min(1, musicVolume))
    void audio.play().catch(() => {
      // Browsers may block autoplay until the first player interaction.
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
      if (gameMusicElement === audio) gameMusicElement = null
    }
  }, [])

  useEffect(() => {
    const audio = gameMusicRef.current
    if (audio) audio.volume = Math.max(0, Math.min(1, musicVolume))
  }, [musicVolume])

  const touchKeysRef = useRef(
    new Set<'left' | 'right'>(),
  )

  const touchJumpRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    // Gameplay background image (visual only; does not affect physics or camera).
    const backgroundImage = new Image()
    backgroundImage.src = gameBackgroundImage

    let animationFrame = 0
    let lastTime = 0
    let cameraX = 0
    let jumpRequested = false
    let lives = 3
    let collectedCount = 0
    let elapsedTime = 0
    let invulnerableTime = 0
    let hasKey = false
    let vampireHealth = 3
    let vampireHitCooldown = 0
    let levelKey = { x: 2660, y: 315, hitboxX: 2635, hitboxY: 290 }
    let isPaused = false
    let pauseSettingsOpen = false

    type GameState = 'playing' | 'gameover' | 'complete'
    let gameState: GameState = 'playing'

    const keys = new Set<string>()
    const collected = new Set<number>()

    const ghosts: Ghost[] = initialGhosts.map(
      ghost => ({ ...ghost }),
    )

    let rockySprite: HTMLCanvasElement | null = null
    let seismicSprite: HTMLCanvasElement | null = null

    const player: Player = {
      x: 90,
      y: 300,
      vx: 0,
      vy: 0,
      width: 54,
      height: 92,
      grounded: false,
      facing: 1,
    }

    const gravity = 1900
    const moveSpeed = 300
    const jumpForce = 690

    const rocky = new Image()

    rocky.src = rockyImage

    rocky.onload = () => {
      rockySprite = createTransparentSprite(rocky)
    }

    const seismic = new Image()

    seismic.src = seismicImage

    seismic.onload = () => {
      seismicSprite = createTransparentSprite(seismic)
    }

    // LOAD LEVEL DATA WITHOUT REBUILDING THE GAME ENGINE.
    const loadLevel = (level: number) => {
      currentLevel = level

      if (level === 2) {
        WORLD_WIDTH = LEVEL_2.worldWidth
        GAME_DURATION = LEVEL_2.duration
        platforms = LEVEL_2.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_2.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_2.spikes]
        initialGhosts = LEVEL_2.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { x: 2660, y: 315, hitboxX: 2635, hitboxY: 290 }
      } else if (level === 3) {
        WORLD_WIDTH = LEVEL_3.worldWidth
        GAME_DURATION = LEVEL_3.duration
        platforms = LEVEL_3.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_3.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_3.spikes]
        initialGhosts = LEVEL_3.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_3.key }
      } else if (level === 4) {
        WORLD_WIDTH = LEVEL_4.worldWidth
        GAME_DURATION = LEVEL_4.duration
        platforms = LEVEL_4.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_4.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_4.spikes]
        initialGhosts = LEVEL_4.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_4.key }
      } else if (level === 5) {
        WORLD_WIDTH = LEVEL_5.worldWidth
        GAME_DURATION = LEVEL_5.duration
        platforms = LEVEL_5.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_5.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_5.spikes]
        initialGhosts = LEVEL_5.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_5.key }
      } else if (level === 6) {
        WORLD_WIDTH = LEVEL_6.worldWidth
        GAME_DURATION = LEVEL_6.duration
        platforms = LEVEL_6.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_6.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_6.spikes]
        initialGhosts = LEVEL_6.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_6.key }
      } else if (level === 7) {
        WORLD_WIDTH = LEVEL_7.worldWidth
        GAME_DURATION = LEVEL_7.duration
        platforms = LEVEL_7.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_7.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_7.spikes]
        initialGhosts = LEVEL_7.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_7.key }
      } else if (level === 8) {
        WORLD_WIDTH = LEVEL_8.worldWidth
        GAME_DURATION = LEVEL_8.duration
        platforms = LEVEL_8.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_8.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_8.spikes]
        initialGhosts = LEVEL_8.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_8.key }
      } else if (level === 9) {
        WORLD_WIDTH = LEVEL_9.worldWidth
        GAME_DURATION = LEVEL_9.duration
        platforms = LEVEL_9.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_9.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_9.spikes]
        initialGhosts = LEVEL_9.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_9.key }
      } else if (level === 10) {
        WORLD_WIDTH = LEVEL_10.worldWidth
        GAME_DURATION = LEVEL_10.duration
        platforms = LEVEL_10.platforms.map(item => ({ ...item }))
        collectibles = LEVEL_10.collectibles.map(item => ({ ...item }))
        spikePositions = [...LEVEL_10.spikes]
        initialGhosts = LEVEL_10.ghosts.map(ghost => ({ ...ghost }))
        levelKey = { ...LEVEL_10.key }
        vampireHealth = 3
        vampireHitCooldown = 0
      } else {
        currentLevel = 1
        WORLD_WIDTH = 3200
        GAME_DURATION = 180
        levelKey = { x: 2660, y: 315, hitboxX: 2635, hitboxY: 290 }
        platforms = [
          { x: 0, y: 455, width: 650 }, { x: 720, y: 455, width: 500 },
          { x: 1300, y: 455, width: 550 }, { x: 1930, y: 455, width: 500 },
          { x: 2510, y: 455, width: 690 }, { x: 280, y: 360, width: 180 },
          { x: 820, y: 350, width: 190 }, { x: 1100, y: 285, width: 180 },
          { x: 1480, y: 355, width: 190 }, { x: 1760, y: 295, width: 180 },
          { x: 2110, y: 355, width: 190 }, { x: 2400, y: 285, width: 180 },
        ]
        collectibles = [
          { x: 350, y: 315 }, { x: 900, y: 305 }, { x: 1180, y: 240 },
          { x: 1550, y: 310 }, { x: 1815, y: 250 },
        ]
        spikePositions = [570, 1050, 1680, 2310, 2810]
        initialGhosts = [
          { x: 850, y: 405, minX: 760, maxX: 1160, speed: 90, direction: 1 },
          { x: 1450, y: 405, minX: 1320, maxX: 1810, speed: 110, direction: -1 },
          { x: 2050, y: 405, minX: 1950, maxX: 2380, speed: 100, direction: 1 },
          { x: 2650, y: 405, minX: 2530, maxX: 3050, speed: 120, direction: -1 },
        ]
      }

      ghosts.splice(0, ghosts.length, ...initialGhosts.map(ghost => ({ ...ghost })))
    }

    // RESET GAME

    const resetGame = () => {
      player.x = 90
      player.y = 300
      player.vx = 0
      player.vy = 0
      player.grounded = false
      player.facing = 1

      cameraX = 0
      lives = 3
      collectedCount = 0
      elapsedTime = 0
      invulnerableTime = 0
      hasKey = false
      vampireHealth = 3
      vampireHitCooldown = 0
      isPaused = false
      pauseSettingsOpen = false

      jumpRequested = false

      touchKeysRef.current.clear()
      touchJumpRef.current = false

      collected.clear()

      ghosts.forEach((ghost, index) => {
        Object.assign(ghost, initialGhosts[index])
      })

      gameState = 'playing'
    }

    // KEYBOARD CONTROLS

    const onKeyDown = (event: KeyboardEvent) => {
      unlockGameAudio()
      if (gameMusicRef.current?.paused) {
        void gameMusicRef.current.play().catch(() => {})
      }

      const key = event.key.toLowerCase()

      if (
        ['arrowleft', 'arrowright', 'arrowup', ' ', 'escape'].includes(key)
      ) {
        event.preventDefault()
      }

      if (gameState === 'playing' && (key === 'escape' || key === 'p')) {
        isPaused = !isPaused
        keys.clear()
        touchKeysRef.current.clear()
        touchJumpRef.current = false
        return
      }

      if (isPaused) {
        if (key === 'enter' || key === 'escape' || key === 'p') {
          isPaused = false
        } else if (key === 'r') {
          resetGame()
        }
        return
      }

      if (gameState !== 'playing') {
        if (key === 'r' || key === 'enter') {
          resetGame()
        }
        return
      }

      keys.add(key)

      if (
        key === ' ' ||
        key === 'arrowup' ||
        key === 'w'
      ) {
        jumpRequested = true
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase())
    }

    const onBlur = () => {
      keys.clear()
      touchKeysRef.current.clear()
      touchJumpRef.current = false
    }

    // DAMAGE AND RESPAWN

    const loseLife = () => {
      if (invulnerableTime > 0 || gameState !== 'playing') return

      lives -= 1
      invulnerableTime = 1.8

      playGameSound('damage')

      if (lives <= 0) {
        lives = 0
        gameState = 'gameover'
        playGameSound('gameover')
        return
      }

      player.x = 90
      player.y = 300
      player.vx = 0
      player.vy = 0
      player.grounded = false

      cameraX = 0
    }

    // BACKGROUND — haunted forest / purple graveyard style.
    // Decorative only: camera, collisions and gameplay coordinates stay unchanged.
    const drawBackground = () => {
      // Use the custom haunted-game background when it has loaded.
      // Keep the original procedural background as a safe loading fallback.
      if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
        context.drawImage(backgroundImage, 0, 0, WIDTH, HEIGHT)
        return
      }

      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT)
      gradient.addColorStop(0, '#210b55')
      gradient.addColorStop(0.48, '#432080')
      gradient.addColorStop(1, '#17102f')

      context.fillStyle = gradient
      context.fillRect(0, 0, WIDTH, HEIGHT)

      // Soft violet atmosphere behind the level.
      const haze = context.createRadialGradient(480, 300, 40, 480, 300, 560)
      haze.addColorStop(0, 'rgba(151, 67, 255, 0.18)')
      haze.addColorStop(1, 'rgba(35, 8, 75, 0)')
      context.fillStyle = haze
      context.fillRect(0, 0, WIDTH, HEIGHT)

      // Moon glow.
      context.save()
      context.shadowColor = '#8bdcff'
      context.shadowBlur = 34
      context.fillStyle = '#9bdfff'
      context.beginPath()
      context.arc(770, 135, 66, 0, Math.PI * 2)
      context.fill()
      context.restore()

      // Stable stars with subtle parallax.
      for (let i = 0; i < 82; i++) {
        const x = ((i * 173 - cameraX * 0.12) % WIDTH + WIDTH) % WIDTH
        const y = (i * 79) % 300
        const radius = i % 5 === 0 ? 2 : 1.25
        context.fillStyle = i % 4 === 0 ? '#d9c9ff' : '#e9e7ff'
        context.globalAlpha = 0.55 + (i % 4) * 0.1
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1

      // Distant haunted castle and graveyard silhouettes.
      context.save()
      context.translate(-cameraX * 0.22, 0)
      for (let i = 0; i < 7; i++) {
        const x = i * 520 - 100
        context.fillStyle = '#25134f'
        context.fillRect(x + 35, 245, 145, 210)
        context.fillRect(x + 15, 280, 185, 175)

        context.beginPath()
        context.moveTo(x + 20, 280)
        context.lineTo(x + 107, 185)
        context.lineTo(x + 195, 280)
        context.closePath()
        context.fill()

        context.fillStyle = '#ff9a32'
        context.shadowColor = '#ff8a22'
        context.shadowBlur = 9
        context.fillRect(x + 70, 320, 13, 22)
        context.fillRect(x + 132, 320, 13, 22)
        context.shadowBlur = 0

        // Small tower spires.
        context.fillStyle = '#190d3d'
        context.fillRect(x + 48, 220, 25, 65)
        context.beginPath()
        context.moveTo(x + 43, 220)
        context.lineTo(x + 60, 190)
        context.lineTo(x + 78, 220)
        context.fill()
      }
      context.restore()

      // Foreground bare trees, repeating with the scrolling world.
      context.save()
      context.translate(-cameraX * 0.42, 0)
      for (let i = 0; i < 9; i++) {
        const x = i * 390 + 35
        const baseY = 455
        context.strokeStyle = '#100b2d'
        context.lineWidth = 13
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.moveTo(x, baseY)
        context.lineTo(x + 4, 330)
        context.lineTo(x - 28, 286)
        context.moveTo(x + 3, 350)
        context.lineTo(x + 42, 300)
        context.moveTo(x - 20, 300)
        context.lineTo(x - 48, 260)
        context.moveTo(x + 25, 320)
        context.lineTo(x + 55, 270)
        context.moveTo(x + 4, 375)
        context.lineTo(x - 38, 345)
        context.stroke()

        context.lineWidth = 6
        context.beginPath()
        context.moveTo(x - 28, 286)
        context.lineTo(x - 42, 260)
        context.moveTo(x + 42, 300)
        context.lineTo(x + 58, 278)
        context.stroke()
      }
      context.restore()

      // Tombstones along the distant ground.
      context.save()
      context.translate(-cameraX * 0.55, 0)
      for (let i = 0; i < 18; i++) {
        const x = i * 190 + 65
        context.fillStyle = i % 2 ? '#30205d' : '#382568'
        context.beginPath()
        context.roundRect(x, 415 - (i % 3) * 8, 24, 39 + (i % 3) * 8, [10, 10, 3, 3])
        context.fill()
        context.fillStyle = 'rgba(190, 156, 255, 0.35)'
        context.fillRect(x + 10, 425 - (i % 3) * 8, 3, 15)
      }
      context.restore()

      // Warm lantern accents.
      context.save()
      context.translate(-cameraX * 0.7, 0)
      for (let i = 0; i < 6; i++) {
        const x = i * 610 + 125
        context.strokeStyle = '#17102e'
        context.lineWidth = 5
        context.beginPath()
        context.moveTo(x, 455)
        context.lineTo(x, 320)
        context.stroke()
        context.shadowColor = '#ff9b32'
        context.shadowBlur = 18
        context.fillStyle = '#ffb64b'
        context.fillRect(x - 8, 326, 16, 24)
        context.shadowBlur = 0
        context.fillStyle = '#25133f'
        context.fillRect(x - 12, 320, 24, 5)
      }
      context.restore()
    }

    // GHOST DRAWING

    const drawGhost = (ghost: Ghost) => {
      const bob =
        Math.sin(performance.now() / 180 + ghost.x) * 5

      context.save()
      context.translate(ghost.x, ghost.y + bob)

      if (ghost.kind === 'vampire') {
        const pulse = Math.sin(performance.now() / 170) * 2
        context.shadowColor = '#b64cff'; context.shadowBlur = 26
        // Wide bat-like cape and tall dark body.
        context.fillStyle = '#38104f'
        context.beginPath(); context.moveTo(-18, -22); context.lineTo(-48, -4)
        context.lineTo(-34, 20); context.lineTo(-12, 12); context.lineTo(0, 28)
        context.lineTo(12, 12); context.lineTo(34, 20); context.lineTo(48, -4)
        context.lineTo(18, -22); context.closePath(); context.fill()
        context.fillStyle = '#21102f'; context.fillRect(-17, -28, 34, 57)
        context.fillStyle = '#d8c8e8'
        context.beginPath(); context.arc(0, -34 + pulse, 19, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#8e1738'; context.beginPath()
        context.moveTo(-14, -48); context.lineTo(-10, -66); context.lineTo(-2, -49)
        context.moveTo(14, -48); context.lineTo(10, -66); context.lineTo(2, -49); context.fill()
        context.fillStyle = '#ff344f'
        context.fillRect(-9, -37, 5, 4); context.fillRect(4, -37, 5, 4)
        context.fillStyle = '#fff0f4'; context.fillRect(-5, -22, 4, 8); context.fillRect(2, -22, 4, 8)
        context.strokeStyle = '#c7a4df'; context.lineWidth = 3
        context.beginPath(); context.moveTo(-7, -5); context.lineTo(0, 4); context.lineTo(7, -5); context.stroke()
        context.restore(); return
      }

      if (ghost.kind === 'zombie') {
        // Graveyard zombie: green body, torn coat, glowing eyes and reaching arms.
        context.shadowColor = '#8cff55'; context.shadowBlur = 18
        context.fillStyle = '#547b42'
        context.fillRect(-15, -4, 30, 34)
        context.fillStyle = '#789b58'
        context.beginPath(); context.arc(0, -18, 19, 0, Math.PI * 2); context.fill()
        context.shadowBlur = 0
        context.fillStyle = '#29351f'
        context.fillRect(-12, 4, 9, 27); context.fillRect(4, 4, 9, 27)
        context.fillStyle = '#171b18'
        context.fillRect(-11, 31, 13, 7); context.fillRect(3, 31, 13, 7)
        context.strokeStyle = '#547b42'; context.lineWidth = 9; context.lineCap = 'round'
        context.beginPath(); context.moveTo(-13, 2); context.lineTo(-25, 15); context.lineTo(-30, 10)
        context.moveTo(13, 2); context.lineTo(25, 14); context.lineTo(30, 8); context.stroke()
        context.fillStyle = '#d9ff78'
        context.beginPath(); context.arc(-7, -20, 3.5, 0, Math.PI * 2); context.arc(7, -20, 3.5, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#34221c'; context.fillRect(-7, -8, 14, 4)
        context.restore(); return
      }

      if (ghost.kind === 'pumpkin') {
        context.shadowColor = '#ff7a18'; context.shadowBlur = 22
        context.fillStyle = '#f47b18'; context.beginPath()
        context.ellipse(0, 7, 25, 24, 0, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#ff9e2e'; context.beginPath()
        context.ellipse(-9, 7, 9, 22, 0, 0, Math.PI * 2)
        context.ellipse(9, 7, 9, 22, 0, 0, Math.PI * 2); context.fill()
        context.shadowBlur = 0; context.fillStyle = '#30203c'; context.beginPath()
        context.moveTo(-15, -5); context.lineTo(-5, -1); context.lineTo(-14, 3); context.closePath()
        context.moveTo(15, -5); context.lineTo(5, -1); context.lineTo(14, 3); context.closePath(); context.fill()
        context.fillStyle = '#3a1730'; context.beginPath()
        context.moveTo(-12, 13); context.lineTo(12, 13); context.lineTo(8, 20)
        context.lineTo(3, 16); context.lineTo(-2, 21); context.lineTo(-7, 16); context.closePath(); context.fill()
        context.strokeStyle = '#5a9b32'; context.lineWidth = 5
        context.beginPath(); context.moveTo(0, -16); context.lineTo(4, -27); context.stroke()
        context.restore(); return
      }

      context.shadowColor = '#b8eaff'
      context.shadowBlur = 16
      context.fillStyle = '#d8eaff'

      context.beginPath()
      context.arc(0, 0, 23, Math.PI, 0)
      context.lineTo(23, 28)

      for (let i = 0; i < 4; i++) {
        context.lineTo(
          12 - i * 8,
          i % 2 === 0 ? 22 : 31,
        )
      }

      context.lineTo(-23, 28)
      context.closePath()
      context.fill()

      context.shadowBlur = 0
      context.fillStyle = '#252044'

      context.beginPath()
      context.arc(-8, -3, 3.5, 0, Math.PI * 2)
      context.arc(8, -3, 3.5, 0, Math.PI * 2)
      context.fill()

      context.restore()
    }

    // KEY DRAWING

    const drawKey = (x: number, y: number) => {
      context.save()
      context.translate(x, y)

      context.shadowColor = '#ffd45c'
      context.shadowBlur = 18
      context.strokeStyle = '#ffd45c'
      context.lineWidth = 7

      context.beginPath()
      context.arc(-8, 0, 10, 0, Math.PI * 2)
      context.moveTo(2, 0)
      context.lineTo(28, 0)
      context.lineTo(28, 9)
      context.moveTo(18, 0)
      context.lineTo(18, 7)
      context.stroke()

      context.restore()
    }

    // PROFESSIONAL EXIT GATE — purple stone arch and warm wooden door
    // Resolve the active level at runtime; Level 10 must use its far-end gate.
    const getExitX = () => currentLevel === 10 ? 5030 : currentLevel === 9 ? 3900 : 3100
    const getExitHitbox = () => ({ x: getExitX() - 25, y: 365, width: 50, height: 90 })

    const drawExit = () => {
      const x = getExitX()
      const floorY = 455
      

      context.save()

      // Ground shadow anchors the gate to the platform.
      context.fillStyle = 'rgba(5, 3, 20, 0.72)'
      context.beginPath()
      context.ellipse(x, floorY - 2, 86, 10, 0, 0, Math.PI * 2)
      context.fill()

      // Broad outer stone silhouette and soft purple aura.
      context.shadowColor = hasKey ? '#ff9b35' : '#9b55ff'
      context.shadowBlur = hasKey ? 25 : 12
      context.fillStyle = '#17102f'
      context.strokeStyle = '#39205f'
      context.lineWidth = 5
      context.beginPath()
      context.moveTo(x - 78, floorY)
      context.lineTo(x - 78, 382)
      context.quadraticCurveTo(x - 78, 320, x, 316)
      context.quadraticCurveTo(x + 78, 320, x + 78, 382)
      context.lineTo(x + 78, floorY)
      context.closePath()
      context.fill()
      context.stroke()
      context.shadowBlur = 0

      // Individual chunky stones around the arch.
      const archBlocks = [
        [-69, 386, 25, 28], [-66, 354, 28, 27], [-51, 330, 29, 25],
        [-25, 316, 28, 24], [5, 316, 28, 24], [34, 330, 29, 25],
        [51, 354, 28, 27], [48, 386, 25, 28],
        [-69, 418, 25, 29], [48, 418, 25, 29],
      ]
      archBlocks.forEach(([bx, by, bw, bh], index) => {
        const stone = context.createLinearGradient(0, by, 0, by + bh)
        stone.addColorStop(0, index % 2 ? '#a45be9' : '#c17aff')
        stone.addColorStop(0.45, '#6936a6')
        stone.addColorStop(1, '#342052')
        context.fillStyle = stone
        context.strokeStyle = '#1c1034'
        context.lineWidth = 3
        context.beginPath()
        context.roundRect(x + bx, by, bw, bh, 6)
        context.fill()
        context.stroke()
        context.fillStyle = 'rgba(255, 220, 255, 0.42)'
        context.fillRect(x + bx + 5, by + 4, bw - 10, 2)
      })

      // Inner arch trim.
      context.strokeStyle = '#b779f4'
      context.lineWidth = 5
      context.beginPath()
      context.moveTo(x - 53, floorY)
      context.lineTo(x - 53, 385)
      context.quadraticCurveTo(x - 53, 345, x, 342)
      context.quadraticCurveTo(x + 53, 345, x + 53, 385)
      context.lineTo(x + 53, floorY)
      context.stroke()

      // Wooden door with warm vertical planks.
      const doorX = x - 43
      const doorY = 365
      const doorW = 86
    
      const wood = context.createLinearGradient(doorX, doorY, doorX + doorW, doorY)
      wood.addColorStop(0, '#4c1c3e')
      wood.addColorStop(0.18, '#a33d43')
      wood.addColorStop(0.5, '#c45a48')
      wood.addColorStop(0.82, '#8c303f')
      wood.addColorStop(1, '#421a3b')
      context.fillStyle = wood
      context.strokeStyle = '#170d2b'
      context.lineWidth = 5
      context.beginPath()
      context.moveTo(doorX, floorY)
      context.lineTo(doorX, 388)
      context.quadraticCurveTo(doorX, doorY, x, doorY)
      context.quadraticCurveTo(doorX + doorW, doorY, doorX + doorW, 388)
      context.lineTo(doorX + doorW, floorY)
      context.closePath()
      context.fill()
      context.stroke()

      // Plank seams and highlights.
      context.strokeStyle = 'rgba(35, 10, 31, 0.65)'
      context.lineWidth = 2
      for (let plank = 1; plank < 5; plank++) {
        const px = doorX + plank * (doorW / 5)
        context.beginPath()
        context.moveTo(px, 378)
        context.lineTo(px, floorY - 3)
        context.stroke()
      }
      context.strokeStyle = 'rgba(255, 176, 119, 0.32)'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(doorX + 9, 385)
      context.lineTo(doorX + 9, floorY - 9)
      context.moveTo(doorX + 31, 380)
      context.lineTo(doorX + 31, floorY - 9)
      context.stroke()

      // Heavy iron crossbars and rivets.
      const iron = context.createLinearGradient(0, 405, 0, 417)
      iron.addColorStop(0, '#c18aff')
      iron.addColorStop(0.35, '#583879')
      iron.addColorStop(1, '#211632')
      context.fillStyle = iron
      context.strokeStyle = '#170d2b'
      context.lineWidth = 2
      context.fillRect(doorX + 2, 402, doorW - 4, 10)
      context.strokeRect(doorX + 2, 402, doorW - 4, 10)
      ;[doorX + 9, doorX + doorW - 9].forEach(bolt => {
        context.fillStyle = '#f4c878'
        context.beginPath()
        context.arc(bolt, 407, 2, 0, Math.PI * 2)
        context.fill()
      })

      // Golden ring handle.
      context.save()
      context.shadowColor = hasKey ? '#ffd45c' : '#9b7544'
      context.shadowBlur = hasKey ? 16 : 5
      context.strokeStyle = '#f2bd55'
      context.lineWidth = 4
      context.beginPath()
      context.arc(x + 25, 424, 8, 0, Math.PI * 2)
      context.stroke()
      context.fillStyle = '#ffe3a0'
      context.beginPath()
      context.arc(x + 25, 414, 3, 0, Math.PI * 2)
      context.fill()
      context.restore()

      // Lanterns mounted on both sides of the gate.
      ;[-67, 67].forEach(side => {
        const lx = x + side
        context.strokeStyle = '#4b285c'
        context.lineWidth = 4
        context.beginPath()
        context.moveTo(lx, 372)
        context.lineTo(lx, 382)
        context.stroke()
        context.save()
        context.shadowColor = '#ff9b2e'
        context.shadowBlur = hasKey ? 24 : 15
        const flame = context.createRadialGradient(lx, 393, 2, lx, 393, 17)
        flame.addColorStop(0, '#fff6b0')
        flame.addColorStop(0.35, '#ffbd45')
        flame.addColorStop(1, '#e65a18')
        context.fillStyle = flame
        context.strokeStyle = '#5a2b35'
        context.lineWidth = 3
        context.beginPath()
        context.moveTo(lx - 10, 383)
        context.lineTo(lx + 10, 383)
        context.lineTo(lx + 8, 402)
        context.lineTo(lx, 408)
        context.lineTo(lx - 8, 402)
        context.closePath()
        context.fill()
        context.stroke()
        context.restore()
      })

      // EXIT sign sits above the arch, not inside the door.
      context.save()
      context.shadowColor = hasKey ? '#ffad32' : '#a45cff'
      context.shadowBlur = hasKey ? 18 : 8
      context.fillStyle = hasKey ? '#ffe18a' : '#d7b5ff'
      context.font = 'bold 19px Georgia'
      context.textAlign = 'center'
      context.fillText('EXIT', x, 306)
      context.restore()

      // Small lock plate changes to gold once the key is collected.
      context.fillStyle = hasKey ? '#f6bd43' : '#6c5a88'
      context.strokeStyle = '#1b102c'
      context.lineWidth = 2
      context.beginPath()
      context.roundRect(x - 9, 430, 18, 17, 4)
      context.fill()
      context.stroke()
      context.restore()
    }

    // WORLD

    const drawWorld = () => {
      context.save()
      context.translate(-cameraX, 0)

      // Purple haunted-stone platforms — visual polish only.
      // Collision rectangles, platform positions and movement stay unchanged.
      platforms.forEach((platform, platformIndex) => {
        const bodyY = platform.y
        const bodyHeight = HEIGHT - platform.y

        // Deep shadow underneath the stone structure.
        context.fillStyle = '#09051f'
        context.fillRect(platform.x, bodyY + 8, platform.width, bodyHeight - 8)

        // Dark purple stone foundation.
        const foundation = context.createLinearGradient(
          platform.x, bodyY + 10, platform.x, HEIGHT,
        )
        foundation.addColorStop(0, currentLevel === 8 ? '#34444a' : currentLevel === 9 ? '#3d4148' : '#211044')
        foundation.addColorStop(0.45, currentLevel === 8 ? '#202f35' : currentLevel === 9 ? '#252a32' : '#17102f')
        foundation.addColorStop(1, currentLevel === 8 ? '#101b20' : currentLevel === 9 ? '#111720' : '#0b0921')
        context.fillStyle = foundation
        context.fillRect(platform.x, bodyY + 10, platform.width, bodyHeight - 10)

        // Glowing top rim, like the reference image.
        context.save()
        context.shadowColor = currentLevel === 8 ? '#77d6bd' : currentLevel === 9 ? '#e0a34b' : '#b45cff'
        context.shadowBlur = 15
        context.fillStyle = currentLevel === 8 ? '#65b9a5' : currentLevel === 9 ? '#bd8740' : '#a85aff'
        context.fillRect(platform.x + 2, bodyY - 2, platform.width - 4, 5)
        context.restore()

        const topStoneWidth = 46
        const topGap = 3
        for (
          let x = platform.x;
          x < platform.x + platform.width - 5;
          x += topStoneWidth + topGap
        ) {
          const stoneWidth = Math.min(
            topStoneWidth,
            platform.x + platform.width - x - 3,
          )
          const stoneGradient = context.createLinearGradient(
            x, bodyY - 1, x, bodyY + 23,
          )
          stoneGradient.addColorStop(0, currentLevel === 8 ? '#c1d0c7' : currentLevel === 9 ? '#b7a58c' : '#e1a2ff')
          stoneGradient.addColorStop(0.18, currentLevel === 8 ? '#829d91' : currentLevel === 9 ? '#817866' : '#a95bfa')
          stoneGradient.addColorStop(0.62, currentLevel === 8 ? '#526e68' : currentLevel === 9 ? '#55515a' : '#7134bd')
          stoneGradient.addColorStop(1, currentLevel === 8 ? '#293e3d' : currentLevel === 9 ? '#292b34' : '#382064')

          context.save()
          context.shadowColor = currentLevel === 8 ? '#78d9bd' : currentLevel === 9 ? '#d39a4b' : '#a94dff'
          context.shadowBlur = 8
          context.fillStyle = stoneGradient
          context.strokeStyle = currentLevel === 8 ? '#172b2b' : currentLevel === 9 ? '#29242a' : '#291047'
          context.lineWidth = 2
          context.beginPath()
          context.roundRect(x, bodyY - 1, stoneWidth, 24, 5)
          context.fill()
          context.stroke()
          context.restore()

          // Bright upper bevel and darker lower bevel.
          context.fillStyle = 'rgba(255, 220, 255, 0.78)'
          context.fillRect(x + 5, bodyY + 2, Math.max(8, stoneWidth - 10), 2)
          context.fillStyle = 'rgba(31, 12, 63, 0.72)'
          context.fillRect(x + 5, bodyY + 19, Math.max(8, stoneWidth - 10), 3)
        }

        // Staggered chunky masonry rows down the front face.
        const rowHeight = 27
        let row = 0
        for (
          let y = bodyY + 23;
          y < HEIGHT - 2;
          y += rowHeight, row++
        ) {
          const offset = row % 2 === 0 ? 0 : 23
          for (
            let x = platform.x - offset;
            x < platform.x + platform.width;
            x += 49
          ) {
            const left = Math.max(platform.x + 2, x + 2)
            const right = Math.min(platform.x + platform.width - 2, x + 46)
            const width = right - left
            if (width < 9) continue

            const shade = (row + Math.floor(x / 49) + platformIndex) % 3
            const colors = currentLevel === 8 ? ['#425b57', '#526b63', '#304744'] : ['#35205f', '#40236f', '#2b194f']
            const blockGradient = context.createLinearGradient(
              left, y, left, y + 23,
            )
            blockGradient.addColorStop(0, colors[shade])
            blockGradient.addColorStop(1, currentLevel === 8 ? '#172725' : '#17102f')

            context.fillStyle = blockGradient
            context.strokeStyle = '#110a2c'
            context.lineWidth = 2
            context.beginPath()
            context.roundRect(left, y, width, 23, 5)
            context.fill()
            context.stroke()

            // Subtle violet edge highlights make each block readable.
            context.fillStyle = currentLevel === 8 ? 'rgba(151, 226, 194, 0.42)' : 'rgba(177, 112, 255, 0.42)'
            context.fillRect(left + 5, y + 2, Math.max(6, width - 13), 2)
            context.fillStyle = 'rgba(7, 5, 24, 0.5)'
            context.fillRect(left + 5, y + 19, Math.max(6, width - 13), 2)
          }
        }

        // Fine purple glow along the front edge.
        context.save()
        context.shadowColor = currentLevel === 8 ? '#67c8aa' : '#8e43e8'
        context.shadowBlur = 7
        context.strokeStyle = currentLevel === 8 ? 'rgba(119, 211, 180, 0.58)' : 'rgba(166, 100, 255, 0.55)'
        context.lineWidth = 1.5
        context.beginPath()
        context.moveTo(platform.x + 2, bodyY + 25)
        context.lineTo(platform.x + platform.width - 2, bodyY + 25)
        context.stroke()
        context.restore()
      })

      // SPIKES — glowing crystal traps with a solid metal base

      spikePositions.forEach(spikeX => {
        context.save()

        // Soft orange glow around the complete trap
        context.shadowColor = '#ff7a18'
        context.shadowBlur = 15

        // Heavy dark metal base, visibly attached to the ground
        const baseGradient = context.createLinearGradient(
          spikeX - 5, 449, spikeX - 5, 466
        )
        baseGradient.addColorStop(0, '#8b5a9f')
        baseGradient.addColorStop(0.35, '#34204f')
        baseGradient.addColorStop(1, '#130d2c')

        context.fillStyle = baseGradient
        context.strokeStyle = '#b98aff'
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(spikeX - 5, 450)
        context.lineTo(spikeX + 65, 450)
        context.lineTo(spikeX + 69, 455)
        context.lineTo(spikeX + 65, 466)
        context.lineTo(spikeX - 5, 466)
        context.lineTo(spikeX - 9, 455)
        context.closePath()
        context.fill()
        context.stroke()

        // Three sharp, faceted crystal blades
        for (let i = 0; i < 3; i++) {
          const x = spikeX + i * 23

          const bladeGradient = context.createLinearGradient(
            x, 425, x + 22, 455
          )
          bladeGradient.addColorStop(0, '#fff4b0')
          bladeGradient.addColorStop(0.22, '#ffbd45')
          bladeGradient.addColorStop(0.58, '#ff741d')
          bladeGradient.addColorStop(1, '#a92c22')

          // Dark outer silhouette
          context.shadowColor = '#ff8a2a'
          context.shadowBlur = 10
          context.fillStyle = '#180d2b'
          context.strokeStyle = '#ffe0a0'
          context.lineWidth = 1.7
          context.beginPath()
          context.moveTo(x, 454)
          context.lineTo(x + 5, 438)
          context.lineTo(x + 11, 423)
          context.lineTo(x + 17, 440)
          context.lineTo(x + 22, 454)
          context.closePath()
          context.fill()
          context.stroke()

          // Main orange crystal face
          context.shadowBlur = 5
          context.fillStyle = bladeGradient
          context.strokeStyle = '#ff9b36'
          context.lineWidth = 1
          context.beginPath()
          context.moveTo(x + 3, 452)
          context.lineTo(x + 11, 428)
          context.lineTo(x + 19, 452)
          context.closePath()
          context.fill()
          context.stroke()

          // Bright inner facet makes the blade look sharp and dimensional
          context.shadowBlur = 0
          context.fillStyle = 'rgba(255, 248, 190, 0.9)'
          context.beginPath()
          context.moveTo(x + 10, 432)
          context.lineTo(x + 6, 449)
          context.lineTo(x + 10, 446)
          context.closePath()
          context.fill()

          // Hot glowing core near the bottom
          context.shadowColor = '#ff4b08'
          context.shadowBlur = 8
          context.fillStyle = '#fff0a0'
          context.beginPath()
          context.arc(x + 11, 449, 2.2, 0, Math.PI * 2)
          context.fill()
        }

        // Small bolts on the trap base
        context.shadowBlur = 0
        for (let i = 0; i < 3; i++) {
          const boltX = spikeX + 7 + i * 23
          context.fillStyle = '#ffd27a'
          context.beginPath()
          context.arc(boltX, 459, 1.7, 0, Math.PI * 2)
          context.fill()
        }

        context.restore()
      })

      // SEISMIC COLLECTIBLES

      collectibles.forEach((item, index) => {
        if (collected.has(index)) return

        const pulse =
          1 + Math.sin(performance.now() / 180 + index) * 0.08

        context.save()
        context.translate(item.x, item.y)
        context.scale(pulse, pulse)

        context.shadowColor = '#a68cff'
        context.shadowBlur = 20

        if (seismicSprite) {
          context.drawImage(
            seismicSprite,
            -19,
            -19,
            38,
            38,
          )
        } else {
          context.fillStyle = '#fff'
          context.beginPath()
          context.arc(0, 0, 13, 0, Math.PI * 2)
          context.fill()

          context.fillStyle = '#171717'
          context.font = 'bold 15px Arial'
          context.textAlign = 'center'
          context.fillText('S', 0, 5)
        }

        context.restore()
      })

      // KEY

      if (
        collectedCount === (currentLevel === 10 ? 10 : 5) &&
        !hasKey &&
        (currentLevel !== 10 || player.x > 4890)
      ) {
        // Level 10: reveal the key only after Rocky has jumped past the vampire.
        drawKey(levelKey.x, levelKey.y)
      }

      drawExit()

      // GHOST ENEMIES

      ghosts.forEach(drawGhost)

      if (currentLevel === 10 && vampireHealth > 0) {
        const boss = ghosts.find(enemy => enemy.kind === 'vampire')
        if (boss) {
          const bx = boss.x - cameraX
          if (bx > -100 && bx < WIDTH + 100) {
            context.save()
            context.fillStyle = 'rgba(18, 5, 28, 0.9)'
            context.strokeStyle = '#c46bff'; context.lineWidth = 2
            context.beginPath(); context.roundRect(bx - 48, boss.y - 100, 96, 13, 6); context.fill(); context.stroke()
            context.fillStyle = '#e33c68'
            context.beginPath(); context.roundRect(bx - 45, boss.y - 97, 90 * (vampireHealth / 3), 7, 4); context.fill()
            context.restore()
          }
        }
      }

      // ROCKY ORIGINAL SPRITE

      if (rockySprite) {
        const flashing =
          invulnerableTime > 0 &&
          Math.floor(performance.now() / 100) % 2 === 0

        if (!flashing) {
          context.save()

          context.translate(
            player.x + player.width / 2,
            player.y + player.height,
          )

          if (player.facing === -1) {
            context.scale(-1, 1)
          }

          context.drawImage(
            rockySprite,
            -player.width / 2,
            -player.height,
            player.width,
            player.height,
          )

          context.restore()
        }
      } else {
        context.fillStyle = '#05050a'

        context.fillRect(
          player.x,
          player.y,
          player.width,
          player.height,
        )
      }

      context.restore()
    }

    // HUD — neon purple status bar matching the requested reference.
    const drawHUD = () => {
      // Compact HUD: smaller footprint while keeping every status item readable.
      const barX = 13
      const barY = 19
      const barWidth = 405
      const barHeight = 36

      context.save()
      context.shadowColor = '#a94dff'
      context.shadowBlur = 10
      const frameGradient = context.createLinearGradient(
        barX, barY, barX, barY + barHeight,
      )
      frameGradient.addColorStop(0, 'rgba(30, 13, 75, 0.97)')
      frameGradient.addColorStop(1, 'rgba(12, 8, 42, 0.96)')
      context.fillStyle = frameGradient
      context.strokeStyle = '#b85cff'
      context.lineWidth = 1.8
      context.beginPath()
      context.roundRect(barX, barY, barWidth, barHeight, 13)
      context.fill()
      context.stroke()
      context.shadowBlur = 0

      context.strokeStyle = 'rgba(220, 160, 255, 0.72)'
      context.lineWidth = 0.8
      context.beginPath()
      context.roundRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4, 11)
      context.stroke()

      const drawCapsule = (x: number, width: number) => {
        const capsuleGradient = context.createLinearGradient(
          x, barY + 4, x, barY + barHeight - 4,
        )
        capsuleGradient.addColorStop(0, 'rgba(10, 7, 38, 0.98)')
        capsuleGradient.addColorStop(1, 'rgba(24, 10, 65, 0.96)')
        context.fillStyle = capsuleGradient
        context.beginPath()
        context.roundRect(x, barY + 4, width, 28, 14)
        context.fill()
      }

      drawCapsule(17, 81)
      drawCapsule(101, 106)
      drawCapsule(211, 103)
      drawCapsule(316, 94)

      // Three individually spaced hearts, matching the larger reference HUD.
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = 'bold 23px Arial'
      context.fillStyle = '#ff426b'
      context.shadowColor = 'rgba(255, 48, 105, 0.8)'
      context.shadowBlur = 7
      for (let heartIndex = 0; heartIndex < 3; heartIndex += 1) {
        const heartX = 39 + heartIndex * 19
        if (heartIndex < lives) {
          context.fillText('♥', heartX, 37)
        } else {
          context.shadowBlur = 0
          context.fillStyle = 'rgba(105, 77, 123, 0.55)'
          context.fillText('♥', heartX, 37)
          context.fillStyle = '#ff426b'
          context.shadowColor = 'rgba(255, 48, 105, 0.8)'
          context.shadowBlur = 7
        }
      }
      context.shadowBlur = 0

      // Original Seismic asset, matching the collectibles in the game world.
      if (seismicSprite) {
        context.save()
        context.shadowColor = '#70dfff'
        context.shadowBlur = 6
        context.drawImage(seismicSprite, 125, 23, 24, 27)
        context.restore()
      }

      context.fillStyle = '#f7f4ff'
      context.font = '900 16px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
      context.textAlign = 'left'
      context.fillText(`${collectedCount}/${currentLevel === 10 ? 10 : 5}`,  153, 38)

      // Compact stopwatch.
      const timerX = 228
      const timerY = 37
      context.save()
      context.strokeStyle = '#f8f5ff'
      context.fillStyle = '#f8f5ff'
      context.lineWidth = 2.4
      context.beginPath()
      context.arc(timerX + 8, timerY, 8.5, 0, Math.PI * 2)
      context.stroke()
      context.beginPath()
      context.roundRect(timerX + 5, timerY - 12, 6, 4, 1.5)
      context.fill()
      context.beginPath()
      context.moveTo(timerX + 8, timerY)
      context.lineTo(timerX + 8, timerY - 6)
      context.moveTo(timerX + 8, timerY)
      context.lineTo(timerX + 13, timerY + 3)
      context.stroke()
      context.restore()

      const remaining = Math.max(0, Math.ceil(GAME_DURATION - elapsedTime))
      const minutes = Math.floor(remaining / 60)
      const seconds = remaining % 60
      const timerText = `${minutes}:${String(seconds).padStart(2, '0')}`
      context.textAlign = 'left'
      context.font = '900 16px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
      context.fillStyle = remaining <= 30 ? '#ff7777' : '#f7f4ff'
      context.fillText(timerText, 247, 38)

      const levelGradient = context.createLinearGradient(
        316, barY + 5, 316, barY + 31,
      )
      levelGradient.addColorStop(0, '#483078')
      levelGradient.addColorStop(1, '#241344')
      context.fillStyle = levelGradient
      context.strokeStyle = 'rgba(194, 145, 255, 0.9)'
      context.lineWidth = 1.2
      context.beginPath()
      context.roundRect(325, barY + 7, 78, 22, 8)
      context.fill()
      context.stroke()
      context.textAlign = 'center'
      context.font = '900 13px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
      context.fillStyle = '#fffaff'
      context.fillText(`LEVEL ${currentLevel}`, 364, 38)
      context.restore()

      const objective = currentLevel === 10 && collectedCount < 10
        ? 'COLLECT 10 SEISMIC LOGOS'
        : currentLevel === 10 && !hasKey && player.x <= 4890
        ? 'JUMP OVER THE VAMPIRE TO REVEAL THE KEY'
        : currentLevel === 10 && !hasKey
        ? 'GET THE KEY BY THE EXIT!'
        : hasKey
        ? 'KEY: UNLOCKED'
        : collectedCount === (currentLevel === 10 ? 10 : 5)
          ? 'FIND THE KEY!'
          : 'COLLECT 5 SEISMIC LOGOS'

      context.save()
      context.textAlign = 'left'
      context.textBaseline = 'middle'
      context.font = '900 12px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
      context.lineJoin = 'round'
      context.lineWidth = 1.8
      context.strokeStyle = 'rgba(12, 13, 34, 0.9)'
      context.strokeText(objective, 21, 70)
      context.fillStyle = '#fff0c9'
      context.shadowColor = 'rgba(255, 207, 120, 0.2)'
      context.shadowBlur = 3
      context.fillText(objective, 21, 70)
      context.restore()

      // Pause button keeps its original position and hit area.
      const pauseGradient = context.createLinearGradient(890, 66, 940, 108)
      pauseGradient.addColorStop(0, '#59408a')
      pauseGradient.addColorStop(0.48, '#30205f')
      pauseGradient.addColorStop(1, '#1b123e')

      context.save()
      context.shadowColor = 'rgba(177, 105, 255, 0.72)'
      context.shadowBlur = 12
      context.fillStyle = pauseGradient
      context.strokeStyle = '#c69aff'
      context.lineWidth = 2
      context.beginPath()
      context.roundRect(888, 66, 54, 42, 9)
      context.fill()
      context.stroke()
      context.shadowBlur = 0
      context.strokeStyle = 'rgba(255, 255, 255, 0.42)'
      context.lineWidth = 0.8
      context.beginPath()
      context.roundRect(891, 69, 48, 36, 7)
      context.stroke()
      context.fillStyle = '#fffaff'
      context.shadowColor = 'rgba(230, 211, 255, 0.8)'
      context.shadowBlur = 6
      context.beginPath()
      context.roundRect(904, 77, 6, 21, 2)
      context.roundRect(920, 77, 6, 21, 2)
      context.fill()
      context.restore()
    }

    // COLLECT SEISMIC LOGOS

    const collectSeismicLogos = () => {
      collectibles.forEach((item, index) => {
        if (collected.has(index)) return

        if (
          intersects(
            player.x,
            player.y,
            player.width,
            player.height,
            item.x - 19,
            item.y - 19,
            38,
            38,
          )
        ) {
          collected.add(index)
          collectedCount += 1

          playGameSound('collect')
        }
      })
    }

    // HAZARD COLLISIONS

    const checkHazards = () => {
      for (const spikeX of spikePositions) {
        if (
          intersects(
            player.x + 7,
            player.y + 8,
            player.width - 14,
            player.height - 12,
            spikeX,
            425,
            69,
            30,
          )
        ) {
          loseLife()
          return
        }
      }

      for (let index = ghosts.length - 1; index >= 0; index--) {
        const enemy = ghosts[index]

        // Level 10 is a jump-over challenge, not a boss fight.
        // Let Rocky pass the vampire without taking damage or needing to stomp it.
        if (currentLevel === 10 && enemy.kind === 'vampire') continue

        const enemyWidth = enemy.kind === 'vampire' ? 92 : enemy.kind === 'zombie' ? 68 : 40
        const enemyHeight = enemy.kind === 'vampire' ? 92 : enemy.kind === 'zombie' ? 66 : 55
        const hit = intersects(
          player.x + 5, player.y + 8, player.width - 10, player.height - 12,
          enemy.x - enemyWidth / 2, enemy.y - (enemy.kind === 'vampire' ? 70 : 25),
          enemyWidth, enemyHeight,
        )
        if (!hit) continue

        if (enemy.kind === 'vampire') {
          const playerBottom = player.y + player.height
          const bossTop = enemy.y - 70
          const stomping = player.vy > 80 && playerBottom - bossTop < 28
          const bossCycle = performance.now() % 3200
          const recovering = bossCycle > 2350
          if (stomping && recovering && vampireHitCooldown <= 0) {
            vampireHealth = Math.max(0, vampireHealth - 1)
            vampireHitCooldown = 0.8
            player.vy = -430
            player.grounded = false
            playGameSound('collect')
            if (vampireHealth === 0) {
              ghosts.splice(index, 1)
              playGameSound('victory')
            }
          } else if (invulnerableTime <= 0) {
            loseLife()
            return
          }
        } else {
          loseLife()
          return
        }
      }
    }

    // KEY AND EXIT

    const checkKeyAndExit = () => {
      if (
        collectedCount === (currentLevel === 10 ? 10 : 5) &&
        !hasKey &&
        (currentLevel !== 10 || player.x > 4890) &&
        intersects(
          player.x,
          player.y,
          player.width,
          player.height,
          levelKey.hitboxX,
          levelKey.hitboxY,
          55,
          45,
        )
      ) {
        hasKey = true
        playGameSound('key')
      }

      const exitHitbox = getExitHitbox()

      if (
        hasKey &&
        intersects(
          player.x,
          player.y,
          player.width,
          player.height,
          exitHitbox.x,
          exitHitbox.y,
          exitHitbox.width,
          exitHitbox.height,
        )
      ) {
        gameState = 'complete'
        playGameSound('victory')
      }
    }

    // UPDATE GAME

    const update = (delta: number) => {
      const dt = Math.min(delta, 0.033)

      if (gameState !== 'playing' || isPaused) return

      elapsedTime += dt

      invulnerableTime = Math.max(0, invulnerableTime - dt)
      vampireHitCooldown = Math.max(0, vampireHitCooldown - dt)

      if (elapsedTime >= GAME_DURATION) {
        gameState = 'gameover'
        playGameSound('gameover')
        return
      }

      const left =
        keys.has('a') ||
        keys.has('arrowleft') ||
        touchKeysRef.current.has('left')

      const right =
        keys.has('d') ||
        keys.has('arrowright') ||
        touchKeysRef.current.has('right')

      player.vx = 0

      if (left) {
        player.vx = -moveSpeed
        player.facing = -1
      }

      if (right) {
        player.vx = moveSpeed
        player.facing = 1
      }

      if (
        (jumpRequested || touchJumpRef.current) &&
        player.grounded
      ) {
        player.vy = -jumpForce
        player.grounded = false

        playGameSound('jump')
      }

      jumpRequested = false
      touchJumpRef.current = false

      const previousX = player.x
      const previousBottom = player.y + player.height

      // Move horizontally first, then resolve solid platform walls.
      // Rocky can stand and jump on stone platforms, but cannot walk through them.
      player.x += player.vx * dt

      player.x = Math.max(
        0,
        Math.min(WORLD_WIDTH - player.width, player.x),
      )

      for (const platform of platforms) {
        const overlapsPlatformHeight =
          player.y + player.height > platform.y &&
          player.y < HEIGHT

        if (!overlapsPlatformHeight) continue

        const crossedRightWall =
          player.vx > 0 &&
          previousX + player.width <= platform.x &&
          player.x + player.width > platform.x

        const crossedLeftWall =
          player.vx < 0 &&
          previousX >= platform.x + platform.width &&
          player.x < platform.x + platform.width

        if (crossedRightWall) {
          player.x = platform.x - player.width
        } else if (crossedLeftWall) {
          player.x = platform.x + platform.width
        }
      }

      player.vy += gravity * dt
      player.y += player.vy * dt

      player.grounded = false

      // PLATFORM LANDING

      if (player.vy >= 0) {
        for (const platform of platforms) {
          const currentBottom =
            player.y + player.height

          const overlapsX =
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width

          const crossedPlatform =
            previousBottom <= platform.y &&
            currentBottom >= platform.y

          if (overlapsX && crossedPlatform) {
            player.y = platform.y - player.height
            player.vy = 0
            player.grounded = true
            break
          }
        }
      }

      // FALLING OUT OF WORLD

      if (player.y > HEIGHT + 100) {
        loseLife()
        return
      }

      // MOVE GHOSTS

      ghosts.forEach(ghost => {
        // The final zombie periodically telegraphs and performs a short, dangerous charge.
        // Other enemies keep their normal patrol speed.
        const zombieCycle = performance.now() % 2600
        const zombieCharging = ghost.kind === 'zombie' && zombieCycle > 1450 && zombieCycle < 2250
        const vampireCycle = performance.now() % 3200
        const vampireCharging = ghost.kind === 'vampire' && vampireCycle > 900 && vampireCycle < 2050
        const movementSpeed = ghost.speed * (zombieCharging ? 2.35 : vampireCharging ? 2.15 : 1)
        ghost.x += movementSpeed * ghost.direction * dt

        if (ghost.x >= ghost.maxX) {
          ghost.x = ghost.maxX
          ghost.direction = -1
        } else if (ghost.x <= ghost.minX) {
          ghost.x = ghost.minX
          ghost.direction = 1
        }
      })

      collectSeismicLogos()

      if (gameState !== 'playing') return

      checkHazards()

      if (gameState !== 'playing') return

      checkKeyAndExit()

      cameraX = Math.max(
        0,
        Math.min(
          WORLD_WIDTH - WIDTH,
          player.x - WIDTH * 0.35,
        ),
      )
    }

    // PAUSE MENU — reference-matched compact design
    const drawPauseScreen = () => {
      // Darken the live gameplay without replacing the background.
      context.fillStyle = 'rgba(5, 12, 31, 0.68)'
      context.fillRect(0, 0, WIDTH, HEIGHT)

      context.save()
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.lineJoin = 'round'

      // PAUSE SETTINGS VIEW
      if (pauseSettingsOpen) {
        context.shadowColor = 'rgba(0, 0, 0, 0.35)'
        context.shadowBlur = 4
        context.font = '900 42px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
        context.lineWidth = 6
        context.strokeStyle = '#080b14'
        context.strokeText('SETTINGS', WIDTH / 2, 150)
        context.fillStyle = '#fffaf4'
        context.fillText('SETTINGS', WIDTH / 2, 150)
        context.shadowBlur = 0

        context.fillStyle = '#f0f1f7'
        context.font = 'bold 15px "Trebuchet MS", Arial'
        context.fillText('Game audio settings', WIDTH / 2, 194)

        context.font = '900 14px "Trebuchet MS", Arial'
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        // Draw one compact volume row with minus / current value / plus.
        const drawVolumeRow = (label: string, value: number, rowY: number) => {
          context.fillStyle = '#fffaf4'
          context.font = '900 14px "Trebuchet MS", Arial'
          context.textAlign = 'right'
          context.fillText(label, 410, rowY + 1)

          const drawVolumeButton = (buttonX: number, symbol: string) => {
            context.fillStyle = '#241344'
            context.strokeStyle = '#a66bff'
            context.lineWidth = 2
            context.beginPath()
            context.roundRect(buttonX, rowY - 15, 34, 30, 8)
            context.fill()
            context.stroke()

            context.fillStyle = '#fffaf4'
            context.font = '900 21px "Trebuchet MS", Arial'
            context.textAlign = 'center'
            context.fillText(symbol, buttonX + 17, rowY + 1)
          }

          drawVolumeButton(430, '−')

          context.fillStyle = '#fffaf4'
          context.font = '900 15px "Trebuchet MS", Arial'
          context.textAlign = 'center'
          context.fillText(`${Math.round(value * 100)}%`, 480, rowY + 1)

          drawVolumeButton(496, '+')
        }

        drawVolumeRow('SOUND', gameSoundVolume, 245)
        drawVolumeRow('MUSIC', gameMusicVolume, 280)

        // Back button
        context.fillStyle = '#7299c0'
        context.strokeStyle = '#050a12'
        context.lineWidth = 4
        context.beginPath()
        context.roundRect(410, 345, 140, 42, 10)
        context.fill()
        context.stroke()

        context.font = '900 18px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
        context.lineWidth = 3
        context.strokeStyle = '#10131b'
        context.strokeText('BACK', WIDTH / 2, 366)
        context.fillStyle = '#ffffff'
        context.fillText('BACK', WIDTH / 2, 366)

        context.restore()
        return
      }

      // TITLE — rounded bold lettering with a dark outline
      context.shadowColor = 'rgba(0, 0, 0, 0.35)'
      context.shadowBlur = 4
      context.font = '900 58px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
      context.lineWidth = 7
      context.strokeStyle = '#080b14'
      context.strokeText('PAUSE', WIDTH / 2, 108)
      context.fillStyle = '#fffaf4'
      context.fillText('PAUSE', WIDTH / 2, 108)
      context.shadowBlur = 0

      // SUBTITLE
      context.fillStyle = '#f5f2f7'
      context.font = 'bold 15px "Trebuchet MS", Arial'
      context.fillText('Progress will be saved', WIDTH / 2, 151)

      // DECORATIVE DIVIDER
      context.strokeStyle = 'rgba(235, 239, 250, 0.82)'
      context.lineWidth = 1.4
      context.beginPath()
      context.moveTo(378, 200)
      context.lineTo(445, 200)
      context.moveTo(515, 200)
      context.lineTo(582, 200)
      context.stroke()

      context.fillStyle = '#ffffff'
      context.font = 'bold 25px Georgia'
      context.fillText('✥', WIDTH / 2, 200)

      // BUTTONS — dimensions and spacing matched to the reference
      const drawPauseButton = (label: string, y: number) => {
        const x = 390
        const buttonWidth = 180
        const buttonHeight = 48

        context.save()
        context.shadowColor = 'rgba(0, 0, 0, 0.45)'
        context.shadowBlur = 7
        context.fillStyle = '#7299c0'
        context.strokeStyle = '#050a12'
        context.lineWidth = 4

        context.beginPath()
        context.roundRect(x, y, buttonWidth, buttonHeight, 10)
        context.fill()
        context.stroke()

        context.shadowBlur = 0
        context.font = '900 16px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
        context.lineWidth = 3
        context.strokeStyle = '#10131b'
        context.strokeText(label, WIDTH / 2, y + buttonHeight / 2 + 1)

        context.fillStyle = '#ffffff'
        context.fillText(label, WIDTH / 2, y + buttonHeight / 2 + 1)
        context.restore()
      }

      drawPauseButton('CONTINUE', 230)
      drawPauseButton('SETTINGS', 285)
      drawPauseButton('EXIT', 340)

      context.restore()
    }

    // GAME OVER / VICTORY SCREEN — polished haunted-game celebration.
    const drawEndScreen = () => {
      context.save()
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      // Keep the game world visible behind a soft night-purple veil.
      const veil = context.createLinearGradient(0, 0, 0, HEIGHT)
      veil.addColorStop(0, 'rgba(12, 4, 39, 0.24)')
      veil.addColorStop(1, 'rgba(18, 5, 48, 0.38)')
      context.fillStyle = veil
      context.fillRect(0, 0, WIDTH, HEIGHT)

      if (gameState === 'complete') {
        // Small golden trophy with laurel branches.
        context.save()
        context.translate(WIDTH / 2, 66)
        context.shadowColor = '#ffad25'
        context.shadowBlur = 18
        context.strokeStyle = '#ffc84f'
        context.lineWidth = 3
        context.lineCap = 'round'
        for (const side of [-1, 1]) {
          context.beginPath()
          context.moveTo(side * 53, 15)
          context.quadraticCurveTo(side * 76, -10, side * 60, -29)
          context.stroke()
          for (let leaf = 0; leaf < 3; leaf++) {
            const ly = 7 - leaf * 12
            context.beginPath()
            context.ellipse(side * (58 + leaf * 3), ly, 5, 9, side * -0.7, 0, Math.PI * 2)
            context.stroke()
          }
        }
        const gold = context.createLinearGradient(0, -28, 0, 24)
        gold.addColorStop(0, '#fff5a6')
        gold.addColorStop(0.45, '#ffbf36')
        gold.addColorStop(1, '#e97813')
        context.fillStyle = gold
        context.strokeStyle = '#71300c'
        context.lineWidth = 3
        context.beginPath()
        context.moveTo(-25, -25)
        context.lineTo(25, -25)
        context.lineTo(21, 3)
        context.quadraticCurveTo(0, 24, -21, 3)
        context.closePath()
        context.fill()
        context.stroke()
        context.beginPath()
        context.arc(-25, -12, 11, Math.PI / 2, Math.PI * 1.5)
        context.arc(25, -12, 11, -Math.PI / 2, Math.PI / 2)
        context.stroke()
        context.fillRect(-5, 5, 10, 15)
        context.fillRect(-19, 19, 38, 6)
        context.restore()

        // Bold celebratory title with a dark cartoon-style outline.
        context.save()
        context.font = '900 43px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
        context.lineJoin = 'round'
        context.lineWidth = 8
        context.strokeStyle = '#21102f'
        context.shadowColor = 'rgba(255, 150, 35, 0.75)'
        context.shadowBlur = 13
        context.strokeText(`LEVEL ${currentLevel} COMPLETE!`, WIDTH / 2, 145)
        const titleGradient = context.createLinearGradient(0, 119, 0, 165)
        titleGradient.addColorStop(0, '#fff4df')
        titleGradient.addColorStop(0.55, '#ffd39a')
        titleGradient.addColorStop(1, '#ff8b58')
        context.fillStyle = titleGradient
        context.fillText(`LEVEL ${currentLevel} COMPLETE!`, WIDTH / 2, 145)
        context.restore()

        context.font = 'bold 17px "Trebuchet MS", Arial'
        context.fillStyle = '#fff4e8'
        context.shadowColor = 'rgba(0, 0, 0, 0.8)'
        context.shadowBlur = 5
        context.fillText('Rocky escaped the haunted world!', WIDTH / 2, 181)
        context.shadowBlur = 0

        // Three dark stat capsules, matching the reference composition.
        const stats = [
          { x: 142, label: 'SEISMIC', value: `${collectedCount}/${currentLevel === 10 ? 10 : 5}`, color: '#c8a0ff' },
          { x: 380, label: 'TIME', value: `${String(Math.floor(Math.max(0, Math.ceil(GAME_DURATION - elapsedTime)) / 60)).padStart(2, '0')}:${String(Math.max(0, Math.ceil(GAME_DURATION - elapsedTime)) % 60).padStart(2, '0')}`, color: '#8beaff' },
          { x: 618, label: 'LIVES', value: String(lives), color: '#ff6486' },
        ]
        stats.forEach((stat, index) => {
          const x = stat.x
          const y = 228
          const w = 200
          const h = 62
          context.save()
          context.shadowColor = 'rgba(174, 91, 255, 0.32)'
          context.shadowBlur = 9
          const capsule = context.createLinearGradient(x, y, x, y + h)
          capsule.addColorStop(0, 'rgba(20, 8, 48, 0.97)')
          capsule.addColorStop(1, 'rgba(9, 4, 29, 0.99)')
          context.fillStyle = capsule
          context.strokeStyle = 'rgba(171, 105, 238, 0.72)'
          context.lineWidth = 1.6
          context.beginPath()
          context.roundRect(x, y, w, h, 19)
          context.fill()
          context.stroke()
          context.shadowBlur = 0

          // Actual Seismic asset for the collectible stat.
          if (index === 0 && seismicSprite) {
            context.drawImage(seismicSprite, x + 18, y + 13, 38, 38)
          } else if (index === 0) {
            context.strokeStyle = stat.color
            context.lineWidth = 3
            context.beginPath()
            context.moveTo(x + 34, y + 13)
            context.lineTo(x + 49, y + 33)
            context.lineTo(x + 34, y + 53)
            context.lineTo(x + 19, y + 33)
            context.closePath()
            context.stroke()
          } else if (index === 1) {
            context.strokeStyle = stat.color
            context.lineWidth = 3
            context.beginPath()
            context.arc(x + 35, y + 31, 16, 0, Math.PI * 2)
            context.moveTo(x + 35, y + 19)
            context.lineTo(x + 35, y + 31)
            context.lineTo(x + 45, y + 36)
            context.stroke()
          } else {
            context.font = 'bold 32px Arial'
            context.fillStyle = stat.color
            context.fillText('♥', x + 35, y + 32)
          }

          context.textAlign = 'left'
          context.fillStyle = '#fff4ff'
          context.font = '900 16px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
          context.fillText(`${stat.label === 'SEISMIC' ? 'Seismic' : stat.label === 'TIME' ? 'Time' : 'Lives'}: ${stat.value}`, x + 66, y + 33)
          context.restore()
        })

        // Main Menu — purple glossy button.
        const drawActionButton = (x: number, y: number, w: number, h: number, label: string, kind: 'menu' | 'again') => {
          context.save()
          context.shadowColor = kind === 'menu' ? '#bd83ff' : '#ff9b27'
          context.shadowBlur = 17
          const gradient = context.createLinearGradient(x, y, x, y + h)
          if (kind === 'menu') {
            gradient.addColorStop(0, '#9a55e8')
            gradient.addColorStop(0.55, '#7135bd')
            gradient.addColorStop(1, '#482078')
          } else {
            gradient.addColorStop(0, '#ffd15a')
            gradient.addColorStop(0.48, '#ff9e25')
            gradient.addColorStop(1, '#ef7015')
          }
          context.fillStyle = gradient
          context.strokeStyle = kind === 'menu' ? '#e4c4ff' : '#ffe1a0'
          context.lineWidth = 3
          context.beginPath()
          context.roundRect(x, y, w, h, 19)
          context.fill()
          context.stroke()
          context.shadowBlur = 0
          context.strokeStyle = kind === 'menu' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.55)'
          context.lineWidth = 1.2
          context.beginPath()
          context.roundRect(x + 5, y + 5, w - 10, h - 10, 14)
          context.stroke()

          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.font = '900 20px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
          context.lineWidth = 4
          context.lineJoin = 'round'
          const labelX = x + w / 2 + 20
          const labelY = y + h / 2 + 1

          context.strokeStyle = kind === 'menu' ? '#28133f' : '#7b370c'
          context.strokeText(label, labelX, labelY)
          context.fillStyle = kind === 'menu' ? '#fff8ff' : '#3d1b08'
          context.fillText(label, labelX, labelY)

          // Home icon for MAIN MENU; play triangle remains on NEXT LEVEL.
          context.fillStyle = kind === 'menu' ? '#fff8ff' : '#3d1b08'
          if (kind === 'menu') {
            context.beginPath()
            context.moveTo(x + 29, y + 35)
            context.lineTo(x + 43, y + 23)
            context.lineTo(x + 57, y + 35)
            context.lineTo(x + 53, y + 35)
            context.lineTo(x + 53, y + 49)
            context.lineTo(x + 45, y + 49)
            context.lineTo(x + 45, y + 41)
            context.lineTo(x + 41, y + 41)
            context.lineTo(x + 41, y + 49)
            context.lineTo(x + 33, y + 49)
            context.lineTo(x + 33, y + 35)
            context.closePath()
            context.fill()
          } else {
            context.beginPath()
            context.moveTo(x + 31, y + 23)
            context.lineTo(x + 31, y + 47)
            context.lineTo(x + 50, y + 35)
            context.closePath()
            context.fill()
          }
          context.restore()
        }

        drawActionButton(196, 354, 260, 72, 'MAIN MENU', 'menu')
        drawActionButton(504, 354, 260, 72, currentLevel < 10 ? 'NEXT LEVEL' : 'PLAY AGAIN', 'again')

      } else {
        // Game-over state keeps the same visual language without changing its logic.
        context.save()
        context.textAlign = 'center'
        context.font = '900 45px "Arial Rounded MT Bold", "Trebuchet MS", Arial'
        context.lineJoin = 'round'
        context.lineWidth = 8
        context.strokeStyle = '#24102f'
        context.strokeText('GAME OVER', WIDTH / 2, 166)
        context.fillStyle = '#ff856d'
        context.fillText('GAME OVER', WIDTH / 2, 166)
        context.font = 'bold 19px Arial'
        context.fillStyle = '#fff0dc'
        context.fillText('The haunted world caught Rocky...', WIDTH / 2, 207)

        context.fillStyle = 'rgba(20, 8, 52, 0.94)'
        context.strokeStyle = '#a96bdf'
        context.lineWidth = 2
        context.beginPath()
        context.roundRect(260, 245, 440, 70, 18)
        context.fill()
        context.stroke()
        context.font = 'bold 21px Arial'
        context.fillStyle = '#fff5ff'
        context.fillText(`Seismic logos collected: ${collectedCount}/${currentLevel === 10 ? 10 : 5}`, WIDTH / 2, 280)

        context.fillStyle = '#ff9e2a'
        context.strokeStyle = '#ffe0a0'
        context.lineWidth = 2
        context.beginPath()
        context.roundRect(220, 354, 240, 68, 17)
        context.fill()
        context.stroke()
        // Circular retry icon, matching the supplied reference.
        context.strokeStyle = '#351808'
        context.fillStyle = '#351808'
        context.lineWidth = 4
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.arc(260, 388, 10, -Math.PI * 0.78, Math.PI * 0.72)
        context.stroke()
        context.beginPath()
        context.moveTo(250, 378)
        context.lineTo(250, 390)
        context.lineTo(261, 386)
        context.closePath()
        context.fill()

        context.fillStyle = '#351808'
        context.font = '900 20px Arial'
        context.fillText('RETRY', 355, 388)

        context.fillStyle = '#7135bd'
        context.strokeStyle = '#e4c4ff'
        context.beginPath()
        context.roundRect(500, 354, 240, 68, 17)
        context.fill()
        context.stroke()
        // Home icon for MAIN MENU, matching the supplied reference.
        context.fillStyle = '#fff8ff'
        context.beginPath()
        context.moveTo(526, 377)
        context.lineTo(542, 363)
        context.lineTo(558, 377)
        context.lineTo(554, 377)
        context.lineTo(554, 394)
        context.lineTo(545, 394)
        context.lineTo(545, 384)
        context.lineTo(539, 384)
        context.lineTo(539, 394)
        context.lineTo(530, 394)
        context.lineTo(530, 377)
        context.closePath()
        context.fill()
        context.font = '900 20px Arial'
        context.fillText('MAIN MENU', 640, 388)
        context.font = '13px Arial'
        context.fillStyle = '#e8d9ff'
        context.fillText('Press R to retry', WIDTH / 2, 463)
        context.restore()
      }

      context.textAlign = 'left'
      context.textBaseline = 'alphabetic'
      context.restore()
    }

    // END SCREEN BUTTONS

    const onCanvasClick = (event: MouseEvent) => {
      if (gameMusicRef.current?.paused) {
        void gameMusicRef.current.play().catch(() => {})
      }

      const rect = canvas.getBoundingClientRect()

      const x =
        (event.clientX - rect.left) * WIDTH / rect.width

      const y =
        (event.clientY - rect.top) * HEIGHT / rect.height

      // PAUSE BUTTON IN THE HUD
      if (gameState === 'playing' && !isPaused &&
          x >= 888 && x <= 942 && y >= 66 && y <= 108) {
        isPaused = true
        keys.clear()
        touchKeysRef.current.clear()
        touchJumpRef.current = false
        return
      }

      // PAUSE MENU BUTTONS
      if (isPaused) {
        if (pauseSettingsOpen) {
          const adjustVolume = (current: number, change: number) =>
            Math.max(0, Math.min(1, Math.round((current + change) * 100) / 100))

          // SOUND row: minus / plus
          if (y >= 228 && y <= 262) {
            if (x >= 430 && x <= 464) {
              setGameAudioLevels(adjustVolume(gameSoundVolume, -0.05), gameMusicVolume)
            } else if (x >= 496 && x <= 530) {
              setGameAudioLevels(adjustVolume(gameSoundVolume, 0.05), gameMusicVolume)
            }
            return
          }

          // MUSIC row: minus / plus
          if (y >= 263 && y <= 297) {
            if (x >= 430 && x <= 464) {
              setGameAudioLevels(gameSoundVolume, adjustVolume(gameMusicVolume, -0.05))
            } else if (x >= 496 && x <= 530) {
              setGameAudioLevels(gameSoundVolume, adjustVolume(gameMusicVolume, 0.05))
            }
            return
          }

          if (x >= 410 && x <= 550 && y >= 345 && y <= 387) {
            pauseSettingsOpen = false
          }
          return
        }

        if (x >= 390 && x <= 570 && y >= 230 && y <= 278) {
          isPaused = false
        } else if (x >= 390 && x <= 570 && y >= 285 && y <= 333) {
          pauseSettingsOpen = true
        } else if (x >= 390 && x <= 570 && y >= 340 && y <= 388) {
          onExit?.()
        }
        return
      }

      if (gameState === 'playing') return

      if (gameState === 'complete') {
        if (y >= 354 && y <= 426) {
          if (x >= 196 && x <= 456) {
            onExit?.()
          } else if (x >= 504 && x <= 764) {
            if (currentLevel < 10) {
              loadLevel(currentLevel + 1)
            }
            resetGame()
          }
        }
      } else if (y >= 354 && y <= 422) {
        if (x >= 220 && x <= 460) {
          resetGame()
        } else if (x >= 500 && x <= 740) {
          onExit?.()
        }
      }
    }

    // RENDER

    const render = () => {
      context.clearRect(0, 0, WIDTH, HEIGHT)

      drawBackground()
      drawWorld()

      if (gameState === 'playing') {
        drawHUD()
      }

      if (isPaused && gameState === 'playing') {
        drawPauseScreen()
      } else if (gameState !== 'playing') {
        drawEndScreen()
      }
    }

    // GAME LOOP

    const loop = (time: number) => {
      if (!lastTime) lastTime = time

      const delta = (time - lastTime) / 1000
      lastTime = time

      update(delta)
      render()

      animationFrame = requestAnimationFrame(loop)
    }

    // EVENT LISTENERS

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    canvas.addEventListener('click', onCanvasClick)

    animationFrame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationFrame)

      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)

      canvas.removeEventListener('click', onCanvasClick)

      gameMusicOscillators.forEach((oscillator) => {
        try {
          oscillator.stop()
        } catch {
          // The oscillator may already have stopped.
        }
      })

      gameMusicOscillators = []
      gameMusicGain = null
      gameMusicStarted = false

      if (
        gameAudioContext &&
        gameAudioContext.state !== 'closed'
      ) {
        void gameAudioContext.close()
        gameAudioContext = null
      }
    }
  }, [onExit, soundVolume, musicVolume])

  // MOBILE CONTROLS

  return (
    <div className="game-canvas-wrapper">
      <audio
        ref={gameMusicRef}
        src="/audio/halloween-ambient.mp3"
        loop
        preload="auto"
      />
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label="Rocky's Haunted Escape gameplay"
        tabIndex={0}
      />

      <div
        className="mobile-controls"
        aria-label="Touch game controls"
      >
        <div className="mobile-movement">
          <button
            type="button"
            className="mobile-control-button"
            aria-label="Move Rocky left"
            onPointerDown={(event) => {
              event.preventDefault()
              unlockGameAudio()
              if (gameMusicRef.current?.paused) {
                void gameMusicRef.current.play().catch(() => {})
              }

              event.currentTarget.setPointerCapture(
                event.pointerId,
              )

              touchKeysRef.current.add('left')
            }}
            onPointerUp={(event) => {
              touchKeysRef.current.delete('left')

              if (
                event.currentTarget.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                event.currentTarget.releasePointerCapture(
                  event.pointerId,
                )
              }
            }}
            onPointerCancel={() => {
              touchKeysRef.current.delete('left')
            }}
          >
            ◀
          </button>

          <button
            type="button"
            className="mobile-control-button"
            aria-label="Move Rocky right"
            onPointerDown={(event) => {
              event.preventDefault()
              unlockGameAudio()
              if (gameMusicRef.current?.paused) {
                void gameMusicRef.current.play().catch(() => {})
              }

              event.currentTarget.setPointerCapture(
                event.pointerId,
              )

              touchKeysRef.current.add('right')
            }}
            onPointerUp={(event) => {
              touchKeysRef.current.delete('right')

              if (
                event.currentTarget.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                event.currentTarget.releasePointerCapture(
                  event.pointerId,
                )
              }
            }}
            onPointerCancel={() => {
              touchKeysRef.current.delete('right')
            }}
          >
            ▶
          </button>
        </div>

        <button
          type="button"
          className="mobile-control-button jump-button"
          aria-label="Make Rocky jump"
          onPointerDown={(event) => {
            event.preventDefault()
            unlockGameAudio()
            if (gameMusicRef.current?.paused) {
              void gameMusicRef.current.play().catch(() => {})
            }
            touchJumpRef.current = true
          }}
        >
          JUMP
        </button>
      </div>

      <div className="game-controls-hint">
        A / D or ← / → : MOVE
        <span>SPACE : JUMP</span>
      </div>
    </div>
  )
}