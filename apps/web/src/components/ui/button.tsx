"use client";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variant === "default" && "bg-black text-white hover:bg-black/80",
        variant === "ghost" && "text-black hover:bg-black/5",
        variant === "outline" && "border border-black/20 text-black hover:bg-black/5",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
        size === "sm" && "text-xs px-3 py-1.5",
        size === "md" && "text-sm px-4 py-2",
        size === "lg" && "text-base px-6 py-3",
        className
      )}
      {...props}
    />
  );
}
