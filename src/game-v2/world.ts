export interface World {
  xMin: number; // Leftmost position on x axis of world
  xMax: number; // Rightmost position on x axis
  xMid: number; // Middle position of x min and max
  zMin: number; // Farthest back player can move, corresponds to min boundary of current road
  xMinPlayer: number; // Farthest left the player can move on x axis
  xMaxPlayer: number; // Farthest right the player can move on x axis
  xMaxArea: number; // Max metres the player can move around on x axis
}
