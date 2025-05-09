import { NextResponse } from "next/server";

// Additional route to check status

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    const response = await fetch("http://91.108.111.214/api/trim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
