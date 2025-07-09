import React from "react";
import { cn } from "../../lib/utils";

export default function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
  ...props
}) {
  const calculatedDuration = duration / speed;

  return (
    <>
      {/* Injecting custom keyframes & animation as a style tag */}
      <style>{`
        @keyframes orbit {
          0% {
            transform: rotate(calc(var(--angle) * 1deg))
              translateY(calc(var(--radius) * 1px))
              rotate(calc(var(--angle) * -1deg));
          }
          100% {
            transform: rotate(calc(var(--angle) * 1deg + 360deg))
              translateY(calc(var(--radius) * 1px))
              rotate(calc((var(--angle) * -1deg) - 360deg));
          }
        }

        .animate-orbit {
          animation: orbit calc(var(--duration) * 1s) linear infinite;
        }
      `}</style>

      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-black/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}

      {React.Children.map(children, (child, index) => {
        const angle = (360 / React.Children.count(children)) * index;

        return (
          <div
            style={{
              "--duration": calculatedDuration,
              "--radius": radius,
              "--angle": angle,
              "--icon-size": `${iconSize}px`,
            }}
            className={cn(
              "absolute flex size-[var(--icon-size)] transform-gpu animate-orbit items-center justify-center rounded-full",
              { "[animation-direction:reverse]": reverse },
              className
            )}
            {...props}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}
