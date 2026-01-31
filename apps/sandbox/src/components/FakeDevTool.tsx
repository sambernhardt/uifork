import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FakeDevTool() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="fixed bottom-6 left-6 w-8 h-8 rounded-full bg-black border-none cursor-pointer shadow-lg z-[9999] transition-transform hover:scale-110 hover:shadow-xl flex items-center justify-center"
          aria-label="Fake dev tool"
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
      </TooltipTrigger>
      <TooltipContent>
        <p>Fake dev tool</p>
      </TooltipContent>
    </Tooltip>
  );
}
