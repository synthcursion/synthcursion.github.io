export interface IncursionRoom {
  _index: number;
  Id: string;
  IsPathway: boolean;
  UpgradedBy: string[];
  ConvertedBy: string[];
  ConvertedTo: string[];
  UpgradedByPower: number;
  IsPresentDay: boolean;
  IsBossReward: boolean;
  Name: string;
  Icon_DDSFile: string;
  Levels: IncursionRoomPerLevel[];
  MaxLevel: number;
}

export interface IncursionRoomPerLevel {
  _index: number;
  Room: string;
  Level: number;
  Id: string;
  Description: string;
  Name: string;
  Icon_DDSFile: string;
  Mod: number | null;
  ModValues: number[];
  ModStats: string[];
  Description2: string;
}

export interface IncursionMedallion {
  _index: number;
  Id: string;
  Name: string;
  FlavourText: string;
  Icon_DDSFile: string;
  Description: string;
}

export type PathType =
  | "path1"
  | "path2"
  | "pathcornerbot"
  | "pathcornerleft"
  | "pathcornerright"
  | "pathcornertop"
  | "pathfourway"
  | "paththreeway1"
  | "paththreeway2"
  | "paththreeway3"
  | "paththreeway4";

export interface GridCell {
  type: "room" | "path" | "empty";
  roomId?: string;
  tier?: number;
  pathType?: PathType;
  isPowered?: boolean;
  medallionType?: string;
  upgradedByRooms?: string[]; // Names of adjacent rooms that contribute to upgrade
  poweredByGenerators?: {
    x: number;
    y: number;
    tier: number;
    distance: number;
  }[]; // Info about generators providing power
  roomToRoomConnections?: Direction[];
  roomToPathConnections?: Direction[];
  roomToPathPermanentConnections?: Direction[];
  pathToPathConnections?: Direction[];
  pathToRoomConnections?: Direction[];
  pathToRoomPermanentConnections?: Direction[];
}

export type Direction = "top" | "bottom" | "left" | "right";

export interface TempleState {
  grid: (GridCell | null)[][]; // 9x9
}
