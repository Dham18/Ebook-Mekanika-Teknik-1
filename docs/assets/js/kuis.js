/* =========================================================
   KUIS INTERAKTIF – e-book "Mekanika Teknik 1"
   File : assets/js/kuis.js
   Jenis soal: pilihan ganda (pg), benar-salah (bs), isian angka/teks,
   menjodohkan, dan uraian (kunci + rubrik untuk penilaian diri).
   Skor disimpan di perangkat: localStorage "mt1-skor-<id kuis>".
   ========================================================= */
(function () {
  "use strict";
  const S = window.MT1 && window.MT1.simpan;

  // Angka gaya Indonesia: "1.000,5" → 1000.5 ; juga menerima "6.13"
  function angka(teks) {
    const t = (teks || "").replace(/[–−]/g, "-");
    const m = t.match(/-?\d[\d.]*(,\d+)?/g) || [];
    return m.map(s => {
      if (s.includes(",")) return parseFloat(s.replace(/\./g, "").replace(",", "."));
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ""));
      return parseFloat(s);
    }).filter(v => !isNaN(v));
  }
  const norm = s => (s || "").toLowerCase().replace(/[–−]/g, "-").replace(/\s+/g, "").replace(/[.;,]$/, "");

  function cekIsian(jawab, kunci) {
    const kA = angka(kunci), jA = angka(jawab);
    if (kA.length) {
      if (jA.length < kA.length) return false;
      return kA.every((k, i) => Math.abs(jA[i] - k) <= Math.max(Math.abs(k) * 0.02, 0.011));
    }
    return norm(jawab) && (norm(kunci).includes(norm(jawab)) || norm(jawab).includes(norm(kunci)));
  }
  function cekJodoh(jawab, kunci) {
    const pas = s => (s.toUpperCase().match(/\d\s*-\s*[A-E]/g) || []).map(x => x.replace(/\s/g, "")).sort().join(",");
    return pas(jawab) !== "" && pas(jawab) === pas(kunci);
  }

  document.querySelectorAll(".kuis").forEach(kuis => {
    const id = kuis.dataset.kuis;
    const soal = Array.from(kuis.querySelectorAll(".soal"));
    const otomatis = soal.filter(s => s.dataset.tipe !== "uraian");
    const kunciSimpan = "mt1-skor-" + id;
    const elSkor = kuis.querySelector("[data-skor]"), elMaks = kuis.querySelector("[data-maks]");
    elMaks.textContent = otomatis.length;
    let status = {};
    const lalu = (S && S.ambil(kunciSimpan, null)) || null;

    function hitung() {
      const benar = Object.values(status).filter(v => v === true).length;
      elSkor.textContent = benar;
      const persen = otomatis.length ? Math.round(benar / otomatis.length * 100) : 0;
      const terbaik = Math.max(persen, (lalu && lalu.terbaik) || 0);
      S && S.taruh(kunciSimpan, { benar, maks: otomatis.length, persen, terbaik, waktu: Date.now() });
    }
    function tandai(el, ok, i) {
      status[i] = ok; el.classList.add(ok ? "benar" : "salah");
      const u = el.querySelector(".umpan"); u.hidden = false;
      u.insertAdjacentHTML("afterbegin", `<b class="${ok ? "ok" : "nok"}">${ok ? "Tepat!" : "Belum tepat."}</b> `);
      hitung();
    }

    soal.forEach((el, i) => {
      const kunci = el.dataset.kunci || "";
      const tipe = el.dataset.tipe;
      if (tipe === "pg" || tipe === "bs") {
        el.querySelectorAll("[data-opsi]").forEach(b => b.addEventListener("click", () => {
          if (i in status) return;
          const k = tipe === "pg" ? (kunci.match(/\([a-e]\)/i) || [kunci])[0].toLowerCase() : kunci.split(/\s/)[0];
          const ok = b.dataset.opsi.toLowerCase() === k.toLowerCase();
          b.classList.add(ok ? "benar" : "salah");
          if (!ok) el.querySelectorAll("[data-opsi]").forEach(x => { if (x.dataset.opsi.toLowerCase() === k.toLowerCase()) x.classList.add("benar"); });
          tandai(el, ok, i);
        }));
      } else if (tipe === "uraian") {
        el.querySelector("[data-lihat]").addEventListener("click", () => {
          const u = el.querySelector(".umpan"); u.hidden = false;
          if (!u.dataset.siap) { u.insertAdjacentHTML("beforeend", '<p style="margin:6px 0 0;font-size:13px">Nilai jawabanmu sendiri dengan rubrik di atas, lalu diskusikan dengan dosen/tutor sebaya.</p>'); u.dataset.siap = 1; }
        });
      } else {
        const inp = el.querySelector("input");
        const periksa = () => {
          if (i in status || !inp.value.trim()) return;
          const ok = tipe === "jodoh" ? cekJodoh(inp.value, kunci) : cekIsian(inp.value, kunci);
          inp.classList.add(ok ? "benar" : "salah"); tandai(el, ok, i);
        };
        el.querySelector("[data-periksa]").addEventListener("click", periksa);
        inp.addEventListener("keydown", e => { if (e.key === "Enter") periksa(); });
      }
    });

    kuis.querySelector("[data-ulang]").addEventListener("click", () => {
      status = {}; hitung();
      soal.forEach(el => {
        el.querySelectorAll(".benar, .salah").forEach(x => x.classList.remove("benar", "salah"));
        el.classList.remove("benar", "salah");
        const u = el.querySelector(".umpan"); u.hidden = true; u.querySelectorAll("b.ok, b.nok").forEach(b => b.remove());
        const inp = el.querySelector("input"); if (inp) inp.value = "";
      });
    });

    // tampilkan skor terbaik sebelumnya (jawaban tidak dipulihkan agar dapat berlatih ulang)
    if (lalu && lalu.terbaik) kuis.querySelector(".kuis__skor span").insertAdjacentHTML("beforeend", ` <small>(terbaik sebelumnya: ${lalu.terbaik}%)</small>`);
  });

  window.MT1 = window.MT1 || {}; window.MT1.cekIsian = cekIsian; window.MT1.angka = angka;
})();
