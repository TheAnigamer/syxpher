export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve your website normally
    if (url.pathname === "/") {
      return env.ASSETS.fetch(request);
    }

    // Verify a TOTP code
    if (url.pathname === "/api/verify" && request.method === "POST") {
      const { code } = await request.json();

      const secret = env.TOTP_SECRET;

      // Temporary response until we add the TOTP verification logic
      return new Response(
        JSON.stringify({ ok: false, message: "Verification not connected yet" }),
        {
          headers: { "content-type": "application/json" },
        }
      );
    }

    return env.ASSETS.fetch(request);
  },
};
