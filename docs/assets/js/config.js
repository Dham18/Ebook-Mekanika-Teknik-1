/* =========================================================
   KONFIGURASI E-BOOK "Mekanika Teknik 1"
   File : assets/js/config.js
   PENTING: JANGAN menaruh kunci API di sini. File ini dibaca peramban
   dan dapat dilihat siapa pun. Kunci API hanya disimpan di server
   perantara (lihat server/proxy-contoh.js).
   ========================================================= */
window.EBOOK_CONFIG = {
  // Mode AI Tutor:
  //  - API_ENDPOINT kosong  → Mode 1 (tanpa server): prompt disalin lalu dibuka di chatbot pilihan.
  //  - API_ENDPOINT terisi → Mode 2: pertanyaan dikirim ke server perantara milik kampus.
  API_ENDPOINT: "",                 // contoh: "https://ai-mt1.pnp.ac.id/api/tutor"

  // Chatbot untuk Mode 1. {q} diganti prompt (URL-encoded). Bila layanan tidak mendukung
  // parameter, prompt tetap tersalin ke papan klip dan halaman chatbot dibuka.
  CHATBOT: [
    { nama: "Claude",  url: "https://claude.ai/new?q={q}" },
    { nama: "ChatGPT", url: "https://chatgpt.com/?q={q}" },
    { nama: "Gemini",  url: "https://gemini.google.com/app" }
  ],

  // Alamat LMS (dipakai di kover dan tautan)
  LMS_URL: "https://spadasp.pnp.ac.id",

  // Ambang tuntas CPMK (Kurikulum Bab V.D)
  AMBANG_TUNTAS: 70,

  // Versi konten (ubah setiap rilis agar service worker memperbarui cache)
  VERSI: "1.0.1"
};
