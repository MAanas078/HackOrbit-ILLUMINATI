import React from "react";
import { motion } from "framer-motion"; // Correct import
import PinContainer from "../../components/ui/card";

// Assuming BackgroundGradientAnimation is imported correctly
import { BackgroundGradientAnimation } from "../../components/ui/gradient";

export default function BackgroundGradientAnimationDemo() {
  return (
    <BackgroundGradientAnimation>
      <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4">
        <div className="h-[40rem] w-full flex items-center justify-center flex-wrap gap-12">

          {/* Second PinCard - Ideate from Scratch */}
          <PinContainer
            title="/ideate/ai"
            href="/ideate/ai"
          >
            <div className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 sm:basis-1/2 w-[20rem] h-[20rem]">
              <h3 className="max-w-xs !pb-2 !m-0 font-bold text-base text-slate-100">
                Ideate from Scratch
              </h3>
              <div className="text-base !m-0 !p-0 font-normal">
                <span className="text-slate-500">
                  Start with a blank canvas and build your ideas from the ground up.
                </span>
              </div>
              <div className="flex flex-1 w-full rounded-lg mt-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500" />
            </div>
          </PinContainer>

          {/* Third PinCard - Analyze and Ideate the CodeBase */}
          <PinContainer
            title="/analyze.codebase"
            href="/analyze/ai"
          >
            <div className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 sm:basis-1/2 w-[20rem] h-[20rem]">
              <h3 className="max-w-xs !pb-2 !m-0 font-bold text-base text-slate-100">
                Analyze and Ideate the CodeBase
              </h3>
              <div className="text-base !m-0 !p-0 font-normal">
                <span className="text-slate-500">
                  Explore existing code structures and enhance them with creative solutions.
                </span>
              </div>
              <div className="flex flex-1 w-full rounded-lg mt-4 bg-gradient-to-br from-purple-500 via-indigo-500 to-red-500" />
            </div>
          </PinContainer>

          <PinContainer
            title="/analyze.repo"
            href="/terminalai"
          >
            <div className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 sm:basis-1/2 w-[20rem] h-[20rem]">
              <h3 className="max-w-xs !pb-2 !m-0 font-bold text-base text-slate-100">
                Talk to Code
              </h3>
              <div className="text-base !m-0 !p-0 font-normal">
                <span className="text-slate-500">
                  Explore existing code structures and enhance them with creative solutions.
                </span>
              </div>
              <div className="flex flex-1 w-full rounded-lg mt-4 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500" />
            </div>
          </PinContainer>
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}