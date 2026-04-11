import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={cn("bg-card text-card-foreground rounded-lg border border-border p-6", className)}
    >
      {children}
    </div>
  );
}
