"use client";
import { useState, useCallback, useEffect } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import ReactSlider from "react-slider";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fromHMS, toHMS } from "@/lib/time";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@radix-ui/react-collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Define types for YouTube player
interface YouTubePlayer {
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

// VideoItem interface
interface VideoItem {
  id: string;
  url: string;
  videoId: string | null;
  duration: number;
  range: [number, number];
  rawStart: string;
  rawEnd: string;
  player: YouTubePlayer | null;
  clipUrl: string | null;
  isProcessing: boolean;
}

// SortableVideoCard component
function SortableVideoCard(props: {
  id: string;
  index: number;
  videoItem: VideoItem;
  onDelete: () => void;
  onUpdate: (updatedItem: Partial<VideoItem>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });
  const { videoItem, onUpdate, onDelete, index } = props;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const onRangeChange = useCallback(
    (vals: [number, number]) => {
      onUpdate({
        range: vals,
        rawStart: toHMS(vals[0]),
        rawEnd: toHMS(vals[1]),
      });
      videoItem.player?.seekTo(vals[0], true);
    },
    [onUpdate, videoItem.player]
  );

  const onPlayerReady: YouTubeProps["onReady"] = (e) => {
    const player = e.target;
    const duration = player.getDuration();

    onUpdate({
      player,
      duration,
      range: [0, duration],
      rawStart: toHMS(0),
      rawEnd: toHMS(duration),
    });
  };

  const commitStart = () => {
    const secs = fromHMS(videoItem.rawStart);
    if (isNaN(secs)) {
      onUpdate({ rawStart: toHMS(videoItem.range[0]) });
    } else {
      const clamped = Math.min(Math.max(secs, 0), videoItem.range[1] - 1);
      onUpdate({
        range: [clamped, videoItem.range[1]],
        rawStart: toHMS(clamped),
      });
      videoItem.player?.seekTo(clamped, true);
    }
  };

  const commitEnd = () => {
    const secs = fromHMS(videoItem.rawEnd);
    if (isNaN(secs)) {
      onUpdate({ rawEnd: toHMS(videoItem.range[1]) });
    } else {
      const clamped = Math.max(
        Math.min(secs, videoItem.duration),
        videoItem.range[0] + 1
      );
      onUpdate({
        range: [videoItem.range[0], clamped],
        rawEnd: toHMS(clamped),
      });
      videoItem.player?.seekTo(videoItem.range[0], true);
    }
  };

  // Calculate selected duration in seconds and formatted time
  const selectedDuration = videoItem.range[1] - videoItem.range[0];
  const formattedDuration = toHMS(selectedDuration);

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Collapsible className="w-full bg-gray-800/80 rounded-lg border border-gray-700/80 overflow-hidden shadow-lg">
        <CollapsibleTrigger className="flex justify-between items-center w-full px-4 py-3 hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center" {...attributes} {...listeners}>
            <div className="flex items-center justify-center w-6 h-6 bg-purple-600 rounded-full mr-3 text-xs font-semibold">
              {index + 1}
            </div>
            <span className="font-medium truncate text-white">
              {videoItem.videoId
                ? `Video ${index + 1}: ${videoItem.videoId}`
                : "Empty Video Slot"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {videoItem.videoId && (
              <span className="text-xs px-2 py-1 bg-blue-900/40 text-blue-200 rounded-full">
                {formattedDuration}
              </span>
            )}
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-red-900/30 hover:bg-red-700/50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <Input
                type="url"
                placeholder="Paste YouTube URL here..."
                className="w-full pl-10 pr-4 py-3 text-white bg-gray-900/70 border border-gray-700/80 rounded-lg"
                value={videoItem.url}
                onChange={(e) => {
                  const url = e.target.value;
                  const match = url.match(
                    /(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
                  );
                  onUpdate({
                    url,
                    videoId: match ? match[1] : null,
                    clipUrl: null,
                  });
                }}
              />
            </div>

            {videoItem.videoId && (
              <>
                <div className="relative w-full aspect-video max-h-[200px] rounded-lg overflow-hidden border border-gray-700/80 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
                  <div className="absolute inset-0 pointer-events-none border border-gray-100/10 z-[1]"></div>
                  <YouTube
                    videoId={videoItem.videoId}
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
                  />
                  <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-md text-xs text-white px-2 py-1 rounded-full border border-white/10 z-20">
                    YouTube
                  </div>
                </div>

                <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700/80 shadow-md">
                  <div className="w-full px-1 mb-4">
                    <ReactSlider
                      className="h-2 bg-gray-700/70 rounded-full my-6 w-full mx-auto"
                      thumbClassName="w-6 h-6 bg-white rounded-full shadow-lg cursor-grab transform hover:scale-110 transition duration-200 flex items-center justify-center after:content-[''] after:absolute after:w-3 after:h-3 after:bg-purple-500 after:rounded-full"
                      trackClassName="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      min={0}
                      max={videoItem.duration}
                      value={videoItem.range}
                      onChange={onRangeChange}
                      pearling
                      minDistance={1}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                    <div className="flex-1 min-w-0">
                      <Label className="text-gray-400 text-sm mb-1 block flex items-center">
                        <span className="h-2 w-2 bg-blue-500 rounded-full mr-1.5"></span>
                        Start Time
                      </Label>
                      <Input
                        className="w-full p-2 bg-gray-800/70 border text-white border-gray-700/80 rounded-lg"
                        value={videoItem.rawStart}
                        onChange={(e) => onUpdate({ rawStart: e.target.value })}
                        onBlur={commitStart}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-gray-400 text-sm mb-1 block flex items-center">
                        <span className="h-2 w-2 bg-purple-500 rounded-full mr-1.5"></span>
                        End Time
                      </Label>
                      <Input
                        className="w-full p-2 bg-gray-800/70 border border-gray-700/80 rounded-lg"
                        value={videoItem.rawEnd}
                        onChange={(e) => onUpdate({ rawEnd: e.target.value })}
                        onBlur={commitEnd}
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-900/40 text-purple-200 border border-purple-700/50 backdrop-blur-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
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
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function MultipleTrimmer() {
  const [videos, setVideos] = useState<VideoItem[]>([createEmptyVideo()]);
  const [mergeStatus, setMergeStatus] = useState<{
    isProcessing: boolean;
    progress: number;
    status: string;
    stage: string;
    url: string | null;
    error: string | null;
  }>({
    isProcessing: false,
    progress: 0,
    status: "",
    stage: "",
    url: null,
    error: null,
  });

  function createEmptyVideo(): VideoItem {
    return {
      id: generateUniqueId(),
      url: "",
      videoId: null,
      duration: 0,
      range: [0, 0],
      rawStart: "00:00:00",
      rawEnd: "00:00:00",
      player: null,
      clipUrl: null,
      isProcessing: false,
    };
  }

  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  const addNewVideo = () => {
    if (videos.length < 5) {
      setVideos([...videos, createEmptyVideo()]);
    }
  };

  const removeVideo = (index: number) => {
    const newVideos = [...videos];
    newVideos.splice(index, 1);
    // Always keep at least one video
    if (newVideos.length === 0) {
      newVideos.push(createEmptyVideo());
    }
    setVideos(newVideos);
  };

  const updateVideo = (index: number, updates: Partial<VideoItem>) => {
    const newVideos = [...videos];
    newVideos[index] = { ...newVideos[index], ...updates };
    setVideos(newVideos);
  };

  // DnD Kit setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over?.id);

      const newVideos = [...videos];
      const [movedItem] = newVideos.splice(oldIndex, 1);
      newVideos.splice(newIndex, 0, movedItem);

      setVideos(newVideos);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    // Check the status of the merge job if it's processing
    if (
      mergeStatus.isProcessing &&
      mergeStatus.status === "processing" &&
      mergeStatus.url
    ) {
      timer = setInterval(async () => {
        try {
          // Extract the ID from the URL by removing the leading slash and .mp4 extension
          const jobId = mergeStatus.url
            ?.replace(/^\//, "")
            .replace(/\.mp4$/, "");
          const response = await fetch(`/api/merge?id=${jobId}`);
          const data = await response.json();

          if (data.status === "completed") {
            // When complete, verify the file exists
            const fileToCheck = `${jobId}.mp4`;
            const fileCheckResponse = await fetch(
              `/api/file-check?file=${fileToCheck}`
            );
            const fileData = await fileCheckResponse.json();

            if (fileData.exists) {
              setMergeStatus((prev) => ({
                ...prev,
                isProcessing: false,
                progress: 100,
                status: "completed",
                stage: "finished",
                url: fileData.path, // Use the verified path from the API
              }));
            } else {
              // File doesn't exist or isn't accessible
              setMergeStatus((prev) => ({
                ...prev,
                isProcessing: false,
                status: "error",
                stage: "File processing error",
                error: "Unable to access the merged file. Please try again.",
              }));
            }

            if (timer) clearInterval(timer);
          } else if (data.status === "error") {
            setMergeStatus((prev) => ({
              ...prev,
              isProcessing: false,
              status: "error",
              stage: data.stage || "failed",
              error: data.error || "Unknown error occurred",
            }));
            if (timer) clearInterval(timer);
          } else {
            setMergeStatus((prev) => ({
              ...prev,
              progress: data.progress || prev.progress,
              stage: data.stage || prev.stage,
            }));
          }
        } catch (error) {
          console.error("Error checking merge status:", error);
        }
      }, 2000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mergeStatus.isProcessing, mergeStatus.status, mergeStatus.url]);

  const handleMergeClick = async () => {
    const videoOrder = videos
      .filter((v) => v.videoId) // Only include videos with valid videoId
      .map((v, idx) => ({
        position: idx + 1,
        videoId: v.videoId,
        startTime: v.rawStart,
        endTime: v.rawEnd,
      }));

    console.log("Merge button clicked with videos:", videoOrder);

    // Reset merge status
    setMergeStatus({
      isProcessing: true,
      progress: 0,
      status: "starting",
      stage: "Initializing...",
      url: null,
      error: null,
    });

    try {
      const response = await fetch("/api/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videos: videoOrder }),
      });

      const data = await response.json();

      if (response.ok) {
        setMergeStatus({
          isProcessing: true,
          progress: data.progress || 0,
          status: data.status || "processing",
          stage: data.stage || "Starting merge process...",
          url: data.url || null,
          error: null,
        });
      } else {
        setMergeStatus({
          isProcessing: false,
          progress: 0,
          status: "error",
          stage: "Request failed",
          url: null,
          error: data.error || "Failed to start merge process",
        });
      }
    } catch (error) {
      console.error("Error starting merge:", error);
      setMergeStatus({
        isProcessing: false,
        progress: 0,
        status: "error",
        stage: "Request failed",
        url: null,
        error: "Network error, please try again",
      });
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen overflow-auto bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center p-0 md:p-4 relative">
      {/* Futuristic background elements - same as in the original component */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500 rounded-full filter blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full filter blur-[100px]"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500 rounded-full filter blur-[100px]"></div>
        </div>
        {/* Grid lines */}
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ZmYxMCIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIj48L3JlY3Q+PC9zdmc+')] opacity-10"></div>
        {/* Corner Angles */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-blue-500/40"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-500/40"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-500/40"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-blue-500/40"></div>
      </div>

      <Card className="w-full max-w-full h-screen md:h-auto md:max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden bg-gray-800/70 backdrop-blur-md border-none md:border md:border-gray-700/50 md:rounded-xl md:shadow-2xl scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-gray-900/60 z-10">
        <CardContent className="p-4 md:p-6 max-w-5xl mx-auto relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 via-purple-500/60 to-blue-500/60"></div>

          <h1 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center">
            <span className="relative">
              Multiple Video Clip Creator
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full"></span>
            </span>
          </h1>

          <div className="space-y-4 mb-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={videos.map((v) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                {videos.map((video, index) => (
                  <SortableVideoCard
                    key={video.id}
                    id={video.id}
                    index={index}
                    videoItem={video}
                    onDelete={() => removeVideo(index)}
                    onUpdate={(updates) => updateVideo(index, updates)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {videos.length < 5 && (
              <Button
                onClick={addNewVideo}
                className="w-full py-3 bg-gray-800 rounded-lg border border-dashed border-gray-600 hover:border-purple-500 hover:bg-gray-700/50 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Video ({videos.length}/5)
              </Button>
            )}
          </div>

          <div className="mt-6">
            {mergeStatus.isProcessing ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-900/70 rounded-full h-5 overflow-hidden border border-gray-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${mergeStatus.progress}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-300">
                  {mergeStatus.stage}
                </div>
              </div>
            ) : mergeStatus.url ? (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row justify-center gap-3">
                  <a
                    href={`/api/download?id=${mergeStatus.url
                      ?.replace(/^\//, "")
                      .replace(/\.mp4$/, "")}`}
                    download
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-medium text-white hover:opacity-90 transition-all duration-200 shadow-lg flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Download via API
                  </a>

                  <a
                    href={mergeStatus.url}
                    download
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-medium text-white hover:opacity-90 transition-all duration-200 shadow-lg flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Direct Download
                  </a>
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">
                  If one download method doesn&apos;t work, try the other one.
                  You can also right-click and select &quot;Save link
                  as...&quot;
                </div>
                <Button
                  onClick={() => {
                    setMergeStatus({
                      isProcessing: false,
                      progress: 0,
                      status: "",
                      stage: "",
                      url: null,
                      error: null,
                    });
                  }}
                  className="w-full py-2 bg-gray-700 rounded-lg text-sm mt-4"
                >
                  Create Another Merge
                </Button>
              </div>
            ) : mergeStatus.error ? (
              <div className="space-y-3">
                <div className="bg-red-900/30 border border-red-700/50 p-3 rounded-lg text-red-200 text-sm">
                  Error: {mergeStatus.error}
                </div>
                <Button
                  onClick={() => {
                    setMergeStatus({
                      isProcessing: false,
                      progress: 0,
                      status: "",
                      stage: "",
                      url: null,
                      error: null,
                    });
                  }}
                  className="w-full py-2 bg-gray-700 rounded-lg text-sm"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleMergeClick}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium text-white hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-purple-500/20 relative overflow-hidden group"
                disabled={videos.filter((v) => v.videoId).length < 1}
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Merge Videos
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
                <span className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiIC8+PC9zdmc+')] opacity-20 z-0"></span>
              </Button>
            )}
          </div>

          {/* Footer tech elements */}
          <div className="mt-8 flex justify-center">
            <div className="text-xs text-gray-500 font-mono border border-gray-800 rounded-full px-2 py-1 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span>MULTI-YTCLIPPER V1.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
