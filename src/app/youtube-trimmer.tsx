"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { YouTubeProps } from "react-youtube";

import { fromHMS, toHMS } from "@/lib/time";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ReactSlider from "react-slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trimVideoWithFFmpeg } from "@/lib/ffmpeg-trim";
import VideoTrimmer from "./video-trimmer";

// Dynamically import the YouTube component with SSR disabled
const YouTube = dynamic(
  () => import("react-youtube").then((mod) => mod.default),
  { ssr: false }
);

// Define types for YouTube player
interface YouTubePlayer {
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

export default function YoutubeTrimmer() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<
    "preparing" | "processing" | null
  >(null);

  const [rawStart, setRawStart] = useState("00:00:00");
  const [rawEnd, setRawEnd] = useState("00:00:00");
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  const [availableFormat, setAvailableFormat] = useState<{
    formats: Array<{
      ext: string;
      container: string;
      resolution: string;
      note: string;
      url: string;
    }>;
  } | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>("");

  // 1) Extract video ID from URL
  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setUrl(v);
    const m = v.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    setVideoId(m ? m[1] : null);
    if (m) {
      try {
        const res = await fetch("/api/trim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: v,
          }),
        });
        if (!res.ok) throw new Error("Failed to create clip");
        const data = await res.json();
        setAvailableFormat(data);
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  // 2) onReady: grab duration + initialize slider + inputs
  const onPlayerReady: YouTubeProps["onReady"] = (e) => {
    const ply = e.target;
    playerRef.current = ply;
    const d = ply.getDuration();
    setDuration(d);
    setRange([0, d]);
    setRawStart(toHMS(0));
    setRawEnd(toHMS(d));
  };

  // Helper to access player
  const ply = () => playerRef.current;

  // 3) Slider → live update
  const onRangeChange = useCallback((vals: [number, number]) => {
    setRange(vals);
    setRawStart(toHMS(vals[0]));
    setRawEnd(toHMS(vals[1]));
    ply()?.seekTo(vals[0], true);
  }, []);

  // 4) Commit inputs → slider
  const commitStart = () => {
    const secs = fromHMS(rawStart);
    if (isNaN(secs)) {
      setRawStart(toHMS(range[0]));
    } else {
      const clamped = Math.min(Math.max(secs, 0), range[1] - 1);
      setRange(([, end]) => [clamped, end]);
      setRawStart(toHMS(clamped));
      ply()?.seekTo(clamped, true);
    }
  };
  const commitEnd = () => {
    const secs = fromHMS(rawEnd);
    if (isNaN(secs)) {
      setRawEnd(toHMS(range[1]));
    } else {
      const clamped = Math.max(Math.min(secs, duration), range[0] + 1);
      setRange(([start]) => [start, clamped]);
      setRawEnd(toHMS(clamped));
      ply()?.seekTo(range[0], true);
    }
  };

  const selectedDuration = range[1] - range[0];
  const formattedDuration = toHMS(selectedDuration);

  const handleCreate = async () => {
    if (!availableFormat || !availableFormat.formats || !selectedResolution) {
      alert("Please select a video quality.");
      return;
    }

    // Find the selected format object
    const audioFormat = availableFormat.formats.find(
      (f) => f.resolution === "audio only"
    );

    const selectedFormat = availableFormat.formats.find(
      (f) => f.note === selectedResolution
    );

    console.log(selectedFormat, audioFormat, "checkSelectedFormat");

    const payload = {
      url: url, // video URL
      audio_format_id: audioFormat?.format_id, // audio format id
      end_time: range[1], // end time
      format_id: selectedFormat?.format_id, // format id
      start_time: range[0], // start time
      is_trim: true, // or false, as needed
    };

    try {
      setIsLoading(true);
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      setDownloadLink(data?.data?.downloadable_url);
      console.log("Download API response:", data);
      // TODO: handle the response (e.g., show download link, error, etc.)
    } catch (err) {
      alert("Failed to call download API: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br w-full from-gray-950 to-black text-white flex items-start justify-start p-0 md:p-4 relative overflow-x-hidden mt-8 overflow-y-auto">
      {/* Modern subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(78,13,170,0.15),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(13,148,170,0.12),transparent_70%)]"></div>
        <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-purple-900/10 to-transparent opacity-30"></div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiM2ODY4Njg0MCIgc3Ryb2tlLXdpZHRoPSIwLjUiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')] opacity-10"></div>

        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/5 rounded-full filter blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full filter blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <Card className="w-full h-full max-w-4xl mx-auto bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <CardContent className="p-4 md:p-6 lg:p-8">
          <div className="relative mb-6 md:mb-8">
            <div className="absolute -top-6 -left-6 -right-6 h-24 bg-gradient-to-r from-violet-600/20 via-blue-600/20 to-cyan-600/20 blur-xl"></div>
            <h1 className="relative text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 text-center tracking-tight">
              YouTube Clip Creator
            </h1>
            <div className="mt-2 w-20 md:w-24 h-1 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full mx-auto"></div>
            <p className="text-center text-gray-400 text-xs md:text-sm mt-2 max-w-md mx-auto">
              Easily create and download clips from your favorite YouTube videos
            </p>
          </div>

          {/* URL Input with modern search bar design */}
          <div className="mb-6 md:mb-8 relative group transition-all duration-300">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 md:pl-4 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <Input
              type="url"
              placeholder="Paste YouTube URL here..."
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-800/70 text-white border border-gray-700/50 focus:border-blue-500/50 rounded-xl shadow-inner shadow-black/20 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 group-hover:border-gray-600/70 text-sm md:text-base"
              value={url}
              onChange={handleUrlChange}
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 group-hover:ring-white/20 group-focus-within:ring-blue-500/30 transition-all duration-200 pointer-events-none"></div>

            {/* Subtle hint text */}
            {!videoId && url && (
              <div className="absolute -bottom-5 left-0 text-2xs md:text-xs text-amber-400 animate-fade-in">
                Not a valid YouTube URL. Try a link like:
                https://youtube.com/watch?v=...
              </div>
            )}
          </div>

          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-4">
            Debug: {availableFormat?.formats?.length || 0} formats available
          </div>

          {videoId && (
            <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out_forwards]">
              {/* Video Player with modern frame */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.56)] group">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-3 h-3 md:w-4 md:h-4 border-t border-l border-blue-500/40 z-10"></div>
                <div className="absolute top-0 right-0 w-3 h-3 md:w-4 md:h-4 border-t border-r border-blue-500/40 z-10"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 md:w-4 md:h-4 border-b border-l border-blue-500/40 z-10"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 border-b border-r border-blue-500/40 z-10"></div>

                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-500/10 to-purple-500/10 transition-opacity duration-300"></div>

                <YouTube
                  videoId={videoId}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: {
                      controls: 1,
                      modestbranding: 1,
                      rel: 0,
                    },
                  }}
                  onReady={onPlayerReady}
                  className="w-full h-full relative z-0"
                  iframeClassName="w-full h-full aspect-video"
                />
                <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/30 backdrop-blur-md text-2xs md:text-xs text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full border border-white/10 z-20 font-medium">
                  YouTube
                </div>
              </div>

              {/* Resolution Selector */}
              {availableFormat &&
                availableFormat?.formats &&
                availableFormat?.formats.length > 0 && (
                  <div className="mb-6 md:mb-8">
                    <Label className="text-gray-400 text-xs md:text-sm mb-1.5 block flex items-center">
                      <span className="h-1.5 w-1.5 md:h-2 md:w-2 bg-blue-500 rounded-full mr-1.5"></span>
                      Select Video Quality
                    </Label>
                    <Select
                      value={selectedResolution}
                      onValueChange={setSelectedResolution}
                    >
                      <SelectTrigger className="w-full bg-gray-800/70 text-white border border-gray-700/50 focus:border-blue-500/50 rounded-xl shadow-inner shadow-black/20 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200">
                        <SelectValue placeholder="Select video quality" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border border-gray-700/50">
                        {Array.from(
                          new Set(
                            availableFormat.formats
                              .filter((f) => f.ext == "mp4")
                              .map((format) => format.note)
                          )
                        ).map((resolution) => (
                          <SelectItem
                            key={resolution}
                            value={resolution}
                            className="text-white hover:bg-gray-700 focus:bg-gray-700"
                          >
                            {resolution}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Trimmer Controls */}
              <div className="bg-gray-800/60 p-4 md:p-6 rounded-xl border border-white/10 relative backdrop-blur-sm">
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-xl pointer-events-none"></div>

                {/* Modern slider with thinner track */}
                <div className="mb-5 md:mb-6 w-full px-1">
                  <ReactSlider
                    className="h-1 bg-gray-700 rounded-full my-6 md:my-8 w-full mx-auto"
                    thumbClassName="w-5 h-5 -mt-2 bg-white shadow-[0_0_10px_rgba(147,51,234,0.5)] rounded-full cursor-grab hover:scale-110 active:scale-110 transition duration-200 flex items-center justify-center after:content-[''] after:absolute after:w-2 after:h-2 after:bg-violet-500 after:rounded-full"
                    trackClassName="bg-gradient-to-r from-blue-500 to-violet-500 rounded-full h-1"
                    min={0}
                    max={duration}
                    value={range}
                    onChange={onRangeChange}
                    pearling
                    minDistance={1}
                  />
                </div>

                {/* Time inputs with modern design - Touch-optimized for mobile */}
                <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:gap-6 w-full">
                  <div className="flex-1 min-w-0">
                    <Label className="text-gray-400 text-xs md:text-sm mb-1.5 block flex items-center">
                      <span className="h-1.5 w-1.5 md:h-2 md:w-2 bg-blue-500 rounded-full mr-1.5"></span>
                      Start Time
                      <div className="ml-auto flex space-x-1">
                        <button
                          onClick={() => {
                            const newStart = Math.max(0, range[0] - 1);
                            setRange([newStart, range[1]]);
                            setRawStart(toHMS(newStart));
                            ply()?.seekTo(newStart, true);
                          }}
                          className="w-7 h-7 md:w-6 md:h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 touch-manipulation"
                          title="Decrease by 1 second"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const newStart = Math.min(
                              range[1] - 1,
                              range[0] + 1
                            );
                            setRange([newStart, range[1]]);
                            setRawStart(toHMS(newStart));
                            ply()?.seekTo(newStart, true);
                          }}
                          className="w-7 h-7 md:w-6 md:h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 touch-manipulation"
                          title="Increase by 1 second"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    </Label>
                    <div className="relative group">
                      <Input
                        className="w-full p-2 md:p-3 bg-gray-800/70 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-white pr-10 text-sm md:text-base"
                        value={rawStart}
                        onChange={(e) => setRawStart(e.target.value)}
                        onBlur={commitStart}
                      />
                      <div className="absolute inset-0 rounded-lg ring-1 ring-white/5 group-hover:ring-white/10 pointer-events-none"></div>
                      <button
                        onClick={() => ply()?.seekTo(range[0], true)}
                        className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-7 h-7 md:w-6 md:h-6 rounded bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors touch-manipulation"
                        title="Jump to start position"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-gray-400 text-xs md:text-sm mb-1.5 block flex items-center">
                      <span className="h-1.5 w-1.5 md:h-2 md:w-2 bg-violet-500 rounded-full mr-1.5"></span>
                      End Time
                      <div className="ml-auto flex space-x-1">
                        <button
                          onClick={() => {
                            const newEnd = Math.max(range[0] + 1, range[1] - 1);
                            setRange([range[0], newEnd]);
                            setRawEnd(toHMS(newEnd));
                            ply()?.seekTo(newEnd, true);
                          }}
                          className="w-7 h-7 md:w-6 md:h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500 touch-manipulation"
                          title="Decrease by 1 second"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const newEnd = Math.min(duration, range[1] + 1);
                            setRange([range[0], newEnd]);
                            setRawEnd(toHMS(newEnd));
                            ply()?.seekTo(newEnd, true);
                          }}
                          className="w-7 h-7 md:w-6 md:h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500 touch-manipulation"
                          title="Increase by 1 second"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    </Label>
                    <div className="relative group">
                      <Input
                        className="w-full p-2 md:p-3 bg-gray-800/70 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all text-white pr-10 text-sm md:text-base"
                        value={rawEnd}
                        onChange={(e) => setRawEnd(e.target.value)}
                        onBlur={commitEnd}
                      />
                      <div className="absolute inset-0 rounded-lg ring-1 ring-white/5 group-hover:ring-white/10 pointer-events-none"></div>
                      <button
                        onClick={() => ply()?.seekTo(range[1], true)}
                        className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-7 h-7 md:w-6 md:h-6 rounded bg-violet-500/20 hover:bg-violet-500/30 flex items-center justify-center text-violet-400 transition-colors touch-manipulation"
                        title="Jump to end position"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Keyboard shortcuts hint - hidden on mobile */}
                <div className="hidden md:block mt-2 text-xs text-center text-gray-500">
                  <span className="inline-block px-2 py-1 rounded bg-gray-800/70 text-gray-400 border border-gray-700/30">
                    Tip: Use the increment/decrement buttons for fine-tuning
                    your clip
                  </span>
                </div>

                {/* Duration Badge */}
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium bg-violet-900/30 text-violet-200 backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-1.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Selected Duration: {formattedDuration}
                  </span>
                </div>
              </div>

              {/* Mobile-optimized Create Button */}
              <div className="relative w-full overflow-hidden group">
                <Button
                  onClick={handleCreate}
                  className="w-full py-3 md:py-4 rounded-xl font-medium text-white transition-all duration-300 bg-transparent disabled:opacity-70 relative z-10 text-sm md:text-base touch-manipulation"
                  disabled={isLoading}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {processingStatus === "preparing"
                          ? "Preparing..."
                          : "Processing..."}
                      </>
                    ) : (
                      <>
                        <span className="text-lg mr-2">✂️</span> Create Clip
                      </>
                    )}
                  </span>
                </Button>

                {/* Gradient background with animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 group-hover:from-blue-500 group-hover:to-violet-500 transition-colors duration-300"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_107%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.05)_15%,rgba(0,0,0,0)_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/20 pointer-events-none"></div>
              </div>
            </div>
          )}

          {downloadLink && (
            <div className="mt-8 flex flex-col items-center space-y-4 bg-gray-900/70 border border-blue-500/20 rounded-xl p-6 shadow-lg animate-fade-in">
              <video
                src={downloadLink}
                controls
                className="w-full max-w-lg rounded-lg shadow-md border border-gray-700"
                style={{ background: "#18181b" }}
              />
              <a
                href={downloadLink}
                download
                className="inline-block mt-2 px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow hover:from-blue-500 hover:to-violet-500 transition-all duration-200"
              >
                ⬇️ Download Clip
              </a>
            </div>
          )}

          {/* Modern footer */}
          <div className="mt-6 md:mt-8 flex justify-center">
            <div className="text-2xs md:text-xs font-mono flex items-center space-x-1.5 bg-gray-800/40 backdrop-blur-sm border border-white/5 px-2 py-1 md:px-3 md:py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-gray-400 tracking-wide">
                YTCLIPPER V1.0
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
