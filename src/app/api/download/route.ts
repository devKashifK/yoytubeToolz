import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, audio_format_id, end_time, format_id, start_time, is_trim } =
      body;

    if (!url) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.downloadbazar.com/download/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_format_id,
        end_time,
        format_id,
        is_trim,
        start_time,
        url,
      }),
    });

    const data = await response.json();
    console.log(data, "checkDataFromDownload");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
