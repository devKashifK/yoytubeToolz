// app/api/proxy/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    return new NextResponse("Missing or invalid `url`", { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new NextResponse("Upstream fetch failed", { status: 502 });
    }

    // Mirror headers and add CORS
    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new NextResponse("Internal proxy error", { status: 500 });
  }
}
