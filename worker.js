export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/check-secret") {
      return Response.json({
        loaded: !!env.TOTP_SECRET,
        length: env.TOTP_SECRET ? env.TOTP_SECRET.length : 0
      });
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return Response.json({
        ok: false,
        message: "Temporary diagnostic"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
