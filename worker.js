export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/check-secret") {
      return Response.json({
        loaded: !!env.TOTP_SECRET,
        length: env.TOTP_SECRET ? env.TOTP_SECRET.length : 0
      });
    }

    if (url.pathname === "/api/levels") {
      const response = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
        {
          headers: { Accept: "application/json" }
        }
      );

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-store"
        }
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Site assets unavailable", { status: 500 });
  }
};
