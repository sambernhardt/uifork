// Global tooltip manager to coordinate tooltip delays
// If a tooltip is already visible and another is requested within X time,
// skip the delay for the second tooltip

let isTooltipVisible = false;
let lastTooltipShownAt = 0;
const COOLDOWN_TIME = 1000; // 1 second

export function registerTooltipShow() {
  isTooltipVisible = true;
  lastTooltipShownAt = Date.now();
}

export function registerTooltipHide() {
  isTooltipVisible = false;
}

export function shouldSkipDelay(): boolean {
  // Skip delay if a tooltip is currently visible
  // or if one was shown recently (within cooldown time)
  const timeSinceLastTooltip = Date.now() - lastTooltipShownAt;
  return isTooltipVisible || timeSinceLastTooltip < COOLDOWN_TIME;
}
