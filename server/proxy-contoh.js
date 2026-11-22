/* =========================================================
   CONTOH SERVER PERANTARA (PROXY) AI TUTOR – Mode 2
   File : server/proxy-contoh.js   (Node.js 18+; TIDAK diunggah ke hosting statis)
   Fungsi: menerima pertanyaan dari e-book, menambahkan kunci API yang
   disimpan di variabel lingkungan server, meneruskan ke penyedia AI,
   lalu mengembalikan { reply }. Kunci API tidak pernah sampai ke peramban.

   Menjalankan:
     export AI_API_KEY="kunci-rahasia"          # simpan di server saja
     export AI_MODEL="claude-sonnet-5-5"       # sesuaikan dengan layanan yang dipakai
     export IZIN_ASAL="https://ebook-mt1.pnp.ac.id"
     node server/proxy-contoh.js
   Lalu isi assets/js/config.js → API_ENDPOINT: "https://alamat-server/api/tutor"
   ========================================================= */
const http = require("http");
const PORT = process.env.PORT || 8787;
const IZIN = process.env.IZIN_ASAL || "*";
const BATAS_PER_MENIT = 20;                 // pembatas sederhana per alamat IP
const hitungan = new Map();

function kirimJson(res, kode, data) {
  res.writeHead(kode, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": IZIN, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
  res.end(JSON.stringify(data));
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return kirimJson(res, 204, {});
  if (req.method !== "POST" || req.url !== "/api/tutor") return kirimJson(res, 404, { error: "Tidak ditemukan" });
  const ip = req.socket.remoteAddress, menit = Math.floor(Date.now() / 60000), k = ip + menit;
  hitungan.set(k, (hitungan.get(k) || 0) + 1);
  if (hitungan.get(k) > BATAS_PER_MENIT) return kirimJson(res, 429, { error: "Terlalu banyak permintaan, coba sebentar lagi." });
  let badan = ""; req.on("data", c => { badan += c; if (badan.length > 20000) req.destroy(); });
  req.on("end", async () => {
    try {
      const { system, messages } = JSON.parse(badan);
      if (!Array.isArray(messages) || !messages.length) return kirimJson(res, 400, { error: "Pesan kosong" });
      // Contoh untuk Anthropic Messages API; sesuaikan bila memakai penyedia lain.
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.AI_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: process.env.AI_MODEL, max_tokens: 800, system: String(system).slice(0, 4000), messages: messages.slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })) })
      });
      const data = await r.json();
      if (!r.ok) return kirimJson(res, 502, { error: "Layanan AI menolak permintaan" });
      kirimJson(res, 200, { reply: (data.content || []).map(c => c.text || "").join("\n") });
    } catch (e) { kirimJson(res, 500, { error: "Galat server" }); }
  });
}).listen(PORT, () => console.log("Proxy AI Tutor berjalan di port " + PORT));
