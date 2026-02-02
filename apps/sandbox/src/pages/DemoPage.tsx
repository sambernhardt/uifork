import { useEffect } from "react";
import DashboardContent from "./DashboardContent";
import { makeAnimationDelay } from "../lib/utils";

const TOTAL_ANIMATION_DURATION = 1.0; // Total duration in seconds

export function DemoPage() {
  useEffect(() => {
    // Add demo-animate class to enable animations
    document.body.classList.add("demo-animate");

    const timeout = setTimeout(() => {
      // Remove demo-animate class to disable animations after timeout
      document.body.classList.remove("demo-animate");
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/30 bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side: Logo and links */}
            <div className="flex items-center gap-8">
              <div
                className="w-24 h-6 bg-muted rounded optional-fade-in"
                style={{ animationDelay: makeAnimationDelay(0, TOTAL_ANIMATION_DURATION) }}
              ></div>
              <div className="flex items-center gap-6">
                <div
                  className="w-12 h-4 bg-muted rounded optional-fade-in"
                  style={{ animationDelay: makeAnimationDelay(0.1, TOTAL_ANIMATION_DURATION) }}
                ></div>
                <div
                  className="w-16 h-4 bg-muted rounded optional-fade-in"
                  style={{ animationDelay: makeAnimationDelay(0.15, TOTAL_ANIMATION_DURATION) }}
                ></div>
                <div
                  className="w-16 h-4 bg-muted rounded optional-fade-in"
                  style={{ animationDelay: makeAnimationDelay(0.2, TOTAL_ANIMATION_DURATION) }}
                ></div>
                <div
                  className="w-14 h-4 bg-muted rounded optional-fade-in"
                  style={{ animationDelay: makeAnimationDelay(0.25, TOTAL_ANIMATION_DURATION) }}
                ></div>
              </div>
            </div>
            {/* Right side: Avatar */}
            <div>
              <div
                className="w-8 h-8 bg-muted rounded-full optional-fade-in"
                style={{ animationDelay: makeAnimationDelay(0.3, TOTAL_ANIMATION_DURATION) }}
              ></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <DashboardContent />
      </div>
    </div>
  );
}
