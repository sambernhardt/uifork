import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useLocalStorage } from "uifork";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const ANIMATION_DURATION = 0.2;
const ANIMATION_EASING = [0.04, 1.02, 0.13, 1.02] as const;
const DRAG_THRESHOLD = 5;
const DEFAULT_OFFSET = 20;

function getContainerPosition(position: Position, offset: number = DEFAULT_OFFSET) {
  const positions: Record<Position, React.CSSProperties> = {
    "top-left": {
      top: `${offset}px`,
      left: `${offset}px`,
      bottom: "auto",
      right: "auto",
    },
    "top-right": {
      top: `${offset}px`,
      right: `${offset}px`,
      bottom: "auto",
      left: "auto",
    },
    "bottom-left": {
      bottom: `${offset}px`,
      left: `${offset}px`,
      top: "auto",
      right: "auto",
    },
    "bottom-right": {
      bottom: `${offset}px`,
      right: `${offset}px`,
      top: "auto",
      left: "auto",
    },
  };
  return positions[position];
}

function getNearestCorner(x: number, y: number): Position {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;

  if (x < centerX && y < centerY) {
    return "top-left";
  } else if (x >= centerX && y < centerY) {
    return "top-right";
  } else if (x < centerX && y >= centerY) {
    return "bottom-left";
  } else {
    return "bottom-right";
  }
}

export function FakeDevTool() {
  const [position, setPosition] = useLocalStorage<Position>(
    "fake-dev-tool-position",
    "bottom-left",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [resetDrag, setResetDrag] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [pointerStart, setPointerStart] = useState<{
    x: number;
    y: number;
    event: PointerEvent | null;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const containerPosition = getContainerPosition(position);

  const handleDragEnd = useCallback(
    (_event: PointerEvent, _info: { point: { x: number; y: number } }) => {
      setIsDragging(false);
      setDragEnabled(false);
      setPointerStart(null);

      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }

      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const nearestCorner = getNearestCorner(centerX, centerY);
      setPosition(nearestCorner);
      setResetDrag(true);
    },
    [setPosition],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const pointerEvent = e.nativeEvent as PointerEvent;
    setPointerStart({ x: e.clientX, y: e.clientY, event: pointerEvent });
    setDragEnabled(false);
    if (containerRef.current) {
      containerRef.current.setAttribute("data-drag-tracking", "true");
    }
  }, []);

  useEffect(() => {
    if (!pointerStart) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - pointerStart.x);
      const deltaY = Math.abs(e.clientY - pointerStart.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD && !dragEnabled) {
        setDragEnabled(true);
        setResetDrag(false);
        dragControls.start(e, { snapToCursor: true });
      }
    };

    const handlePointerUp = () => {
      if (!dragEnabled) {
        setPointerStart(null);
        setDragEnabled(false);
        document.body.style.removeProperty("cursor");
        if (containerRef.current) {
          containerRef.current.style.removeProperty("cursor");
          containerRef.current.removeAttribute("data-drag-tracking");
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [pointerStart, dragEnabled, dragControls]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setResetDrag(false);
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.body.style.userSelect = "none";
    if (containerRef.current) {
      containerRef.current.style.setProperty("cursor", "grabbing", "important");
      containerRef.current.setAttribute("data-dragging", "true");
    }
  }, []);

  useEffect(() => {
    if (resetDrag && !isDragging) {
      const timer = setTimeout(
        () => {
          setResetDrag(false);
        },
        ANIMATION_DURATION * 1000 + 50,
      );
      return () => clearTimeout(timer);
    }
  }, [resetDrag, isDragging]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          ref={containerRef}
          className="fixed w-8 h-8 z-[9999]"
          layout
          drag={dragEnabled}
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0}
          dragListener={false}
          onPointerDown={handlePointerDown}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          animate={resetDrag ? { x: 0, y: 0 } : {}}
          style={{
            ...containerPosition,
            touchAction: "none",
          }}
          transition={{
            layout: {
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            },
            x: {
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            },
            y: {
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            },
          }}
        >
          <button
            className="w-full h-full rounded-full bg-black border-none cursor-grab active:cursor-grabbing shadow-lg transition-transform hover:scale-110 hover:shadow-xl flex items-center justify-center"
            aria-label="Fake dev tool"
            draggable={false}
          >
            <span
              className="font-semibold text-[15px]"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                background: "linear-gradient(to bottom right, #ffffff, #a0a0a0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                opacity: 0.7,
              }}
            >
              N
            </span>
          </button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Fake dev tool</p>
      </TooltipContent>
    </Tooltip>
  );
}
