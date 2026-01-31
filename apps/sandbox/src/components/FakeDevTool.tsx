import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useLocalStorage } from "uifork";
import { IconX } from "@tabler/icons-react";

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
  const [isExpanded, setIsExpanded] = useState(false);
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
    // Don't start drag tracking if clicking on the close button
    if ((e.target as HTMLElement).closest("[data-close-button]")) {
      return;
    }
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
        // Toggle expanded state on click (not drag)
        setIsExpanded((prev) => !prev);
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

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          ref={containerRef}
          className="fixed z-[9999]"
          style={{
            ...containerPosition,
            touchAction: "none",
          }}
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
          <motion.div
            className={`h-8.5 rounded-full border-none cursor-grab active:cursor-grabbing shadow-lg transition-transform hover:scale-110 hover:shadow-xl flex items-center justify-center gap-2 ${
              isExpanded ? "bg-red-500/80 pl-1.5 pr-3" : "bg-black px-3"
            }`}
            role="button"
            aria-label="Fake dev tool"
            tabIndex={0}
            draggable={false}
            animate={{
              width: isExpanded ? "auto" : "32px",
            }}
            transition={{
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            }}
          >
            <span
              className="font-semibold text-[15px] flex-shrink-0 w-6 h-6 rounded-full bg-gray-200/30 flex items-center justify-center"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#ffffff",
                opacity: 0.9,
              }}
            >
              N
            </span>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: ANIMATION_DURATION }}
                className="text-white text-xs font-medium whitespace-nowrap"
              >
                2 Issues
              </motion.span>
            )}
            {isExpanded && (
              <motion.div
                data-close-button
                onClick={handleClose}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                role="button"
                aria-label="Close"
                tabIndex={0}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: ANIMATION_DURATION }}
              >
                <IconX size={14} stroke={2} />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Fake dev tool</p>
      </TooltipContent>
    </Tooltip>
  );
}
