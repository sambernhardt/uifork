interface PromptIconProps {
  className?: string;
}

export function PromptIcon({ className }: PromptIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a6 6 0 0 0-6 6c0 2.2 1.2 4.2 3 5.2V15a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.8c1.8-1 3-3 3-5.2a6 6 0 0 0-6-6z" />
      <path d="M9 18h6" />
      <path d="M10 21h4" />
    </svg>
  );
}
