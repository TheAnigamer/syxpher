export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/test") {
      return new Response("WORKER OK", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return Response.json({
        ok: false
      });
    }

    if (url.pathname === "/api/levels") {
      const response = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated"
      );

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/json"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
