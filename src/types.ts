export interface IncursionRoom {
  _index: number;
  Id: string;
  IsPathway: boolean;
  UpgradedBy: number[];
  ConvertedBy: number[];
  ConvertedTo: number[];
  UpgradedByPower: number;
  IsPresentDay: boolean;
  IsBossReward: boolean;
  Name: string;
  Icon_DDSFile: string;
}

export interface IncursionRoomPerLevel {
  _index: number;
  Room: number;
  Level: number;
  Id: string;
  Description: string;
  Name: string;
  Icon_DDSFile: string;
  Mod: number | null;
  ModValues: number[];
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
  | "pathconnect1"
  | "pathconnect2"
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
  roomId?: number;
  tier?: number;
  pathType?: PathType;
  isPowered?: boolean;
  hasMedallion?: boolean;
  upgradedByRooms?: string[]; // Names of adjacent rooms that contribute to upgrade
  poweredByGenerators?: {
    r: number;
    c: number;
    tier: number;
    distance: number;
  }[]; // Info about generators providing power
}

export interface TempleState {
  grid: (GridCell | null)[][]; // 9x9
}
