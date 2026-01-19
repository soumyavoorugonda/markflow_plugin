import React, { useState, useRef } from "react";
import type { MarkflowData, RectElement} from "./types";

type Point = { x: number; y: number };
type PathElement = {
  id: string,
  points: Point[];
};
export type Tool =
  | "pencil"
  | "eraser"
  | "rect"
  | "circle"
  | "arrow"
  | "text";

const WIDTH = 800;
const HEIGHT = 500;
const ERASER_RADIUS = 8;



export default function MarkflowApp(
  {
    initialData,
    onChange,
    activeTool,
    onToolChange,
  }: {
    initialData: MarkflowData;
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    onChange: (data: MarkflowData) => void;
  }) {
  const isActive = (tool: Tool) => activeTool === tool;
  const initialPaths: PathElement[] =
  initialData.elements
    ?.filter((el) => el.type === "path")
    .map((el) => ({
      id: el.id,
      points: el.points,
    })) ?? [];
  const [paths, setPaths] = useState<PathElement[]>(initialPaths);
  const [currentPath, setCurrentPath] = useState<PathElement | null>(null);
  const [pathRedo, setPathRedo] = useState<PathElement[]>([]);
  const [rectRedo, setRectRedo] = useState<RectElement[]>([]);

  const [rects, setRects] = useState<RectElement[]>(
    initialData.elements
      .filter((e) => e.type === "rect")
      .map((r) => r)
  );

  const [currentRect, setCurrentRect] = useState<RectElement | null>(null);
  const rectStartRef = useRef<Point | null>(null);


  function getPoint(evt: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const svg = evt.currentTarget;
    const rect = svg.getBoundingClientRect();

    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function isPointNearPath(
    point: Point,
    path: Point[],
    threshold = 6
  ): boolean {
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (!p) continue;

      if (distance(point, p) <= threshold) {
        return true;
      }
    }
    return false;
  }

  function handleMouseDown(
    evt: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) {
    const point = getPoint(evt);

    if (activeTool === "pencil") {
      // isDrawingRef.current = true;
      setCurrentPath({
        id: crypto.randomUUID(),
        points: [point],
      });
      return;
    }

    if (activeTool === "eraser") {
      // isDrawingRef.current = true;
      eraseAtPoint(point);
      persistAll(rects, paths);         // persist immediately
      // isDrawingRef.current = false;
      return;
    }
    if (activeTool === "rect") {
      // isDrawingRef.current = true;
      rectStartRef.current = point;

      setCurrentRect({
        id: crypto.randomUUID(),
        type: "rect",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
      return;
    }
  }

  function handleMouseMove(
    evt: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) {
    if (activeTool === "pencil" && currentPath) {
      const next = getPoint(evt);
      setCurrentPath((prev) =>
        prev ? { ...prev, points: [...prev.points, next] } : prev
      );
      return;
    }

    if (activeTool === "eraser" && evt.buttons === 1) {
      eraseAtPoint(getPoint(evt));
    }
    if (activeTool === "rect" && rectStartRef.current) {
      const p = getPoint(evt);
      const start = rectStartRef.current;

      setCurrentRect((prev) =>
        prev
          ? {
              ...prev,
              x: Math.min(start.x, p.x),
              y: Math.min(start.y, p.y),
              width: Math.abs(p.x - start.x),
              height: Math.abs(p.y - start.y),
            }
          : prev
      );
      return;
    }
  }

  function handleMouseUp() {
    if (activeTool === "pencil" && currentPath) {
      const nextPaths = [...paths, currentPath];
      setPaths(nextPaths);
      setCurrentPath(null);
      setPathRedo([]);
      setRectRedo([]);
      persistAll(rects, nextPaths);
      // isDrawingRef.current = false;
      return;
    }

    if (activeTool === "rect" && currentRect) {
      const nextRects = [...rects, currentRect];
      setRects(nextRects);
      setCurrentRect(null);
      rectStartRef.current = null;
      setRectRedo([]);
      setPathRedo([]);
      persistAll(nextRects, paths);
      // isDrawingRef.current = false;
      return;
    }

    if (activeTool === "eraser") {
      persistAll(rects, paths);
      // isDrawingRef.current = false;
      return;
  }
  // isDrawingRef.current = false;
}

  function persist(nextPaths: PathElement[]) {
    onChange({
      width: WIDTH,
      height: HEIGHT,
      elements: nextPaths.map((p) => ({
        id: p.id,
        type: "path" as const,
        points: p.points,
      })),
    });
  }

  function persistAll(
    nextRects: RectElement[],
    nextPaths: PathElement[]
  ) {
    onChange({
      width: WIDTH,
      height: HEIGHT,
      elements: [
        ...nextPaths.map((p) => ({
          id: p.id,
          type: "path" as const,
          points: p.points,
        })),
        ...nextRects,
      ],
    });
  }




  function undo() {
    if (rects.length > 0) {
      const last = rects[rects.length - 1];
      if (!last) return;

      setRects(rects.slice(0, -1));
      setRectRedo((prev) => [...prev, last]);
      return;
    }

    if (paths.length > 0) {
      const last = paths[paths.length - 1];
      if (!last) return;

      setPaths(paths.slice(0, -1));
      setPathRedo((prev) => [...prev, last]);
    }
  }


  function redo() {
    // Redo rectangle first
    if (rectRedo.length > 0) {
      const last = rectRedo[rectRedo.length - 1];
      if (!last) return;

      setRectRedo(rectRedo.slice(0, -1));
      setRects((prev) => [...prev, last]);
      return;
    }

    // Redo path
    if (pathRedo.length > 0) {
      const last = pathRedo[pathRedo.length - 1];
      if (!last) return;

      setPathRedo(pathRedo.slice(0, -1));
      setPaths((prev) => [...prev, last]);
    }
  }

  function eraseAtPoint(point: Point) {
    let didErase = false;

    // Rectangles (whole erase)
    const nextRects = rects.filter((r) => {
      const hit =
        point.x >= r.x &&
        point.x <= r.x + r.width &&
        point.y >= r.y &&
        point.y <= r.y + r.height;

      if (hit) {
        didErase = true;
        setRectRedo((prev) => [...prev, r]);
      }
      return !hit;
    });

    if (nextRects.length !== rects.length) {
      setRects(nextRects);
      return;
    }

    // Paths (partial erase)
    const nextPaths: PathElement[] = [];

    for (const path of paths) {
      const near = path.points.some((p) =>
        isPointNear(point, p, ERASER_RADIUS)
      );

      if (!near) {
        nextPaths.push(path);
        continue;
      }

      didErase = true;
      setPathRedo((prev) => [...prev, path]);

      const split = erasePathPartially(path, point, ERASER_RADIUS);
      nextPaths.push(...split);
    }

    if (didErase) {
      setPaths(nextPaths);
    }
}


  return (
    <div
      style = {{
        width: WIDTH,
        userSelect: "none",
        fontSize: "14px",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "6px 8px",
          border: "1px solid var(--background-modifier-border)",
          borderBottom: "none",
          background: "var(--background-secondary)",
        }}
      >
        <ToolbarButton
          label="Undo"
          active={false}
          onClick={undo}
          disabled={paths.length === 0 && rects.length === 0}
        > ↶ </ToolbarButton>

        <ToolbarButton
          label="Redo"
          active={false}
          onClick={redo}
          disabled={pathRedo.length === 0 && rectRedo.length === 0}
        > ↷ </ToolbarButton>

        <ToolbarButton
          label="Pencil"
          active={isActive("pencil")}
          onClick={() => onToolChange("pencil")}
        >
          ✏️
        </ToolbarButton>

        <ToolbarButton
          label="Eraser"
          active={isActive("eraser")}
          onClick={() => onToolChange("eraser")}
        >
          🧽
        </ToolbarButton>

        <ToolbarButton
          label="Rectangle"
          active={isActive("rect")}
          onClick={() => onToolChange("rect")}
        >
          ▭
        </ToolbarButton>

        <ToolbarButton
          label="Circle"
          active={isActive("circle")}
          onClick={() => onToolChange("circle")}
        >
          ◯
        </ToolbarButton>

        <ToolbarButton
          label="Arrow"
          active={isActive("arrow")}
          onClick={() => onToolChange("arrow")}
        >
          ➜
        </ToolbarButton>

        <ToolbarButton
          label="Text"
          active={isActive("text")}
          onClick={() => onToolChange("text")}
        >
          T
        </ToolbarButton>
      </div>
      
      {/* Canvas */}
      <svg
        width={WIDTH}
        height={HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "block",
          border: "1px solid var(--background-modifier-border)",
          cursor:
            isActive("text")
              ? "text"
              : isActive("pencil")
              ? "crosshair"
              : "default",
        }}
  
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fill="#f9f9f6"
        />
        {/* Rectangles*/}
        {rects.map((r) => (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill="transparent"
            stroke="#222"
            strokeWidth={2}
          />
        ))}

        {currentRect && (
          <rect
            x={currentRect.x}
            y={currentRect.y}
            width={currentRect.width}
            height={currentRect.height}
            fill="transparent"
            stroke="#222"
            strokeDasharray="4 2"
            strokeWidth={2}
          />
        )}

        {/* Completed paths */}
        {paths.map((path) => (
          <path
            key={path.id}
            d={pointsToPath(path.points)}
            fill="none"
            stroke="#222"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Current drawing path */}
        {currentPath && (
          <path
            d={pointsToPath(currentPath.points)}
            fill="none"
            stroke="#222"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--background-modifier-border)",
        background: active
          ? "var(--background-modifier-active)"
          : "var(--background-primary)",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function pointsToPath(points: Point[]) {
  if (points.length === 0) return "";

  return points
    .map((p, i) =>
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    )
    .join(" ");
}

function isPointNear(point: Point, target: Point, radius: number) {
  return Math.hypot(point.x - target.x, 
    point.y - target.y) <= radius;
}

function erasePathPartially(
  path: PathElement,
  eraserPoint: Point,
  radius: number
  ): PathElement[] {
  const segments: PathElement[] = [];
  let currentSegment: Point[] = [];

  for (const p of path.points) {
    if (isPointNear(eraserPoint, p, radius)) {
      // Eraser hit → commit current segment if valid
      if (currentSegment.length > 1) {
        segments.push({
          id: crypto.randomUUID(),
          points: currentSegment,
        });
      }
      currentSegment = [];
    } else {
      currentSegment.push(p);
    }
  }

  // Commit last segment
  if (currentSegment.length > 1) {
    segments.push({
      id: crypto.randomUUID(),
      points: currentSegment,
    });
  }
 return segments;
}
