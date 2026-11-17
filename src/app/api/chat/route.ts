import { NextRequest } from "next/server";
import { sessionStore } from "@/lib/session-store";
import { streamChat } from "@/lib/chat-engine";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "sessionId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add user message to history
    session.chatHistory.push({
      role: "user",
      content: message,
      timestamp: Date.now(),
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChat(session, message)) {
            if (event.type === "token" && event.text) {
              fullResponse += event.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", text: event.text })}\n\n`)
              );
            } else if (event.type === "done") {
              session.chatHistory.push({
                role: "assistant",
                content: fullResponse,
                timestamp: Date.now(),
              });
              sessionStore.update(sessionId, {
                chatHistory: session.chatHistory,
              });

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
              controller.close();
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Chat failed" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
