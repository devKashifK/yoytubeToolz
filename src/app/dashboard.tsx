"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import YoutubeTrimmer from "./youtube-trimmer";
import MultipleTrimmer from "./multiple-trimmer";

export default function Dashboard() {
  const [mode, setMode] = useState<"single" | "multiple">("single");

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-center">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "single" | "multiple")}
          className="bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg"
        >
          <TabsList className="bg-transparent p-1">
            <TabsTrigger
              value="single"
              className={`rounded-md px-4 py-2 ${
                mode === "single"
                  ? "bg-purple-600 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  : "text-white hover:bg-gray-800/70 data-[state=active]:bg-transparent"
              }`}
            >
              Single Video
            </TabsTrigger>
            {/* <TabsTrigger
              value="multiple"
              className={`rounded-md px-4 py-2 ${
                mode === "multiple"
                  ? "bg-purple-600 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  : "text-white hover:bg-gray-800/70 data-[state=active]:bg-transparent"
              }`}
            >
              Multiple Videos
            </TabsTrigger> */}
          </TabsList>
        </Tabs>
      </div>

      {mode === "single" ? <YoutubeTrimmer /> : <MultipleTrimmer />}
    </div>
  );
}
