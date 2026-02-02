import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ExplainerAnimation v16 - Sequential Version Toggling
 *
 * Timeline Summary:
 * 0. Start with an idea - App open, version list shows v1, nothing fancy
 * 1. Fork it - Click fork, v2 appears, UI unchanged (establishes "safe copy")
 * 2. Edit it - Brief editor cut, one obvious layout change, save
 * 3. Fork it again - Click fork, v3 appears, hard cut to updated layout
 * 4. And again - Another fork, v4 appears, another visible change
 * 5. Toggle between versions - Slowly toggle in order v1 → v2 → v3 → v4,
 *    let each version sit for ~0.5-0.7s, highlight active version
 *
 * Key improvements:
 * - Sequential version toggling (not random bouncing)
 * - Active version highlighting in list
 * - Deliberate pacing to show progression
 * - List itself communicates momentum
 */

// =============================================================================
// TYPES
// =============================================================================

type ElementTarget = React.RefObject<HTMLElement> | string;

type AnimationState = {
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  };
  uifork: {
    isOpen: boolean;
    hoveredVersion: string | null;
    activeVersion: string;
    versions: string[];
  };
  codeEditor: {
    activeFile: string;
    files: string[];
    isEditing: boolean;
    editorRows: number[];
    visible: boolean;
  };
  onScreenText: {
    text: string;
    visible: boolean;
  };
  timeline: {
    isPlaying: boolean;
    currentStepIndex: number;
  };
};

type TimelineAction =
  | { type: "moveTo"; target: ElementTarget; duration?: number }
  | { type: "hover"; version: string | null }
  | { type: "click" }
  | { type: "type"; text: string }
  | { type: "deleteRows"; count: number }
  | { type: "addRows"; count: number }
  | { type: "wait"; duration: number }
  | { type: "setState"; changes: Partial<Omit<AnimationState, "cursor" | "timeline">> }
  | { type: "showText"; text: string }
  | { type: "hideText" }
  | { type: "showEditor" }
  | { type: "hideEditor" }
  | { type: "log"; message: string };

// =============================================================================
// CURSOR HOOK
// =============================================================================

function useCursor(containerRef: React.RefObject<HTMLElement>) {
  const [position, setPosition] = React.useState({ x: 50, y: 50 });
  const [visible, setVisible] = React.useState(true);
  const animationRef = React.useRef<number | null>(null);
  const positionRef = React.useRef({ x: 50, y: 50 });

  React.useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const getTargetElement = React.useCallback(
    (target: ElementTarget): HTMLElement | null => {
      if (typeof target === "string") {
        return containerRef.current?.querySelector(target) ?? document.querySelector(target);
      }
      return target.current;
    },
    [containerRef],
  );

  const getElementCenter = React.useCallback(
    (element: HTMLElement): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const x = elementRect.left - containerRect.left + elementRect.width / 2;
      const y = elementRect.top - containerRect.top + elementRect.height / 2;

      return {
        x: (x / containerRect.width) * 100,
        y: (y / containerRect.height) * 100,
      };
    },
    [containerRef],
  );

  const moveTo = React.useCallback(
    async (target: ElementTarget, duration = 1000): Promise<void> => {
      const element = getTargetElement(target);
      if (!element) {
        console.warn("useCursor.moveTo: target element not found", target);
        return;
      }

      const targetPos = getElementCenter(element);
      if (!targetPos) return;

      const startPos = { ...positionRef.current };
      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          const currentX = startPos.x + (targetPos.x - startPos.x) * eased;
          const currentY = startPos.y + (targetPos.y - startPos.y) * eased;

          const newPos = { x: currentX, y: currentY };
          positionRef.current = newPos;
          setPosition(newPos);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
      });
    },
    [getTargetElement, getElementCenter],
  );

  const click = React.useCallback(async (): Promise<void> => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const currentPos = positionRef.current;
    const x = containerRect.left + (currentPos.x / 100) * containerRect.width;
    const y = containerRect.top + (currentPos.y / 100) * containerRect.height;

    const element = document.elementFromPoint(x, y) as HTMLElement;
    if (element) {
      element.click();
    }
  }, [containerRef]);

  const reset = React.useCallback((x = 50, y = 50) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const newPos = { x, y };
    positionRef.current = newPos;
    setPosition(newPos);
    setVisible(true);
  }, []);

  const hide = React.useCallback(() => setVisible(false), []);
  const show = React.useCallback(() => setVisible(true), []);

  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    position,
    visible,
    moveTo,
    click,
    reset,
    hide,
    show,
  };
}

// =============================================================================
// TIMELINE RUNNER HOOK
// =============================================================================

function useTimeline(
  timeline: TimelineAction[],
  cursor: ReturnType<typeof useCursor>,
  setState: React.Dispatch<React.SetStateAction<AnimationState>>,
) {
  const isRunningRef = React.useRef(false);

  const run = React.useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setState((s) => ({ ...s, timeline: { ...s.timeline, isPlaying: true, currentStepIndex: 0 } }));

    for (let i = 0; i < timeline.length; i++) {
      if (!isRunningRef.current) break;

      setState((s) => ({ ...s, timeline: { ...s.timeline, currentStepIndex: i } }));
      const action = timeline[i];

      switch (action.type) {
        case "moveTo":
          await cursor.moveTo(action.target, action.duration ?? 1000);
          break;

        case "hover":
          setState((s) => ({
            ...s,
            uifork: { ...s.uifork, hoveredVersion: action.version },
          }));
          break;

        case "click":
          await cursor.click();
          await new Promise((r) => setTimeout(r, 50));
          break;

        case "deleteRows":
          setState((s) => ({
            ...s,
            codeEditor: {
              ...s.codeEditor,
              editorRows: s.codeEditor.editorRows.slice(0, -action.count),
            },
          }));
          break;

        case "addRows":
          setState((s) => {
            const newRows = Array.from(
              { length: action.count },
              () => Math.floor(Math.random() * 30) + 40,
            );
            return {
              ...s,
              codeEditor: {
                ...s.codeEditor,
                editorRows: [...s.codeEditor.editorRows, ...newRows],
              },
            };
          });
          break;

        case "wait":
          await new Promise((r) => setTimeout(r, action.duration));
          break;

        case "setState":
          setState((s) => {
            const newState = { ...s };
            if (action.changes.uifork) {
              newState.uifork = { ...s.uifork, ...action.changes.uifork };
            }
            if (action.changes.codeEditor) {
              newState.codeEditor = {
                ...s.codeEditor,
                ...action.changes.codeEditor,
                editorRows: action.changes.codeEditor.editorRows ?? s.codeEditor.editorRows,
                isEditing: action.changes.codeEditor.isEditing ?? s.codeEditor.isEditing,
                visible: action.changes.codeEditor.visible ?? s.codeEditor.visible,
              };
            }
            if (action.changes.onScreenText) {
              newState.onScreenText = { ...s.onScreenText, ...action.changes.onScreenText };
            }
            return newState;
          });
          break;

        case "showText":
          setState((s) => ({
            ...s,
            onScreenText: { text: action.text, visible: true },
          }));
          break;

        case "hideText":
          setState((s) => ({
            ...s,
            onScreenText: { ...s.onScreenText, visible: false },
          }));
          break;

        case "showEditor":
          setState((s) => ({
            ...s,
            codeEditor: { ...s.codeEditor, visible: true },
          }));
          break;

        case "hideEditor":
          setState((s) => ({
            ...s,
            codeEditor: { ...s.codeEditor, visible: false },
          }));
          break;

        case "log":
          console.log(`[Timeline] ${action.message}`);
          break;
      }
    }

    isRunningRef.current = false;
    setState((s) => ({ ...s, timeline: { ...s.timeline, isPlaying: false } }));
  }, [timeline, cursor, setState]);

  const stop = React.useCallback(() => {
    isRunningRef.current = false;
  }, []);

  const reset = React.useCallback(() => {
    isRunningRef.current = false;
    cursor.reset(50, 50);
    setState((s) => ({
      ...s,
      timeline: { isPlaying: false, currentStepIndex: 0 },
    }));
  }, [cursor, setState]);

  return { run, stop, reset };
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function BrowserFrame({
  children,
  uifork,
}: {
  children: React.ReactNode;
  uifork?: React.ReactNode;
}) {
  return (
    <div className="w-full h-[360px] bg-white dark:bg-stone-900 rounded-lg border border-border overflow-hidden shadow-lg relative flex flex-col">
      <div className="h-8 bg-stone-100 dark:bg-stone-800 border-b border-border flex items-center justify-center shrink-0 relative">
        <div className="absolute left-3 flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
        </div>
        <div className="text-[10px] text-muted-foreground">localhost:5173</div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {children}
        {uifork}
      </div>
    </div>
  );
}

function CodeEditor({ state }: { state: AnimationState["codeEditor"] }) {
  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.21, 0.58, 0.01, 0.97] }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[520px] h-[360px]"
        >
          <div className="w-full h-full bg-card rounded-lg border border-border overflow-hidden shadow-lg flex flex-col">
            <div className="h-8 bg-muted border-b border-border flex items-center px-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
                <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
                <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-[10px] text-muted-foreground font-medium">Code editor</span>
              </div>
              <div className="w-12" />
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-48 bg-muted border-r border-border flex flex-col">
                <div className="flex-1 overflow-auto p-1">
                  <div className="space-y-0.5">
                    <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                      src
                    </div>
                    <div className="pl-3 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                      components
                    </div>
                    <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Card.tsx
                    </div>
                    {state.files.map((file) => (
                      <div
                        key={file}
                        data-file={file}
                        className={`pl-6 pr-1.5 py-0.5 text-[10px] cursor-pointer transition-all duration-300 ${
                          state.activeFile === file
                            ? "text-foreground bg-accent"
                            : "text-muted-foreground"
                        }`}
                      >
                        {file}
                      </div>
                    ))}
                    <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                      DashboardContent.versions.ts
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="h-8 bg-muted border-b border-border flex items-end px-2 gap-1">
                  <div className="px-2 py-1 bg-card border border-b-0 border-border rounded-t text-[10px] text-card-foreground flex items-center gap-1.5 -mb-px">
                    <span>{state.activeFile}</span>
                    {state.isEditing ? (
                      <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    ) : (
                      <svg
                        className="w-3 h-3 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div
                  data-editor-content
                  className="flex-1 overflow-auto p-4 font-mono text-[10px] bg-card space-y-1.5"
                >
                  {state.editorRows.map((width, index) => (
                    <div
                      key={index}
                      data-editor-row={index}
                      className="h-3 bg-muted rounded"
                      style={{
                        width: `${width}%`,
                        marginLeft: index % 3 === 0 ? "0" : index % 3 === 1 ? "1.5rem" : "3rem",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DashboardContent({ version }: { version: string }) {
  const getVersionContent = () => {
    switch (version) {
      case "v1":
        return {
          layout: "single-column",
          itemCount: 5,
          spacing: "space-y-3",
        };
      case "v2":
        return {
          layout: "two-column",
          itemCount: 6,
          spacing: "gap-3",
        };
      case "v3":
        return {
          layout: "three-column",
          itemCount: 9,
          spacing: "gap-3",
        };
      case "v4":
        return {
          layout: "grid-four",
          itemCount: 12,
          spacing: "gap-3",
        };
      case "v5":
        return {
          layout: "grid-five",
          itemCount: 15,
          spacing: "gap-3",
        };
      case "v6":
        return {
          layout: "grid-six",
          itemCount: 18,
          spacing: "gap-3",
        };
      default:
        return {
          layout: "single-column",
          itemCount: 5,
          spacing: "space-y-3",
        };
    }
  };

  const content = getVersionContent();

  const renderContent = () => {
    switch (content.layout) {
      case "single-column":
        return (
          <div className="space-y-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      case "two-column":
        return (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        );
      case "three-column":
        return (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      case "grid-four":
        return (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        );
      case "grid-five":
        return (
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      case "grid-six":
        return (
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 bg-muted rounded" />
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>

      <div className="px-4 border-b border-border flex gap-4">
        <div className="h-8 w-16 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-16 bg-muted rounded" />
      </div>

      <div className="flex-1 p-4 overflow-auto">{renderContent()}</div>
    </div>
  );
}

function MiniUIFork({ state }: { state: AnimationState["uifork"] }) {
  const formatVersionLabel = (version: string) => version.replace(/^v/, "V");

  return (
    <div
      data-uifork
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <motion.div
        layout
        className="bg-[#262626] dark:bg-white border border-[#2f2f2f] dark:border-gray-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden pointer-events-auto rounded-xl"
        style={{
          borderRadius: state.isOpen ? 12 : 16,
        }}
        transition={{
          layout: {
            duration: 0.2,
            ease: [0.04, 1.02, 0.13, 1.02],
          },
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!state.isOpen ? (
            <motion.button
              key="closed"
              data-uifork-trigger
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-white dark:text-gray-900 cursor-pointer bg-transparent border-none whitespace-nowrap hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
              style={{ height: "24px" }}
              layout
            >
              <svg
                className="text-[#22c55e] dark:text-[#22c55e]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ width: "12px", height: "12px" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 7v6M16 7v6"
                />
              </svg>
              <span className="font-medium text-white dark:text-gray-900 whitespace-nowrap text-xs">
                DashboardContent
              </span>
              <span className="text-[#a3a3a3] dark:text-gray-500 whitespace-nowrap text-xs">
                {state.activeVersion.replace(/^v/, "V")}
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="opened"
              layout
              className="p-0.5 flex flex-col"
              style={{ minWidth: "auto" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <button
                  className="flex items-center gap-1 text-xs text-white dark:text-gray-900 bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100 flex-1 justify-between"
                  style={{ height: "24px" }}
                >
                  <span className="font-medium text-white dark:text-gray-900 text-xs">
                    DashboardContent
                  </span>
                  <svg
                    className="w-3 h-3 text-[#a3a3a3] dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              <div className="h-px bg-[#2f2f2f] dark:bg-gray-200 my-0.5" />

              <div className="flex flex-col">
                {[...state.versions].reverse().map((version) => {
                  const isHovered = state.hoveredVersion === version;
                  const isActive = version === state.activeVersion;

                  return (
                    <motion.div
                      key={version}
                      data-version={version}
                      className={`flex items-center gap-1 px-1.5 py-1 text-xs text-white dark:text-gray-900 cursor-pointer rounded relative transition-all duration-200 ${
                        isActive
                          ? "bg-[rgba(255,255,255,0.2)] dark:bg-gray-300"
                          : isHovered
                            ? "bg-[rgba(255,255,255,0.15)] dark:bg-gray-200"
                            : "hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
                      }`}
                      style={{
                        height: "24px",
                        minHeight: "24px",
                      }}
                      animate={{
                        scale: isActive ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-3 h-3 flex items-center justify-center">
                        {isActive && (
                          <motion.svg
                            className="w-2.5 h-2.5 text-white dark:text-gray-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className={`text-xs ${
                            isActive
                              ? "font-semibold text-white dark:text-gray-900"
                              : "text-white dark:text-gray-900"
                          }`}
                        >
                          {formatVersionLabel(version)}
                        </span>
                      </div>
                      {/* Fork button */}
                      <div data-actions className="flex items-center">
                        <button
                          data-fork-button={version}
                          className="w-4 h-4 flex items-center justify-center text-[#a3a3a3] dark:text-gray-500 hover:text-white dark:hover:text-gray-900 rounded transition-colors"
                          style={{ width: "16px", height: "16px" }}
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ width: "12px", height: "12px" }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 7v6M16 7v6"
                            />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="h-px bg-[#2f2f2f] dark:bg-gray-200 my-0.5" />

              <button
                data-new-version-button
                className="flex items-center gap-1 px-1.5 py-1 text-xs text-white dark:text-gray-900 bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
                style={{ height: "24px" }}
              >
                <div className="w-3 h-3 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white dark:text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-white dark:text-gray-900 text-xs">New version</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function OnScreenText({ text, visible }: { text: string; visible: boolean }) {
  const words = React.useMemo(() => text.split(" "), [text]);

  if (!visible) return null;

  return (
    <motion.div
      key={text}
      className="absolute left-8 top-8 z-50 pointer-events-none flex flex-wrap gap-x-2 max-w-[350px]"
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${text}-${index}-${word}`}
          className="text-foreground text-7xl font-medium tracking-tight inline-block"
          variants={{
            hidden: {
              opacity: 0,
              y: 30,
            },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1.2,
                delay: index * 0.05,
                ease: [0.21, 0.58, 0.01, 0.97],
              },
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

function FakeCursorElement({
  position,
  visible,
}: {
  position: { x: number; y: number };
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(2px, 2px)",
        willChange: "left, top",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6" />
        <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5" />
        <rect
          x="12.5"
          y="13.6"
          transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)"
          width="2"
          height="8"
        />
        <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5" />
      </svg>
    </div>
  );
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors pointer-events-auto"
      aria-label="Replay"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_STATE: AnimationState = {
  cursor: { x: 50, y: 50, visible: true },
  uifork: {
    isOpen: false,
    hoveredVersion: null,
    activeVersion: "v1",
    versions: ["v1"],
  },
  codeEditor: {
    activeFile: "DashboardContent.v1.tsx",
    files: ["DashboardContent.v1.tsx"],
    isEditing: false,
    editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45],
    visible: false,
  },
  onScreenText: {
    text: "",
    visible: false,
  },
  timeline: {
    isPlaying: false,
    currentStepIndex: 0,
  },
};

// =============================================================================
// TIMELINE DEFINITION
// =============================================================================

const ANIMATION_TIMELINE: TimelineAction[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 0. Start with an idea - App open, version list shows v1, nothing fancy
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Start with an idea" },
  { type: "showText", text: "Start with an idea" },
  { type: "wait", duration: 1500 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Fork it - Click fork, v2 appears, UI unchanged (establishes "safe copy")
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Fork it" },
  { type: "hideText" },
  { type: "showText", text: "Fork it" },
  { type: "moveTo", target: "[data-uifork-trigger]", duration: 800 },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v1",
        versions: ["v1"],
      },
    },
  },
  { type: "wait", duration: 300 },
  { type: "moveTo", target: '[data-version="v1"]', duration: 500 },
  { type: "hover", version: "v1" },
  { type: "wait", duration: 200 },
  { type: "moveTo", target: '[data-fork-button="v1"]', duration: 400 },
  { type: "wait", duration: 200 },
  { type: "click" },
  { type: "wait", duration: 200 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v1",
        versions: ["v1", "v2"],
      },
      codeEditor: {
        activeFile: "DashboardContent.v1.tsx",
        files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx"],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45],
        visible: false,
      },
    },
  },
  { type: "wait", duration: 500 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Edit it - Brief editor cut, one obvious layout change, save
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Edit it" },
  { type: "hideText" },
  { type: "showText", text: "Edit it" },
  { type: "showEditor" },
  { type: "wait", duration: 300 },
  { type: "moveTo", target: '[data-file="DashboardContent.v2.tsx"]', duration: 800 },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      codeEditor: {
        activeFile: "DashboardContent.v2.tsx",
        files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx"],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45],
        visible: true,
      },
    },
  },
  { type: "wait", duration: 300 },
  { type: "moveTo", target: "[data-editor-content]", duration: 600 },
  { type: "wait", duration: 200 },
  {
    type: "setState",
    changes: {
      codeEditor: {
        activeFile: "DashboardContent.v2.tsx",
        files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx"],
        isEditing: true,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45],
        visible: true,
      },
    },
  },
  { type: "wait", duration: 300 },
  // One obvious layout change
  { type: "deleteRows", count: 2 },
  { type: "wait", duration: 400 },
  { type: "addRows", count: 3 },
  { type: "wait", duration: 400 },
  // Save
  {
    type: "setState",
    changes: {
      codeEditor: {
        activeFile: "DashboardContent.v2.tsx",
        files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx"],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45, 55, 50],
        visible: true,
      },
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v2",
        versions: ["v1", "v2"],
      },
    },
  },
  { type: "wait", duration: 300 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Fork it again - Click fork, v3 appears, hard cut to updated layout
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Fork it again" },
  { type: "hideText" },
  { type: "showText", text: "Fork it again" },
  { type: "hideEditor" },
  { type: "wait", duration: 200 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v2",
        versions: ["v1", "v2"],
      },
    },
  },
  { type: "wait", duration: 300 },
  { type: "moveTo", target: '[data-version="v2"]', duration: 500 },
  { type: "hover", version: "v2" },
  { type: "wait", duration: 200 },
  { type: "moveTo", target: '[data-fork-button="v2"]', duration: 400 },
  { type: "wait", duration: 200 },
  { type: "click" },
  { type: "wait", duration: 200 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v3",
        versions: ["v1", "v2", "v3"],
      },
      codeEditor: {
        activeFile: "DashboardContent.v2.tsx",
        files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx", "DashboardContent.v3.tsx"],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45, 55, 50],
        visible: false,
      },
    },
  },
  { type: "wait", duration: 200 },
  // Move directly to fork v3 without hovering
  { type: "moveTo", target: '[data-version="v3"]', duration: 400 },
  { type: "hover", version: "v3" },
  { type: "wait", duration: 150 },
  { type: "moveTo", target: '[data-fork-button="v3"]', duration: 300 },
  { type: "wait", duration: 150 },
  { type: "click" },
  { type: "wait", duration: 150 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v4",
        versions: ["v1", "v2", "v3", "v4"],
      },
      codeEditor: {
        activeFile: "DashboardContent.v3.tsx",
        files: [
          "DashboardContent.v1.tsx",
          "DashboardContent.v2.tsx",
          "DashboardContent.v3.tsx",
          "DashboardContent.v4.tsx",
        ],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45, 55, 50],
        visible: false,
      },
    },
  },
  { type: "wait", duration: 200 },
  // Fork v4 to v5 - quick succession
  { type: "moveTo", target: '[data-version="v4"]', duration: 300 },
  { type: "hover", version: "v4" },
  { type: "wait", duration: 100 },
  { type: "moveTo", target: '[data-fork-button="v4"]', duration: 250 },
  { type: "wait", duration: 100 },
  { type: "click" },
  { type: "wait", duration: 100 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v5",
        versions: ["v1", "v2", "v3", "v4", "v5"],
      },
      codeEditor: {
        activeFile: "DashboardContent.v4.tsx",
        files: [
          "DashboardContent.v1.tsx",
          "DashboardContent.v2.tsx",
          "DashboardContent.v3.tsx",
          "DashboardContent.v4.tsx",
          "DashboardContent.v5.tsx",
        ],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45, 55, 50],
        visible: false,
      },
    },
  },
  { type: "wait", duration: 150 },
  // Fork v5 to v6 - quick succession
  { type: "moveTo", target: '[data-version="v5"]', duration: 300 },
  { type: "hover", version: "v5" },
  { type: "wait", duration: 100 },
  { type: "moveTo", target: '[data-fork-button="v5"]', duration: 250 },
  { type: "wait", duration: 100 },
  { type: "click" },
  { type: "wait", duration: 100 },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v6",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
      codeEditor: {
        activeFile: "DashboardContent.v5.tsx",
        files: [
          "DashboardContent.v1.tsx",
          "DashboardContent.v2.tsx",
          "DashboardContent.v3.tsx",
          "DashboardContent.v4.tsx",
          "DashboardContent.v5.tsx",
          "DashboardContent.v6.tsx",
        ],
        isEditing: false,
        editorRows: [60, 45, 50, 55, 40, 65, 50, 45, 70, 55, 60, 50, 45, 55, 50],
        visible: false,
      },
    },
  },
  { type: "wait", duration: 400 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Toggle between versions - Quickly toggle in order v1 → v2 → v3 → v4 → v5 → v6
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Toggle between versions" },
  { type: "hideText" },
  { type: "showText", text: "Toggle between versions" },

  // v1
  { type: "moveTo", target: '[data-version="v1"]', duration: 250 },
  { type: "hover", version: "v1" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v1",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  // v2
  { type: "moveTo", target: '[data-version="v2"]', duration: 200 },
  { type: "hover", version: "v2" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v2",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  // v3
  { type: "moveTo", target: '[data-version="v3"]', duration: 200 },
  { type: "hover", version: "v3" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v3",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  // v4
  { type: "moveTo", target: '[data-version="v4"]', duration: 200 },
  { type: "hover", version: "v4" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v4",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  // v5
  { type: "moveTo", target: '[data-version="v5"]', duration: 200 },
  { type: "hover", version: "v5" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v5",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  // v6
  { type: "moveTo", target: '[data-version="v6"]', duration: 200 },
  { type: "hover", version: "v6" },
  { type: "wait", duration: 100 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      uifork: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v6",
        versions: ["v1", "v2", "v3", "v4", "v5", "v6"],
      },
    },
  },
  { type: "wait", duration: 250 },

  { type: "log", message: "Animation complete" },
  { type: "hideText" },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ExplainerAnimation() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<AnimationState>(INITIAL_STATE);

  const cursor = useCursor(containerRef);
  const timeline = useTimeline(ANIMATION_TIMELINE, cursor, setState);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      timeline.run();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleReplay = React.useCallback(() => {
    setState(INITIAL_STATE);
    cursor.reset(50, 50);
    setTimeout(() => {
      timeline.run();
    }, 100);
  }, [cursor, timeline]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[456px] bg-muted rounded-lg border border-border p-4 overflow-hidden relative"
    >
      <ReplayButton onClick={handleReplay} />

      <OnScreenText text={state.onScreenText.text} visible={state.onScreenText.visible} />

      <div className="w-full h-full grid grid-cols-2 gap-4 pt-12 pb-4">
        {/* Left: Code Editor */}
        <div className="h-full">
          <CodeEditor state={state.codeEditor} />
        </div>

        {/* Right: Browser Frame with Dashboard */}
        <div className="h-full relative flex items-start">
          <BrowserFrame
            uifork={
              <div
                className="absolute bottom-4 right-4 z-10"
                style={{ maxWidth: "calc(100% - 2rem)" }}
              >
                <MiniUIFork state={state.uifork} />
              </div>
            }
          >
            <div className="bg-stone-50 dark:bg-stone-950 h-full overflow-hidden relative">
              <div className="scale-75 origin-top-left w-[133.33%] h-[133.33%] overflow-hidden">
                <DashboardContent version={state.uifork.activeVersion} />
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>

      <div className="absolute inset-0 z-40 pointer-events-auto" />

      <FakeCursorElement position={cursor.position} visible={cursor.visible} />
    </div>
  );
}
