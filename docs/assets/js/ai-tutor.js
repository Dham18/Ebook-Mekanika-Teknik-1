/* =========================================================
   AI TUTOR – e-book "Mekanika Teknik 1"
   File : assets/js/ai-tutor.js
   Mode 1 (tanpa server): menyusun prompt lengkap berisi konteks bab,
          lalu menyalin & membuka chatbot pilihan.
   Mode 2 (dengan server): mengirim pertanyaan ke EBOOK_CONFIG.API_ENDPOINT
          (server perantara milik kampus). Kunci API TIDAK PERNAH ada di klien.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.EBOOK_CONFIG || {};
  const S = window.MT1 && window.MT1.simpan;
  const $ = (s, el = document) => el.querySelector(s);

  // System prompt tutor (juga dipakai server perantara – lihat server/proxy-contoh.js)
  const SYSTEM_PROMPT = [
    "Kamu adalah AI Tutor untuk mata kuliah Mekanika Teknik I (SIP3115), Program Studi D3 Teknik Sipil, Politeknik Negeri Padang.",
    "Aturan:",
    "1. Jawab hanya seputar mata kuliah ini: gaya, vektor, satuan SI, momen, kopel, kesetimbangan, tumpuan, DBB, reaksi, gaya dalam (N, V, M), SFD/BMD, balok overhang, beban segitiga/trapesium, balok Gerber, portal, portal tiga sendi, rangka batang (titik buhul, Ritter), dan proyek model jembatan rangka. Untuk pertanyaan di luar itu, tolak dengan sopan dan arahkan kembali.",
    "2. Gunakan metode Sokratik: ajukan pertanyaan penuntun, beri petunjuk bertahap, minta mahasiswa menggambar DBB dan memeriksa ΣFx = 0, ΣFy = 0, ΣM = 0.",
    "3. Jangan langsung memberi jawaban akhir tugas, kuis, Case Method, atau ujian. Bila diminta, beri langkah berikutnya saja.",
    "4. Pakai bahasa Indonesia baku yang sederhana (EYD V), satuan SI, koma sebagai pemisah desimal, dan konvensi tanda buku: momen berlawanan jarum jam positif; tarik positif; momen lentur positif bila tarik di bawah/sisi dalam.",
    "5. Kutip subbab e-book yang relevan (mis. 'lihat subbab 5.3 Hubungan q–V–M').",
    "6. Utamakan keselamatan (K3) dan integritas akademik; jangan membantu memalsukan data uji."
  ].join("\n");

  function konteks() {
    const judul = (document.querySelector(".banner-bab__judul") || {}).textContent || document.title;
    // subbab terdekat yang sedang dibaca
    let sub = "";
    document.querySelectorAll("#isi h2, #isi h3").forEach(h => { if (h.getBoundingClientRect().top < window.innerHeight * 0.4) sub = h.textContent; });
    return { judul: judul.trim(), sub: sub.trim() };
  }
  function konteksPrompt() {
    const k = konteks();
    return `Konteks: saya mahasiswa D3 Teknik Sipil semester 1 yang sedang membaca e-book Mekanika Teknik 1, bab "${k.judul}"${k.sub ? ', bagian "' + k.sub + '"' : ""}. Mohon bimbing saya secara Sokratik, jangan langsung memberi jawaban akhir.\n\n`;
  }
  window.MT1 = window.MT1 || {}; window.MT1.konteksPrompt = konteksPrompt;

  const AKSI = [
    ["Jelaskan lebih sederhana", "Jelaskan konsep di bagian ini dengan bahasa sederhana dan satu analogi sehari-hari di Indonesia, lalu ajukan 1 pertanyaan untuk mengecek pemahaman saya."],
    ["Beri contoh lain", "Beri satu contoh nyata lain di proyek konstruksi untuk konsep ini. Minta saya mencoba langkah pertama sebelum kamu menjelaskan."],
    ["Buat soal latihan", "Buat 3 soal latihan bertingkat (mudah–sedang–menantang) tentang bagian ini. Jangan tampilkan jawaban sampai saya mengirim jawaban."],
    ["Periksa jawabanku", "Saya akan menempelkan langkah jawaban saya. Periksa dengan pertanyaan penuntun, tunjukkan langkah yang perlu dicek, jangan memberi jawaban akhir. Jawaban saya: "],
    ["Ringkas bab ini", "Ringkas bab ini menjadi 5 poin utama dan 1 peta konsep teks, sebutkan subbab terkait."]
  ];

  let riwayat = [];
  function bukaPanel(isiAwal) {
    const p = window.MT1.buatPanel("panel-ai", "AI Tutor", "ai-tutor");
    const isi = p.querySelector(".panel__isi");
    if (!isi.dataset.siap) {
      const mode2 = !!CFG.API_ENDPOINT;
      const pilihan = (CFG.CHATBOT || []).map((c, i) => `<option value="${i}">${c.nama}</option>`).join("");
      isi.innerHTML = `
        <p style="margin:0;font-size:13px" data-konteks></p>
        <div class="baris-tombol">${AKSI.map((a, i) => `<button type="button" class="tombol tombol--kecil" data-aksi="${i}">${a[0]}</button>`).join("")}</div>
        <div data-log style="display:grid;gap:8px"></div>
        <label for="ai-tanya" class="sr-only">Pertanyaan</label>
        <textarea id="ai-tanya" placeholder="Tulis pertanyaanmu tentang bab ini…"></textarea>
        <div class="baris-tombol">
          ${mode2 ? '<button type="button" class="tombol tombol--ungu" data-kirim>Kirim</button>' : ""}
          <button type="button" class="tombol ${mode2 ? "" : "tombol--ungu"}" data-chatbot>Salin & Buka Chatbot</button>
          <button type="button" class="tombol" data-salin-ai>Salin prompt</button>
          <label style="font-size:13px;display:flex;gap:6px;align-items:center">Chatbot <select data-pilih-cb style="font:inherit;border-radius:8px;padding:4px">${pilihan}</select></label>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:0">${mode2 ? "Mode 2: pertanyaan dikirim ke server AI kampus. Jangan kirim data pribadi." : "Mode 1: prompt berisi konteks bab disalin lalu chatbot dibuka di tab baru."} AI dapat keliru – selalu periksa dengan DBB dan kesetimbangan. AI Tutor tidak dipakai saat ujian.</p>`;
      const ta = isi.querySelector("textarea");
      const sel = isi.querySelector("[data-pilih-cb]"); sel.value = S ? S.ambil("mt1-chatbot", 0) : 0;
      sel.addEventListener("change", () => S && S.taruh("mt1-chatbot", Number(sel.value)));
      isi.querySelectorAll("[data-aksi]").forEach(b => b.addEventListener("click", () => { ta.value = AKSI[b.dataset.aksi][1]; ta.focus(); }));
      const susun = () => konteksPrompt() + ta.value.trim();
      isi.querySelector("[data-salin-ai]").addEventListener("click", async () => { const ok = await window.MT1.salin(susun()); window.MT1.kabar(ok ? "Prompt disalin ✓" : "Gagal menyalin"); });
      isi.querySelector("[data-chatbot]").addEventListener("click", async () => {
        if (!ta.value.trim()) { window.MT1.kabar("Tulis pertanyaan atau pilih tombol aksi dulu"); return; }
        const pr = susun(); await window.MT1.salin(pr);
        const cb = (CFG.CHATBOT || [])[Number(sel.value)] || { url: "https://claude.ai/new?q={q}" };
        window.open(cb.url.replace("{q}", encodeURIComponent(pr)), "_blank", "noopener");
      });
      const k = isi.querySelector("[data-kirim]");
      if (k) k.addEventListener("click", () => kirim(ta, isi.querySelector("[data-log]")));
      isi.dataset.siap = "1";
    }
    const kt = konteks();
    isi.querySelector("[data-konteks]").textContent = "Konteks: " + kt.judul + (kt.sub ? " › " + kt.sub : "");
    if (isiAwal) isi.querySelector("textarea").value = isiAwal;
    p.classList.add("buka"); isi.querySelector("textarea").focus();
  }

  async function kirim(ta, log) {
    const teks = ta.value.trim(); if (!teks) return;
    const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    log.insertAdjacentHTML("beforeend", `<div class="pesan pesan--saya">${esc(teks)}</div>`);
    riwayat.push({ role: "user", content: konteksPrompt() + teks }); ta.value = "";
    const tunggu = document.createElement("div"); tunggu.className = "pesan pesan--ai"; tunggu.textContent = "Sedang berpikir…"; log.appendChild(tunggu);
    try {
      const r = await fetch(CFG.API_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: riwayat.slice(-10), bab: document.body.dataset.halaman }) });
      if (!r.ok) throw new Error("Server menjawab " + r.status);
      const data = await r.json(); const jawab = data.reply || data.text || "(jawaban kosong)";
      riwayat.push({ role: "assistant", content: jawab }); tunggu.textContent = jawab;
    } catch (e) {
      tunggu.textContent = "Maaf, AI Tutor tidak dapat dihubungi (" + e.message + "). Gunakan tombol “Salin & Buka Chatbot”.";
      riwayat.pop();
    }
  }

  document.addEventListener("click", e => {
    if (e.target.closest("[data-buka-ai]")) bukaPanel();
    const t = e.target.closest("[data-tanya]"); if (t) bukaPanel(t.dataset.tanya);
  });
  window.MT1.SYSTEM_PROMPT = SYSTEM_PROMPT;
})();
