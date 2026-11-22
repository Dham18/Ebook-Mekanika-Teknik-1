/* =========================================================
   FITUR UMUM E-BOOK "Mekanika Teknik 1"
   File : assets/js/app.js
   Isi  : tema, ukuran huruf, daftar isi melayang, progres baca,
          penanda, catatan pribadi, baca suara, pencarian, progres bab,
          tombol salin/buka chatbot, flashcard glosarium, sertifikat,
          kode QR, dan pendaftaran service worker (PWA).
   Semua data pribadi disimpan di perangkat (localStorage), tidak dikirim.
   ========================================================= */
(function () {
  "use strict";
  const ROOT = document.body.dataset.root || "./";
  const HAL = document.body.dataset.halaman || "beranda";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- Penyimpanan aman ----------
  const simpan = {
    ambil(k, awal) { try { const v = localStorage.getItem(k); return v === null ? awal : JSON.parse(v); } catch (e) { return awal; } },
    taruh(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat: abaikan */ } }
  };
  window.MT1 = window.MT1 || {};
  window.MT1.simpan = simpan;

  // ---------- Notifikasi kecil ----------
  function kabar(teks) {
    let t = $("#kabar");
    if (!t) {
      t = document.createElement("div"); t.id = "kabar"; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#0F172A;color:#F8FAFC;padding:10px 16px;border-radius:12px;z-index:99;font:600 14px var(--font-body);box-shadow:var(--shadow);transition:opacity .25s";
      document.body.appendChild(t);
    }
    t.textContent = teks; t.style.opacity = "1";
    clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = "0"), 2200);
  }
  window.MT1.kabar = kabar;

  // ---------- Salin ke papan klip ----------
  async function salin(teks) {
    try { await navigator.clipboard.writeText(teks); return true; }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = teks; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  }
  window.MT1.salin = salin;

  // ---------- Tema & huruf ----------
  const tombolTema = $("[data-tema-tombol]");
  if (tombolTema) tombolTema.addEventListener("click", () => {
    const baru = document.documentElement.dataset.tema === "gelap" ? "terang" : "gelap";
    document.documentElement.dataset.tema = baru;
    try { localStorage.setItem("mt1-tema", baru); } catch (e) {}
    kabar(baru === "gelap" ? "Mode gelap aktif" : "Mode terang aktif");
  });
  $$("[data-huruf]").forEach(b => b.addEventListener("click", () => {
    let s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--font-scale")) || 1;
    s = Math.min(1.5, Math.max(0.875, s + (b.dataset.huruf === "+" ? 0.125 : -0.125)));
    document.documentElement.style.setProperty("--font-scale", s);
    try { localStorage.setItem("mt1-huruf", s); } catch (e) {}
    kabar("Ukuran huruf " + Math.round(s * 100) + "%");
  }));

  // ---------- Daftar isi melayang ----------
  const dis = $(".dis"), tirai = $(".tirai"), isi = $("#isi");
  if (dis && isi) {
    const hs = $$("h2[id], h3[id]", isi).filter(h => !h.closest(".kotak"));
    dis.innerHTML = '<h2>Isi halaman</h2><ol>' + hs.map(h =>
      `<li class="${h.tagName.toLowerCase()}"><a href="#${h.id}">${h.textContent}</a></li>`).join("") + "</ol>";
    const bukaTutup = (buka) => { dis.classList.toggle("buka", buka); tirai && tirai.classList.toggle("buka", buka); };
    $$("[data-buka-dis]").forEach(b => b.addEventListener("click", () => bukaTutup(!dis.classList.contains("buka"))));
    tirai && tirai.addEventListener("click", () => bukaTutup(false));
    dis.addEventListener("click", e => { if (e.target.closest("a")) bukaTutup(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { bukaTutup(false); $$(".panel.buka").forEach(p => p.classList.remove("buka")); } });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(ents => ents.forEach(en => {
        if (en.isIntersecting) $$("a", dis).forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id ? "true" : "false"));
      }), { rootMargin: "-20% 0px -70% 0px" });
      hs.forEach(h => io.observe(h));
    }
  }

  // ---------- Progres baca & progres bab ----------
  const batang = $(".progres-baca");
  const progres = simpan.ambil("mt1-progres", {});
  function tandaiSelesai(auto) {
    if (!HAL.startsWith("bab-") && !["awal", "akhir", "uts", "uas"].includes(HAL)) return;
    const kini = simpan.ambil("mt1-progres", {});            // baca ulang agar tidak menimpa data tab lain
    if (!kini[HAL]) { kini[HAL] = new Date().toISOString(); simpan.taruh("mt1-progres", kini); if (!auto) kabar("Bab ditandai selesai ✓"); }
    progres[HAL] = kini[HAL];
    perbaruiTombolSelesai();
  }
  function perbaruiTombolSelesai() {
    const b = $("[data-tandai-selesai]"); if (b && progres[HAL]) { b.textContent = "✓ Bab ini sudah selesai"; b.disabled = true; }
  }
  perbaruiTombolSelesai();
  $("[data-tandai-selesai]") && $("[data-tandai-selesai]").addEventListener("click", () => tandaiSelesai(false));
  window.addEventListener("scroll", () => {
    const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (batang) batang.style.width = (p * 100).toFixed(1) + "%";
    if (p > 0.97) tandaiSelesai(true);
  }, { passive: true });

  // ---------- Penanda halaman ----------
  const tPenanda = $("[data-penanda]");
  if (tPenanda) {
    const daftar = () => simpan.ambil("mt1-penanda", []);
    const ada = () => daftar().some(p => p.url === location.pathname);
    tPenanda.setAttribute("aria-pressed", ada());
    tPenanda.addEventListener("click", () => {
      let d = daftar();
      if (ada()) { d = d.filter(p => p.url !== location.pathname); kabar("Penanda dihapus"); }
      else { d.push({ url: location.pathname, judul: document.title, waktu: Date.now() }); kabar("Halaman ditandai"); }
      simpan.taruh("mt1-penanda", d); tPenanda.setAttribute("aria-pressed", ada());
    });
  }

  // ---------- Panel generik ----------
  function buatPanel(id, judul, ikon) {
    let p = document.getElementById(id); if (p) return p;
    p = document.createElement("section"); p.id = id; p.className = "panel"; p.setAttribute("aria-label", judul);
    p.innerHTML = `<div class="panel__kepala"><svg class="ikon" aria-hidden="true"><use href="${ROOT}assets/icons/icons.svg#i-${ikon}"/></svg>${judul}<button class="tbl-ikon" type="button" aria-label="Tutup">✕</button></div><div class="panel__isi"></div>`;
    p.querySelector(".tbl-ikon").addEventListener("click", () => p.classList.remove("buka"));
    document.body.appendChild(p); return p;
  }
  window.MT1.buatPanel = buatPanel;

  // ---------- Catatan pribadi ----------
  const tCatatan = $("[data-catatan]");
  if (tCatatan) tCatatan.addEventListener("click", () => {
    const p = buatPanel("panel-catatan", "Catatan pribadi", "catatan");
    const kunci = "mt1-catatan-" + HAL;
    const isiP = p.querySelector(".panel__isi");
    if (!isiP.dataset.siap) {
      isiP.innerHTML = '<label for="ta-catatan">Catatan untuk halaman ini (tersimpan otomatis di perangkatmu):</label><textarea id="ta-catatan" rows="10"></textarea><div class="baris-tombol"><button class="tombol tombol--kecil" type="button" data-unduh-catatan>Unduh semua catatan (.txt)</button></div>';
      const ta = isiP.querySelector("textarea"); ta.value = simpan.ambil(kunci, "");
      ta.addEventListener("input", () => simpan.taruh(kunci, ta.value));
      isiP.querySelector("[data-unduh-catatan]").addEventListener("click", () => {
        let teks = "Catatan e-book Mekanika Teknik 1\n\n";
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("mt1-catatan-")) teks += "== " + k.slice(12) + " ==\n" + simpan.ambil(k, "") + "\n\n"; }
        unduh("catatan-mekanika-teknik-1.txt", teks, "text/plain");
      });
      isiP.dataset.siap = "1";
    }
    p.classList.add("buka"); isiP.querySelector("textarea").focus();
  });

  function unduh(nama, isiTeks, tipe) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([isiTeks], { type: tipe + ";charset=utf-8" }));
    a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  window.MT1.unduh = unduh;

  // ---------- Baca suara (Web Speech API) ----------
  const tSuara = $("[data-suara]");
  if (tSuara) {
    if (!("speechSynthesis" in window)) tSuara.hidden = true;
    else tSuara.addEventListener("click", () => {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); tSuara.setAttribute("aria-pressed", "false"); return; }
      const teks = $$("#isi p, #isi li, #isi h2, #isi h3").filter(e => !e.closest(".kalk, .kuis, .umpan, details")).map(e => e.textContent.trim()).join(". ");
      // dipotong per kalimat agar tidak berhenti di peramban seluler
      const bagian = teks.match(/[^.!?]+[.!?]*/g) || [teks];
      const suaraId = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("id"));
      bagian.slice(0, 400).forEach((b, i) => {
        const u = new SpeechSynthesisUtterance(b); u.lang = "id-ID"; if (suaraId) u.voice = suaraId; u.rate = 1;
        if (i === bagian.length - 1) u.onend = () => tSuara.setAttribute("aria-pressed", "false");
        speechSynthesis.speak(u);
      });
      tSuara.setAttribute("aria-pressed", "true"); kabar("Membaca halaman… ketuk lagi untuk berhenti");
    });
  }

  // ---------- Pencarian teks seluruh buku ----------
  const tCari = $("[data-cari]");
  let indeks = null;
  async function bangunIndeks() {
    if (indeks) return indeks;
    const r = await fetch(ROOT + "assets/js/halaman.json"); const daftar = await r.json();
    indeks = [];
    for (const h of daftar) {
      try {
        const t = await (await fetch(ROOT + h.url)).text();
        const d = new DOMParser().parseFromString(t, "text/html");
        $$("#isi h2, #isi h3, #isi p, #isi li, #isi td", d).forEach(el => {
          const s = el.textContent.replace(/\s+/g, " ").trim(); if (s.length > 2) indeks.push({ url: h.url, judul: h.judul, id: el.closest("[id]") && el.closest("[id]").id, teks: s });
        });
      } catch (e) { /* halaman gagal dimuat saat luring: dilewati */ }
    }
    return indeks;
  }
  if (tCari) tCari.addEventListener("click", () => {
    const p = buatPanel("panel-cari", "Cari di seluruh buku", "cari");
    const isiP = p.querySelector(".panel__isi");
    if (!isiP.dataset.siap) {
      isiP.innerHTML = '<label for="q-cari">Kata kunci</label><input id="q-cari" type="search" placeholder="mis. kantilever, Ritter, kopel" style="font:inherit;padding:10px;border-radius:10px;border:1px solid var(--surface-border);background:var(--surface);color:var(--text)"><div class="cari-hasil" aria-live="polite"></div>';
      const q = isiP.querySelector("input"), out = isiP.querySelector(".cari-hasil");
      let h;
      q.addEventListener("input", () => {
        clearTimeout(h); h = setTimeout(async () => {
          const kata = q.value.trim().toLowerCase(); if (kata.length < 3) { out.innerHTML = "<p>Ketik minimal 3 huruf.</p>"; return; }
          out.innerHTML = "<p>Mencari…</p>";
          const idx = await bangunIndeks();
          const hasil = idx.filter(x => x.teks.toLowerCase().includes(kata)).slice(0, 40);
          const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
          out.innerHTML = hasil.length ? hasil.map(x => {
            const i = x.teks.toLowerCase().indexOf(kata); const a = Math.max(0, i - 50);
            const cuplik = esc(x.teks.slice(a, i)) + "<mark>" + esc(x.teks.slice(i, i + kata.length)) + "</mark>" + esc(x.teks.slice(i + kata.length, i + kata.length + 70));
            return `<p><a href="${ROOT + x.url}${x.id ? "#" + x.id : ""}"><b>${esc(x.judul)}</b></a><br>…${cuplik}…</p>`;
          }).join("") : "<p>Tidak ditemukan.</p>";
        }, 250);
      });
      isiP.dataset.siap = "1";
    }
    p.classList.add("buka"); isiP.querySelector("input").focus();
  });

  // ---------- Tombol salin / buka chatbot (kartu prompt) ----------
  const CFG = window.EBOOK_CONFIG || {};
  document.addEventListener("click", async e => {
    const s = e.target.closest("[data-salin]");
    if (s) { const ok = await salin(s.dataset.salin); kabar(ok ? "Prompt disalin ✓" : "Gagal menyalin – salin manual"); }
    const b = e.target.closest("[data-buka-chatbot]");
    if (b) {
      const prompt = (window.MT1.konteksPrompt ? window.MT1.konteksPrompt() : "") + b.dataset.bukaChatbot;
      await salin(prompt);
      const cb = (CFG.CHATBOT || [])[simpan.ambil("mt1-chatbot", 0)] || { url: "https://claude.ai/new?q={q}" };
      window.open(cb.url.replace("{q}", encodeURIComponent(prompt)), "_blank", "noopener");
      kabar("Prompt disalin – tempel bila belum terisi otomatis");
    }
  });

  // ---------- Flashcard glosarium ----------
  const fc = $(".flashcards"), tabelGlos = $("table.glosarium");
  if (fc && tabelGlos) {
    const kartu = $$("tbody tr", tabelGlos).map(tr => { const c = tr.querySelectorAll("td"); return [c[0] && c[0].textContent.trim(), c[1] && c[1].textContent.trim()]; }).filter(x => x[0]);
    let i = 0;
    fc.innerHTML = '<h3>Flashcard glosarium</h3><p id="flash-petunjuk" class="sr-only">Tekan Enter atau ketuk kartu untuk membalik.</p><div class="flash" tabindex="0" role="button" aria-describedby="flash-petunjuk"><div class="flash__dalam"><div class="flash__sisi"></div><div class="flash__sisi flash__sisi--b"></div></div></div><div class="baris-tombol" style="justify-content:center"><button class="tombol tombol--kecil" data-f="-1">← Sebelumnya</button><span data-no></span><button class="tombol tombol--kecil" data-f="acak">Acak</button><button class="tombol tombol--kecil" data-f="1">Berikutnya →</button></div>';
    const f = $(".flash", fc);
    const tampil = () => { f.classList.remove("balik"); $(".flash__sisi", fc).textContent = kartu[i][0]; $(".flash__sisi--b", fc).textContent = kartu[i][1]; $("[data-no]", fc).textContent = (i + 1) + " / " + kartu.length; };
    f.addEventListener("click", () => f.classList.toggle("balik"));
    f.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f.classList.toggle("balik"); } });
    $$("[data-f]", fc).forEach(b => b.addEventListener("click", () => { const v = b.dataset.f; i = v === "acak" ? Math.floor(Math.random() * kartu.length) : (i + Number(v) + kartu.length) % kartu.length; tampil(); }));
    tampil();
  }

  // ---------- Sertifikat penyelesaian ----------
  const tSert = $("[data-sertifikat]");
  if (tSert) tSert.addEventListener("click", async () => {
    const daftar = await (await fetch(ROOT + "assets/js/halaman.json")).json();
    const bab = daftar.filter(h => h.id.startsWith("bab-"));
    const prog = simpan.ambil("mt1-progres", {});
    const belum = bab.filter(h => !prog[h.id]);
    const skor = simpan.ambil("mt1-skor-akhir-1", null);
    const ambang = CFG.AMBANG_TUNTAS || 70;
    const out = $("#sertifikat");
    if (belum.length) { out.innerHTML = `<p class="nok">Belum dapat dibuat: ${belum.length} bab belum ditandai selesai (${belum.map(b => b.judul).join(", ")}).</p>`; return; }
    if (!skor || (skor.terbaik || skor.persen) < ambang) { out.innerHTML = `<p class="nok">Kerjakan Evaluasi Akhir Buku (Z1) sampai skor ≥ ${ambang}. Skor terbaik: ${skor ? (skor.terbaik || skor.persen) : 0}.</p>`; return; }
    const nama = prompt("Tulis nama lengkap untuk sertifikat:"); if (!nama) return;
    const kode = "MT1-" + Date.now().toString(36).toUpperCase();
    out.innerHTML = `<div class="kotak" style="text-align:center;padding:32px;border:3px solid var(--c-oranye)"><img src="${ROOT}assets/img/logo-pnp.png" alt="Logo Politeknik Negeri Padang" style="width:72px"><h2 style="border:0">SERTIFIKAT PENYELESAIAN</h2><p>Diberikan kepada</p><p style="font:700 26px var(--font-head)">${nama.replace(/[<>&]/g, "")}</p><p>telah menyelesaikan seluruh bab e-book <b>Mekanika Teknik 1</b> (SIP3115) dengan skor Evaluasi Akhir Buku <b>${skor.terbaik || skor.persen}</b> / 100.</p><p>${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • Kode: ${kode}</p><p style="font-size:12px">Bukti belajar mandiri, bukan pengganti nilai resmi mata kuliah.</p></div><button class="tombol tombol--utama" onclick="window.print()">Cetak / simpan PDF</button>`;
  });

  // ---------- Kode QR (qrcode.js dimuat bila diperlukan) ----------
  const qrs = $$("[data-qr]");
  if (qrs.length) {
    const sc = document.createElement("script"); sc.src = ROOT + "assets/vendor/qrcode/qrcode.min.js";
    sc.onload = () => qrs.forEach(el => { try { const u = new URL(el.dataset.qr, location.href).href; new QRCode(el, { text: u, width: 96, height: 96, correctLevel: QRCode.CorrectLevel.M }); el.querySelectorAll('img,canvas').forEach(x => { x.setAttribute('alt', 'Kode QR menuju ' + u); x.setAttribute('role', 'img'); x.setAttribute('aria-label', 'Kode QR menuju ' + u); }); setTimeout(() => el.querySelectorAll('img').forEach(x => x.setAttribute('alt', 'Kode QR menuju ' + u)), 50); } catch (e) {} });
    sc.onerror = () => qrs.forEach(el => { el.textContent = "QR tersedia saat daring"; el.style.fontSize = "11px"; });
    document.head.appendChild(sc);
  }

  // ---------- Bungkus tabel lebar & tautan luar ----------
  $$('#isi a[href^="http"]').forEach(a => { a.target = "_blank"; a.rel = "noopener"; });

  // ---------- Service worker (baca luring) ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register(ROOT + "service-worker.js").catch(() => {}));
  }
})();
