import { ReactNode } from "react";

interface ExampleContainerProps {
  children: ReactNode;
  className?: string;
}

export function ExampleContainer({
  children,
  className = "",
}: ExampleContainerProps) {
  return (
    <div
      className={`bg-stone-200 dark:bg-stone-800 rounded-xl border border-border p-6 min-h-[300px] h-[400px] flex justify-center items-center shadow-inner ${className}`}
    >
      {children}
    </div>
  );
}
