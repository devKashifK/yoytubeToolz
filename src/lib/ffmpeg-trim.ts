"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

export async function trimVideoWithFFmpeg(
  videoUrl: string,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({ coreURL, wasmURL });

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(videoUrl)}`;
  const inputData = await ffmpeg.writeFile(
    "image.png",
    await fetchFile(imageFile)
  );
  ffmpeg.FS("writeFile", "input.mp4", inputData);

  const duration = endTime - startTime;
  await ffmpeg.run(
    "-ss",
    String(startTime),
    "-i",
    "input.mp4",
    "-t",
    String(duration),
    "-c",
    "copy",
    "output.mp4"
  );

  const trimmed = ffmpeg.FS("readFile", "output.mp4");
  const blob = new Blob([trimmed.buffer], { type: "video/mp4" });
  ffmpeg.FS("unlink", "input.mp4");
  ffmpeg.FS("unlink", "output.mp4");
  return blob;
}
