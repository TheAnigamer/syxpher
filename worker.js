export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/levels") {
      const response = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
        {
          headers: {
            Accept: "application/json"
          }
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

    return env.ASSETS.fetch(request);
  }
};
