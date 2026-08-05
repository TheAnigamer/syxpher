# Syxpher Cloudflare setup

1. Upload all files in this folder to the GitHub repo `TheAnigamer/syxpher`.
2. In Cloudflare Pages, keep your existing D1 binding:
   Variable name: DB
   Database: your D1 database
3. Add a Pages/Workers secret named `TOTP_SECRET`.
   It must be a Base32 secret (A-Z and 2-7, no spaces). Generate one locally rather than putting a real secret in GitHub.
4. Deploy. The first page load will use the HTML in `index.html`.
5. Click the 🔒 button and enter the current 6-digit TOTP code.
6. After login, the editor lets you edit the page HTML and save it to D1.

Important: the D1 database is only used for saved page HTML. The TOTP secret is a Cloudflare secret and is never put in the site files.

If you want to generate a secret on Windows PowerShell:
  $bytes = New-Object byte[] 20
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes)

That Base64 string is NOT Base32, so use a Base32 generator locally or generate it with a small script. Do not use an online generator for a production secret.
