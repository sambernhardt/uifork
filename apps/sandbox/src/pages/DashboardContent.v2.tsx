import { makeAnimationDelay } from "../lib/utils";

const TOTAL_ANIMATION_DURATION = 1.0; // Total duration in seconds

export default function DashboardContent() {
  return (
    <div className="">
      {/* Heading */}
      <div
        className="mb-8 optional-fade-in"
        style={{ animationDelay: makeAnimationDelay(0.35, TOTAL_ANIMATION_DURATION) }}
      >
        <h1 className="text-left font-semibold tracking-tight text-4xl text-muted-foreground opacity-30">
          Welcome back, Sam
        </h1>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-8 space-y-6">
          {/* Top card */}
          <div
            className="h-96 rounded-lg bg-muted optional-fade-in"
            style={{ animationDelay: makeAnimationDelay(0.4, TOTAL_ANIMATION_DURATION) }}
          ></div>

          {/* Three cards below */}
          <div className="grid grid-cols-3 gap-6">
            <div
              className="h-48 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.5, TOTAL_ANIMATION_DURATION) }}
            ></div>
            <div
              className="h-48 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.55, TOTAL_ANIMATION_DURATION) }}
            ></div>
            <div
              className="h-48 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.6, TOTAL_ANIMATION_DURATION) }}
            ></div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-4 space-y-6">
          {/* Top card */}
          <div
            className="h-96 rounded-lg bg-muted optional-fade-in"
            style={{ animationDelay: makeAnimationDelay(0.65, TOTAL_ANIMATION_DURATION) }}
          ></div>

          {/* Three list items below */}
          <div className="space-y-3">
            <div
              className="h-8 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.7, TOTAL_ANIMATION_DURATION) }}
            ></div>
            <div
              className="h-8 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.75, TOTAL_ANIMATION_DURATION) }}
            ></div>
            <div
              className="h-8 rounded-lg bg-muted optional-fade-in"
              style={{ animationDelay: makeAnimationDelay(0.8, TOTAL_ANIMATION_DURATION) }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
