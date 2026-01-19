export type Point = { x: number; y: number };

// export type PersistedPath = {
//   type: "path";
//   points: Point[];
// };

export type MarkflowElement =
  | {
      id: string;
      type: "path";
      points: Point[];
    }
  | RectElement;

export type MarkflowData = {
  width: number;
  height: number;
  elements: MarkflowElement[];
};

export type RectElement = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Element =
  | { id: string; type: "path"; points: Point[] }
  | { id: string; type: "rect"; x: number; y: number; width: number; height: number }
  | { id: string; type: "circle"; cx: number; cy: number; r: number }
  | { id: string; type: "arrow"; points: Point[] };