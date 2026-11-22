/* =========================================================
   ALAT HITUNG – e-book "Mekanika Teknik 1"
   File : assets/js/kalkulator.js
   Kalkulator: vektor, momen & resultan, pemeriksa kesetimbangan,
   balok (sederhana/kantilever/overhang/Gerber), portal (L, sendi–rol,
   tiga sendi datar/pelana), rangka batang (Pratt/Howe/Warren + Ritter),
   dan perencana model jembatan.
   Setiap kalkulator: validasi, langkah penyelesaian, grafik SVG,
   salin hasil, ekspor CSV, cetak/PDF, dan kasus uji dari contoh soal.
   Konvensi: momen berlawanan jarum jam (↺) positif; beban ke bawah
   ditulis positif pada input balok; tarik positif.
   ========================================================= */
(function () {
  "use strict";
  const ROOT = document.body.dataset.root || "./";
  // ---------- utilitas ----------
  const fmt = (v, d = 2) => (Math.abs(v) < 5e-10 ? 0 : v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function num(s) {
    if (typeof s === "number") return s;
    const t = String(s).trim().replace(/[–−]/g, "-").replace(",", ".");
    if (t === "" || isNaN(Number(t))) throw new Error(`“${s}” bukan angka yang sah.`);
    return Number(t);
  }
  const baris = t => String(t).split(/\n/).map(x => x.trim()).filter(x => x && !x.startsWith("#"));
  const kata = l => l.split(/[\s;]+/).filter(Boolean);
  function selesaikan(A, b) { // eliminasi Gauss dengan pivot parsial
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-10) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  const dekat = (a, e, tol = 0.01) => Math.abs(a - e) <= Math.max(tol, Math.abs(e) * 0.005);
  function tabel(kepala, isi) { return `<div class="gulir"><table><thead><tr>${kepala.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${isi.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
  const ikon = n => `<svg class="ikon" aria-hidden="true"><use href="${ROOT}assets/icons/icons.svg#i-${n}"/></svg>`;

  // ---------- grafik SVG garis (x–y) ----------
  function grafik(xs, ys, o = {}) {
    const W = 640, H = o.h || 190, pl = 64, pr = 12, pt = 22, pb = 24;
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
    const sx = x => pl + (x - x0) / (x1 - x0 || 1) * (W - pl - pr);
    const sy = y => o.balik ? pt + (y - y0) / (y1 - y0) * (H - pt - pb) : H - pb - (y - y0) / (y1 - y0) * (H - pt - pb);
    const d = xs.map((x, i) => (i ? "L" : "M") + sx(x).toFixed(1) + " " + sy(ys[i]).toFixed(1)).join("");
    const isi = d + `L${sx(x1).toFixed(1)} ${sy(0).toFixed(1)}L${sx(x0).toFixed(1)} ${sy(0).toFixed(1)}Z`;
    const lab = (o.label || []).map(([x, y, t]) => `<text x="${sx(x).toFixed(1)}" y="${(sy(y) + (o.balik ? (y >= 0 ? 12 : -4) : (y >= 0 ? -4 : 12))).toFixed(1)}" font-size="15" text-anchor="middle" fill="${o.warna}">${t}</text>`).join("");
    return `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.judul || "grafik")}">
      <text x="4" y="15" font-size="15" fill="currentColor">${esc(o.judul || "")}</text>
      <line x1="${pl}" x2="${W - pr}" y1="${sy(0)}" y2="${sy(0)}" stroke="#94A3B8"/>
      <path d="${isi}" fill="${o.warna}" fill-opacity=".18"/><path d="${d}" fill="none" stroke="${o.warna}" stroke-width="2"/>
      <text x="${pl - 4}" y="${sy(y1) + 4}" font-size="14" text-anchor="end" fill="currentColor">${fmt(o.balik ? y0 : y1, 1)}</text>
      <text x="${pl - 4}" y="${sy(y0) + 4}" font-size="14" text-anchor="end" fill="currentColor">${fmt(o.balik ? y1 : y0, 1)}</text>
      <text x="${W - pr}" y="${H - 6}" font-size="10" text-anchor="end" fill="currentColor">x (m)</text>${lab}</svg>`;
  }

  // ---------- kerangka kalkulator ----------
  function pasang(el, judul, formHtml, hitung, uji, preset) {
    el.innerHTML = `<h4>${ikon("alat-hitung")} ${judul}</h4>
      ${preset ? `<label>Isi contoh dari buku <select data-preset><option value="">— pilih contoh —</option>${preset.map((p, i) => `<option value="${i}">${esc(p.nama)}</option>`).join("")}</select></label>` : ""}
      <form novalidate>${formHtml}
      <div class="baris-tombol" style="margin-top:10px"><button class="tombol tombol--utama" type="submit">${ikon("alat-hitung")} Hitung</button>
      <button class="tombol" type="reset">Reset</button><button class="tombol" type="button" data-k="salin">Salin hasil</button>
      <button class="tombol" type="button" data-k="csv">Ekspor CSV</button><button class="tombol" type="button" data-k="pdf">Cetak/PDF</button>
      <button class="tombol" type="button" data-k="uji">Jalankan kasus uji</button></div></form>
      <div class="galat" role="alert" aria-live="assertive"></div><div class="hasil" aria-live="polite"></div><div class="uji"></div>`;
    const form = el.querySelector("form"), gal = el.querySelector(".galat"), has = el.querySelector(".hasil");
    let terakhir = null;
    const ambil = () => Object.fromEntries(Array.from(form.elements).filter(x => x.name).map(x => [x.name, x.value]));
    const isi = v => Object.entries(v).forEach(([k, val]) => { if (form.elements[k]) form.elements[k].value = val; });
    form.addEventListener("submit", e => {
      e.preventDefault(); gal.textContent = "";
      try { terakhir = hitung(ambil()); has.innerHTML = terakhir.html; }
      catch (er) { gal.textContent = "⚠ " + er.message; has.innerHTML = ""; terakhir = null; }
    });
    form.addEventListener("reset", () => { setTimeout(() => { has.innerHTML = ""; gal.textContent = ""; el.querySelector(".uji").innerHTML = ""; }, 0); });
    const sel = el.querySelector("[data-preset]");
    if (sel) sel.addEventListener("change", () => { if (sel.value !== "") { isi(preset[sel.value].v); form.requestSubmit(); } });
    el.querySelector('[data-k="salin"]').addEventListener("click", async () => { if (!terakhir) return; const ok = await window.MT1.salin(terakhir.teks); window.MT1.kabar(ok ? "Hasil disalin ✓" : "Gagal menyalin"); });
    el.querySelector('[data-k="csv"]').addEventListener("click", () => { if (terakhir) window.MT1.unduh("hasil-" + (el.dataset.kalk || "kalkulator") + ".csv", "﻿" + terakhir.csv, "text/csv"); });
    el.querySelector('[data-k="pdf"]').addEventListener("click", () => window.print());
    el.querySelector('[data-k="uji"]').addEventListener("click", () => {
      const out = uji.map(u => {
        try { const r = hitung(u.v).nilai; if (u.galat) return [esc(u.nama), "Seharusnya ditolak sebagai labil", '<span class="nok">GAGAL ✗</span>']; const ok = u.cek.every(([k, e]) => dekat(r[k], e)); return [esc(u.nama), u.cek.map(([k, e]) => `${k} = ${fmt(r[k])} (harus ${fmt(e)})`).join("<br>"), ok ? '<span class="ok">LULUS ✓</span>' : '<span class="nok">GAGAL ✗</span>']; }
        catch (er) { return [esc(u.nama), esc(er.message), u.galat ? '<span class="ok">LULUS ✓ (ditolak)</span>' : '<span class="nok">GALAT</span>']; }
      });
      el.querySelector(".uji").innerHTML = "<b>Kasus uji (dicocokkan dengan contoh soal buku)</b>" + tabel(["Kasus", "Hasil", "Status"], out);
    });
    if (preset && preset.length) { isi(preset[0].v); }
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
  }
  const inp = (name, label, val, tipe = "text") => `<label>${label}<input name="${name}" value="${val}" inputmode="decimal" type="${tipe}"></label>`;
  const area = (name, label, val, bantu) => `<label style="grid-column:1/-1">${label}<textarea name="${name}" spellcheck="false">${val}</textarea>${bantu ? `<small>${bantu}</small>` : ""}</label>`;

  // =========================================================
  // 1. VEKTOR GAYA & KONVERSI SATUAN (Bab 1)
  // =========================================================
  const KONV = { N: 1, kN: 1000, kgf: 9.80665, tf: 9806.65, "kg (massa→berat)": 9.81 };
  function kalkVektor(el) {
    pasang(el, "Penjumlahan Vektor Gaya & Konversi Satuan",
      `<div class="grid-input">${area("gaya", "Daftar gaya: satu baris “F θ” (F dalam kN, θ dalam derajat dari sumbu x positif, berlawanan jarum jam)", "10 0\n8 60\n6 150", "Contoh: 10 0 ↵ 8 60 ↵ 6 150. Maksimal 8 gaya.")}
       ${inp("kv", "Konversi: nilai", "1000")}<label>dari<select name="kd">${Object.keys(KONV).map(k => `<option>${k}</option>`).join("")}</select></label><label>ke<select name="kk">${Object.keys(KONV).filter(k => !k.startsWith("kg ")).map(k => `<option ${k === "kN" ? "selected" : ""}>${k}</option>`).join("")}</select></label></div>`,
      v => {
        const g = baris(v.gaya).map((l, i) => { const w = kata(l); if (w.length < 2) throw new Error(`Baris ${i + 1}: tulis besar gaya dan sudut, mis. “8 60”.`); const F = num(w[0]), t = num(w[1]); if (F <= 0) throw new Error(`Baris ${i + 1}: besar gaya harus lebih dari 0 kN.`); if (t < 0 || t > 360) throw new Error(`Baris ${i + 1}: sudut harus 0–360°.`); return [F, t]; });
        if (!g.length) throw new Error("Isi minimal satu gaya."); if (g.length > 8) throw new Error("Maksimal 8 gaya.");
        const r = g.map(([F, t]) => [F, t, F * Math.cos(t * Math.PI / 180), F * Math.sin(t * Math.PI / 180)]);
        const sx = r.reduce((a, x) => a + x[2], 0), sy = r.reduce((a, x) => a + x[3], 0);
        const R = Math.hypot(sx, sy); let th = Math.atan2(sy, sx) * 180 / Math.PI; if (th < 0) th += 360;
        const kuad = R < 1e-9 ? "–" : th < 90 ? "I" : th < 180 ? "II" : th < 270 ? "III" : "IV";
        const kv = num(v.kv), hasilK = kv * KONV[v.kd] / KONV[v.kk];
        // poligon gaya
        let px = 0, py = 0; const pts = [[0, 0]]; r.forEach(x => { px += x[2]; py += x[3]; pts.push([px, py]); });
        const xsA = pts.map(p => p[0]), ysA = pts.map(p => p[1]); const mnx = Math.min(...xsA), mxx = Math.max(...xsA), mny = Math.min(...ysA), mxy = Math.max(...ysA);
        const sk = 240 / Math.max(mxx - mnx, mxy - mny, 1e-6); const tx = x => 30 + (x - mnx) * sk, ty = y => 270 - (y - mny) * sk;
        const svg = `<svg class="grafik" viewBox="0 0 330 300" role="img" aria-label="Poligon gaya"><defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#006A7A"/></marker><marker id="pb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#F26622"/></marker></defs>
          ${pts.slice(1).map((p, i) => `<line x1="${tx(pts[i][0])}" y1="${ty(pts[i][1])}" x2="${tx(p[0])}" y2="${ty(p[1])}" stroke="#006A7A" stroke-width="2" marker-end="url(#pa)"/><text x="${(tx(pts[i][0]) + tx(p[0])) / 2 + 4}" y="${(ty(pts[i][1]) + ty(p[1])) / 2}" font-size="11" fill="#006A7A">F${i + 1}</text>`).join("")}
          <line x1="${tx(0)}" y1="${ty(0)}" x2="${tx(sx)}" y2="${ty(sy)}" stroke="#F26622" stroke-width="3" marker-end="url(#pb)"/><text x="${(tx(0) + tx(sx)) / 2 - 10}" y="${(ty(0) + ty(sy)) / 2 - 6}" font-size="12" fill="#B3470F">R</text></svg>`;
        const langkah = r.map((x, i) => `F${i + 1}: Fx = ${fmt(x[0])}·cos ${fmt(x[1], 1)}° = ${fmt(x[2])} kN ; Fy = ${fmt(x[0])}·sin ${fmt(x[1], 1)}° = ${fmt(x[3])} kN`).join("\n")
          + `\nΣFx = ${fmt(sx)} kN ; ΣFy = ${fmt(sy)} kN\nR = √(ΣFx² + ΣFy²) = ${fmt(R)} kN\nθ = atan2(ΣFy, ΣFx) = ${fmt(th, 1)}° (kuadran ${kuad})`;
        return {
          nilai: { R, theta: th, konversi: hasilK },
          html: tabel(["Gaya", "F (kN)", "θ (°)", "Fx (kN)", "Fy (kN)"], r.map((x, i) => ["F" + (i + 1), fmt(x[0]), fmt(x[1], 1), fmt(x[2]), fmt(x[3])]).concat([["<b>Σ</b>", "", "", `<b>${fmt(sx)}</b>`, `<b>${fmt(sy)}</b>`]]))
            + `<p><b>Resultan R = ${fmt(R)} kN, θ = ${fmt(th, 1)}°</b> (kuadran ${kuad}). Konversi: ${fmt(kv)} ${v.kd} = <b>${fmt(hasilK, 3)} ${v.kk}</b></p><div class="langkah">${esc(langkah)}</div>${svg}`,
          teks: langkah + `\nKonversi: ${kv} ${v.kd} = ${fmt(hasilK, 3)} ${v.kk}`,
          csv: "gaya;F (kN);theta (deg);Fx (kN);Fy (kN)\n" + r.map((x, i) => `F${i + 1};${x.map(y => fmt(y, 4)).join(";")}`).join("\n") + `\nSigma;;;${fmt(sx, 4)};${fmt(sy, 4)}\nR;${fmt(R, 4)};${fmt(th, 2)};;`
        };
      },
      [{ nama: "Contoh 1.6 (tiga gaya)", v: { gaya: "10 0\n8 60\n6 150", kv: "1", kd: "kN", kk: "kN" }, cek: [["R", 13.27], ["theta", 48.43]] },
       { nama: "Contoh 1.5 (dua gaya, apit 60°)", v: { gaya: "4 0\n3 60", kv: "1", kd: "kN", kk: "kN" }, cek: [["R", 6.08]] },
       { nama: "Contoh 1.7 (kuadran III)", v: { gaya: "12 0\n15 90\n10 225", kv: "1", kd: "kN", kk: "kN" }, cek: [["R", 9.34], ["theta", 58.13]] },
       { nama: "Contoh 1.1 (1.000 kg air)", v: { gaya: "1 0", kv: "1000", kd: "kg (massa→berat)", kk: "kN" }, cek: [["konversi", 9.81]] }],
      [{ nama: "Contoh 1.6", v: { gaya: "10 0\n8 60\n6 150" } }, { nama: "Contoh 1.7", v: { gaya: "12 0\n15 90\n10 225" } }, { nama: "Kabel tiang lampu (Contoh 1.3)", v: { gaya: "5 300" } }]);
  }

  // =========================================================
  // 2. MOMEN & RESULTAN GAYA SEJAJAR (Bab 2)
  // =========================================================
  function resultanBeban(daftar) { // beban ke bawah positif
    return daftar.map(b => {
      if (b.t === "P") return { R: b.P, x: b.x, ket: `P = ${fmt(b.P)} kN @ x = ${fmt(b.x)} m` };
      const L = b.x2 - b.x1, R = (b.q1 + b.q2) / 2 * L;
      const x = Math.abs(b.q1 + b.q2) < 1e-12 ? (b.x1 + b.x2) / 2 : b.x1 + L * (b.q1 + 2 * b.q2) / (3 * (b.q1 + b.q2));
      return { R, x, ket: `q ${fmt(b.q1)}→${fmt(b.q2)} kN/m pada ${fmt(b.x1)}–${fmt(b.x2)} m → R = ${fmt(R)} kN @ x = ${fmt(x)} m` };
    });
  }
  function bacaBeban(teks, Lmaks) {
    return baris(teks).map((l, i) => {
      const w = kata(l), t = (w[0] || "").toUpperCase();
      const cekX = x => { if (Lmaks !== undefined && (x < -1e-9 || x > Lmaks + 1e-9)) throw new Error(`Baris beban ${i + 1}: posisi harus di antara 0 dan ${fmt(Lmaks)} m.`); return x; };
      if (t === "P") { if (w.length < 3) throw new Error(`Baris beban ${i + 1}: format “P x besar”.`); return { t: "P", x: cekX(num(w[1])), P: num(w[2]) }; }
      if (t === "Q") { if (w.length < 4) throw new Error(`Baris beban ${i + 1}: format “q x1 x2 q1 [q2]”.`); const x1 = cekX(num(w[1])), x2 = cekX(num(w[2])); if (x2 <= x1) throw new Error(`Baris beban ${i + 1}: x2 harus lebih besar dari x1.`); const q1 = num(w[3]); return { t: "q", x1, x2, q1, q2: w[4] !== undefined ? num(w[4]) : q1 }; }
      if (t === "M") { if (w.length < 3) throw new Error(`Baris beban ${i + 1}: format “M x nilai” (kopel ↺ positif).`); return { t: "M", x: cekX(num(w[1])), C: num(w[2]) }; }
      throw new Error(`Baris beban ${i + 1}: awali dengan P, q, atau M.`);
    });
  }
  function kalkMomen(el) {
    pasang(el, "Momen Gaya (Varignon) & Resultan Gaya Sejajar",
      `<div class="grid-input">${inp("F", "A. Gaya F (kN)", "10")}${inp("th", "Sudut θ (°)", "53.13")}${inp("x", "Titik tangkap x (m)", "3")}${inp("y", "Titik tangkap y (m)", "2")}
       ${area("beban", "B. Beban sejajar pada balok (ke bawah positif): “P x besar” atau “q x1 x2 q1 [q2]”", "P 1 10\nP 3 20\nP 5 15", "Contoh beban merata: q 0 5 4 • beban segitiga: q 0 3 0 6")}</div>`,
      v => {
        const F = num(v.F), th = num(v.th), x = num(v.x), y = num(v.y);
        const Fx = F * Math.cos(th * Math.PI / 180), Fy = F * Math.sin(th * Math.PI / 180), M = x * Fy - y * Fx;
        const b = bacaBeban(v.beban).filter(q => q.t !== "M");
        const rs = resultanBeban(b); const R = rs.reduce((a, r) => a + r.R, 0), Mx = rs.reduce((a, r) => a + r.R * r.x, 0);
        if (b.length && Math.abs(R) < 1e-12) throw new Error("Jumlah beban nol – letak resultan tidak terdefinisi.");
        const xbar = b.length ? Mx / R : 0;
        const langkah = `A. Fx = ${fmt(Fx)} kN ; Fy = ${fmt(Fy)} kN\n   M_O = x·Fy − y·Fx = ${fmt(x)}·${fmt(Fy)} − ${fmt(y)}·${fmt(Fx)} = ${fmt(M)} kN·m (${M >= 0 ? "↺" : "↻"})\nB. ` + rs.map(r => r.ket).join("\n   ") + `\n   R = ΣF = ${fmt(R)} kN ; ΣF·x = ${fmt(Mx)} kN·m ; x̄ = ${fmt(xbar)} m`;
        return { nilai: { M, R, xbar }, html: `<p><b>M_O = ${fmt(M)} kN·m</b> (${M >= 0 ? "berlawanan jarum jam" : "searah jarum jam"}) • <b>R = ${fmt(R)} kN</b> di <b>x̄ = ${fmt(xbar)} m</b></p><div class="langkah">${esc(langkah)}</div>`, teks: langkah, csv: "besaran;nilai\nM_O (kN.m);" + fmt(M, 4) + "\nR (kN);" + fmt(R, 4) + "\nxbar (m);" + fmt(xbar, 4) };
      },
      [{ nama: "Contoh 2.3 (Fx = 6, Fy = 8 di (3; 2))", v: { F: "10", th: "53.130102", x: "3", y: "2", beban: "P 0 1" }, cek: [["M", 12]] },
       { nama: "Contoh 2.2/2.4 (5 kN, 330°, di (2; 0))", v: { F: "5", th: "330", x: "2", y: "0", beban: "P 0 1" }, cek: [["M", -5]] },
       { nama: "Contoh 2.7 (tiga beban titik)", v: { F: "1", th: "0", x: "0", y: "0", beban: "P 1 10\nP 3 20\nP 5 15" }, cek: [["R", 45], ["xbar", 3.2222]] },
       { nama: "Contoh 2.8b (segitiga 0→6, L = 3)", v: { F: "1", th: "0", x: "0", y: "0", beban: "q 0 3 0 6" }, cek: [["R", 9], ["xbar", 2]] }],
      [{ nama: "Contoh 2.7", v: { beban: "P 1 10\nP 3 20\nP 5 15" } }, { nama: "Contoh 2.8a (merata 4 kN/m, 5 m)", v: { beban: "q 0 5 4" } }, { nama: "Contoh 2.10 (pompa + tandon)", v: { beban: "P 1 6\nP 2.5 12" } }]);
  }

  // =========================================================
  // 3. PEMERIKSA KESETIMBANGAN (Bab 3)
  // =========================================================
  function kalkSetimbang(el) {
    pasang(el, "Pemeriksa Kesetimbangan (ΣFx, ΣFy, ΣM)",
      `<div class="grid-input">${area("gaya", "Gaya pada DBB: “F Fx Fy x y” (kN, m; + ke kanan/atas) • kopel: “M nilai” (kN·m, ↺ +)", "F 0 -12 2 0\nF 0 8 0 0\nF 0 4 6 0", "Masukkan beban DAN reaksi hasil hitunganmu.")}${inp("x0", "Titik acuan momen x₀ (m)", "0")}${inp("y0", "y₀ (m)", "0")}</div>`,
      v => {
        const x0 = num(v.x0), y0 = num(v.y0); let sx = 0, sy = 0, sm = 0; const rinci = [];
        baris(v.gaya).forEach((l, i) => {
          const w = kata(l), t = w[0].toUpperCase();
          if (t === "F") { if (w.length < 5) throw new Error(`Baris ${i + 1}: format “F Fx Fy x y”.`); const [fx, fy, x, y] = w.slice(1, 5).map(num); sx += fx; sy += fy; const m = (x - x0) * fy - (y - y0) * fx; sm += m; rinci.push(`F${i + 1}: Fx=${fmt(fx)} Fy=${fmt(fy)} M=${fmt(m)}`); }
          else if (t === "M") { const c = num(w[1]); sm += c; rinci.push(`Kopel ${fmt(c)} kN·m`); }
          else throw new Error(`Baris ${i + 1}: awali dengan F atau M.`);
        });
        const st = (val, nama, saran) => Math.abs(val) <= 0.01 ? `<span class="ok">${nama} = ${fmt(val)} ✓</span>` : `<span class="nok">${nama} = ${fmt(val)} ✗</span> – ${saran}`;
        const html = `<p>${st(sx, "ΣFx", "periksa reaksi horizontal (sendi).")}<br>${st(sy, "ΣFy", "periksa arah atau besar reaksi vertikal.")}<br>${st(sm, "ΣM", "periksa lengan momen dan tanda (↺ +).")}</p><div class="langkah">${esc(rinci.join("\n"))}</div>`;
        return { nilai: { sx, sy, sm }, html, teks: rinci.join("\n") + `\nΣFx=${fmt(sx)} ΣFy=${fmt(sy)} ΣM=${fmt(sm)}`, csv: `SFx;${fmt(sx, 4)}\nSFy;${fmt(sy, 4)}\nSM;${fmt(sm, 4)}` };
      },
      [{ nama: "Contoh 3.3 (reaksi benar)", v: { gaya: "F 0 -12 2 0\nF 0 8 0 0\nF 0 4 6 0", x0: "0", y0: "0" }, cek: [["sx", 0], ["sy", 0], ["sm", 0]] },
       { nama: "Contoh 3.4 (beban miring)", v: { gaya: "F 7.0711 -7.0711 3 0\nF -7.0711 2.8284 0 0\nF 0 4.2426 5 0", x0: "0", y0: "0" }, cek: [["sx", 0], ["sy", 0], ["sm", 0]] },
       { nama: "Contoh 3.3 dengan RB salah (5 kN)", v: { gaya: "F 0 -12 2 0\nF 0 8 0 0\nF 0 5 6 0", x0: "0", y0: "0" }, cek: [["sy", 1], ["sm", 6]] }],
      null);
  }

  // =========================================================
  // 4. BALOK UMUM (sederhana, kantilever, overhang, Gerber) – Bab 4–7
  // =========================================================
  function analisisBalok(L, tumpuan, sendiDalam, beban) {
    // gaya terpusat ke atas positif; beban input ke bawah positif
    const unk = []; tumpuan.forEach(t => { unk.push({ jenis: "V", x: t.x, t }); if (t.j === "jepit") unk.push({ jenis: "M", x: t.x, t }); });
    const nEq = 2 + sendiDalam.length;
    if (unk.length < nEq) throw new Error(`Struktur labil: jumlah reaksi (${unk.length}) kurang dari 2 + jumlah sendi dalam (${nEq}).`);
    if (unk.length > nEq) throw new Error(`Struktur statis tak tentu (reaksi ${unk.length} > ${nEq}); di luar cakupan Mekanika Teknik 1.`);
    // gaya dan momen akibat beban yang berada di kiri x (terhadap x)
    function kiri(x) { // mengembalikan [ΣFy beban (↑+), ΣM beban terhadap x (internal, M = Σ Fy (x − xi) − ΣC)]
      let fy = 0, m = 0;
      beban.forEach(b => {
        if (b.t === "P" && b.x < x) { fy -= b.P; m -= b.P * (x - b.x); }
        else if (b.t === "M" && b.x < x) { m -= b.C; }
        else if (b.t === "q" && b.x1 < x) {
          const a = Math.min(x, b.x2) - b.x1, k = (b.q2 - b.q1) / (b.x2 - b.x1);
          const F = b.q1 * a + k * a * a / 2, mom = (x - b.x1) * F - (b.q1 * a * a / 2 + k * a * a * a / 3);
          fy -= F; m -= mom;
        }
      });
      return [fy, m];
    }
    const total = kiri(L + 1e9)[0]; // ΣFy semua beban (negatif)
    // ΣM terhadap x = 0 dari beban = −(momen internal di x sangat besar) dihitung langsung:
    let mBeban0 = 0; beban.forEach(b => {
      if (b.t === "P") mBeban0 += -b.P * b.x; else if (b.t === "M") mBeban0 += b.C;
      else { const r = resultanBeban([b])[0]; mBeban0 += -r.R * r.x; }
    });
    const A = [], rhs = [];
    A.push(unk.map(u => u.jenis === "V" ? 1 : 0)); rhs.push(-total);                     // ΣFy = 0
    A.push(unk.map(u => u.jenis === "V" ? u.x : 1)); rhs.push(-mBeban0);                 // ΣM(0) = 0
    sendiDalam.forEach(xh => { A.push(unk.map(u => u.x < xh ? (u.jenis === "V" ? (xh - u.x) : -1) : 0)); rhs.push(-kiri(xh)[1]); }); // M(xh) = 0
    const sol = selesaikan(A, rhs);
    if (!sol) throw new Error("Struktur labil secara geometri (persamaan tidak dapat diselesaikan). Periksa letak tumpuan dan sendi dalam.");
    unk.forEach((u, i) => (u.nilai = sol[i]));
    const VM = x => { let [fy, m] = kiri(x); unk.forEach(u => { if (u.x < x) { if (u.jenis === "V") { fy += u.nilai; m += u.nilai * (x - u.x); } else m -= u.nilai; } }); return [fy, m]; };
    // titik sampel
    const kritis = new Set([0, L]); tumpuan.forEach(t => kritis.add(t.x)); sendiDalam.forEach(x => kritis.add(x));
    beban.forEach(b => { if (b.t === "q") { kritis.add(b.x1); kritis.add(b.x2); } else kritis.add(b.x); });
    let xs = []; for (let i = 0; i <= 800; i++) xs.push(L * i / 800);
    kritis.forEach(x => { xs.push(Math.max(0, x - 1e-7)); xs.push(Math.min(L, x + 1e-7)); });
    xs = Array.from(new Set(xs.map(x => +x.toFixed(9)))).sort((a, b) => a - b);
    const V = [], M = []; xs.forEach(x => { const r = VM(x + 1e-12); V.push(r[0]); M.push(r[1]); });
    // ekstrem & titik nol
    let iMax = 0, iMin = 0; M.forEach((m, i) => { if (m > M[iMax]) iMax = i; if (m < M[iMin]) iMin = i; });
    const nolM = [], nolV = [];
    for (let i = 1; i < xs.length; i++) {
      if (M[i - 1] * M[i] < 0) { const x = xs[i - 1] + (xs[i] - xs[i - 1]) * M[i - 1] / (M[i - 1] - M[i]); if (x > 1e-3 && x < L - 1e-3) nolM.push(x); }
      if (V[i - 1] * V[i] < 0 && Math.abs(V[i - 1] - V[i]) < 1e3 && xs[i] - xs[i - 1] > 1e-6) nolV.push(xs[i - 1] + (xs[i] - xs[i - 1]) * V[i - 1] / (V[i - 1] - V[i]));
    }
    const cekFy = unk.filter(u => u.jenis === "V").reduce((a, u) => a + u.nilai, 0) + total;
    return { unk, xs, V, M, Mmaks: M[iMax], xMmaks: xs[iMax], Mmin: M[iMin], xMmin: xs[iMin], nolM, nolV, cekFy, VM, A, rhs };
  }
  function gambarBalok(L, tumpuan, sendiDalam, beban) {
    const W = 640, sx = x => 30 + x / L * (W - 60);
    let s = `<svg class="grafik" viewBox="0 0 ${W} 120" role="img" aria-label="Sketsa balok dan beban"><defs><marker id="ab" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 0L5 10z" fill="#F26622"/></marker></defs><line x1="${sx(0)}" x2="${sx(L)}" y1="60" y2="60" stroke="currentColor" stroke-width="5"/>`;
    tumpuan.forEach(t => { const x = sx(t.x); s += t.j === "sendi" ? `<path d="M${x} 63l-9 15h18z" fill="#0B3C5D"/>` : t.j === "rol" ? `<circle cx="${x}" cy="71" r="8" fill="none" stroke="#0B3C5D" stroke-width="2"/>` : `<rect x="${x - 4}" y="40" width="8" height="40" fill="#0B3C5D"/>`; s += `<text x="${x}" y="98" font-size="13" text-anchor="middle" fill="currentColor">${t.j}</text>`; });
    sendiDalam.forEach(x => (s += `<circle cx="${sx(x)}" cy="60" r="6" fill="#fff" stroke="#F26622" stroke-width="2.5"/>`));
    beban.forEach(b => {
      if (b.t === "P") s += `<line x1="${sx(b.x)}" x2="${sx(b.x)}" y1="12" y2="55" stroke="#F26622" stroke-width="2" marker-end="url(#ab)"/><text x="${sx(b.x) + 4}" y="14" font-size="14" fill="#B3470F">${fmt(b.P, 1)}</text>`;
      else if (b.t === "q") { const qm = Math.max(Math.abs(b.q1), Math.abs(b.q2), 1e-9); const h = q => 10 + 30 * Math.abs(q) / qm; s += `<path d="M${sx(b.x1)} ${55 - h(b.q1)}L${sx(b.x2)} ${55 - h(b.q2)}" stroke="#00796B" fill="none"/>`; for (let k = 0; k <= 6; k++) { const x = b.x1 + (b.x2 - b.x1) * k / 6, q = b.q1 + (b.q2 - b.q1) * k / 6; s += `<line x1="${sx(x)}" x2="${sx(x)}" y1="${55 - h(q)}" y2="56" stroke="#00796B"/>`; } s += `<text x="${sx((b.x1 + b.x2) / 2)}" y="${50 - h(Math.max(b.q1, b.q2))}" font-size="14" text-anchor="middle" fill="#00796B">q=${fmt(b.q1, 1)}${b.q2 !== b.q1 ? "→" + fmt(b.q2, 1) : ""}</text>`; }
      else s += `<text x="${sx(b.x)}" y="40" font-size="12" text-anchor="middle" fill="#5B2FD6">${b.C >= 0 ? "↺" : "↻"}${fmt(Math.abs(b.C), 1)}</text>`;
    });
    return s + "</svg>";
  }
  function kalkBalok(el, mode) {
    const PRE = {
      balok: [
        { nama: "Contoh 4.2 – dua beban titik", v: { L: "6", tumpuan: "sendi 0\nrol 6", sendi: "", beban: "P 2 10\nP 4.5 6", mizin: "" } },
        { nama: "Contoh 4.3/5.4 – merata + titik", v: { L: "5", tumpuan: "sendi 0\nrol 5", sendi: "", beban: "q 0 5 4\nP 3 8", mizin: "" } },
        { nama: "Contoh 4.4/6.3 – beban segitiga", v: { L: "6", tumpuan: "sendi 0\nrol 6", sendi: "", beban: "q 0 6 0 6", mizin: "" } },
        { nama: "Contoh 4.6 – kanopi kantilever", v: { L: "1.5", tumpuan: "jepit 0", sendi: "", beban: "q 0 1.5 4.34\nP 1.5 1.0", mizin: "" } },
        { nama: "Contoh 6.1 – overhang merata", v: { L: "8", tumpuan: "sendi 0\nrol 6", sendi: "", beban: "q 0 8 5", mizin: "" } },
        { nama: "Contoh 6.2 – overhang + beban ujung", v: { L: "5.5", tumpuan: "sendi 0\nrol 4", sendi: "", beban: "q 0 4 3\nP 5.5 6", mizin: "" } },
        { nama: "Contoh 6.4 – trapesium 2→5", v: { L: "6", tumpuan: "sendi 0\nrol 6", sendi: "", beban: "q 0 6 2 5", mizin: "" } },
        { nama: "Case Method 2 – Opsi A (tandon tengah)", v: { L: "6.5", tumpuan: "sendi 0\nrol 5", sendi: "", beban: "q 0 6.5 12\nP 2.5 10.2", mizin: "40 30" } },
        { nama: "Case Method 2 – Opsi B (ujung teras)", v: { L: "6.5", tumpuan: "sendi 0\nrol 5", sendi: "", beban: "q 0 6.5 12\nP 6.5 10.2", mizin: "40 30" } },
        { nama: "Case Method 2 – Opsi C (di atas kolom)", v: { L: "6.5", tumpuan: "sendi 0\nrol 5", sendi: "", beban: "q 0 6.5 12\nP 5 10.2", mizin: "40 30" } }],
      gerber: [
        { nama: "Contoh 7.2 – Gerber 2 bentang", v: { L: "12", tumpuan: "sendi 0\nrol 6\nrol 12", sendi: "8", beban: "q 0 12 4", mizin: "" } },
        { nama: "Contoh 7.3 – Gerber 3 bentang", v: { L: "16", tumpuan: "sendi 0\nrol 5\nrol 11\nrol 16", sendi: "6.5 9.5", beban: "P 2.5 12\nP 8 10\nP 13.5 12", mizin: "" } }]
    };
    const pre = PRE[mode];
    pasang(el, mode === "gerber" ? "Balok Gerber (sendi dalam)" : "Reaksi Tumpuan, SFD & BMD Balok",
      `<div class="grid-input">${inp("L", "Panjang balok L (m)", "6")}
       ${area("tumpuan", "Tumpuan: satu baris “jenis x” – jenis: sendi, rol, jepit", "sendi 0\nrol 6")}
       ${inp("sendi", "Sendi dalam x (m), pisahkan spasi (kosongkan bila tidak ada)", "")}
       ${inp("mizin", "Kapasitas izin M+ dan M− (kN·m), opsional", "")}
       ${area("beban", "Beban (ke bawah positif): “P x besar” • “q x1 x2 q1 [q2]” • kopel “M x nilai” (↺ +)", "P 2 10\nP 4.5 6")}</div>`,
      v => {
        const L = num(v.L); if (!(L > 0 && L <= 60)) throw new Error("Panjang balok harus 0–60 m.");
        const tumpuan = baris(v.tumpuan).map((l, i) => { const w = kata(l); const j = (w[0] || "").toLowerCase(); if (!["sendi", "rol", "jepit"].includes(j)) throw new Error(`Tumpuan baris ${i + 1}: jenis harus sendi, rol, atau jepit.`); const x = num(w[1]); if (x < 0 || x > L) throw new Error(`Tumpuan baris ${i + 1}: posisi harus 0–${fmt(L)} m.`); return { j, x }; });
        if (!tumpuan.length) throw new Error("Isi minimal satu tumpuan.");
        const sd = (v.sendi || "").trim() ? kata(v.sendi).map(num) : [];
        sd.forEach(x => { if (x <= 0 || x >= L) throw new Error("Sendi dalam harus di dalam bentang."); });
        const beban = bacaBeban(v.beban, L); if (!beban.length) throw new Error("Isi minimal satu beban.");
        const r = analisisBalok(L, tumpuan, sd, beban);
        const rs = resultanBeban(beban.filter(b => b.t !== "M"));
        const reak = r.unk.map(u => [u.jenis === "V" ? `R (${u.t.j}) @ x = ${fmt(u.x)} m` : `M jepit @ x = ${fmt(u.x)} m`, u.jenis === "V" ? `${fmt(u.nilai)} kN ${u.nilai >= 0 ? "↑" : "↓"}` : `${fmt(u.nilai)} kN·m ${u.nilai >= 0 ? "↺" : "↻"}`]);
        const titik = Array.from(new Set([0, L].concat(tumpuan.map(t => t.x), sd, beban.filter(b => b.t !== "q").map(b => b.x), r.nolV))).sort((a, b) => a - b);
        const tabelTitik = titik.map(x => { const kiri = r.VM(x - 1e-7), kanan = r.VM(x + 1e-7); return [fmt(x), fmt(kiri[0]) + (Math.abs(kiri[0] - kanan[0]) > 1e-6 ? " / " + fmt(kanan[0]) : ""), fmt((kiri[1] + kanan[1]) / 2)]; });
        let izin = ""; const mi = (v.mizin || "").trim() ? kata(v.mizin).map(num) : null;
        if (mi) { const p = r.Mmaks / mi[0] * 100, n = mi[1] ? Math.abs(r.Mmin) / mi[1] * 100 : 0; const w = x => x > 100 ? "nok" : x > 90 ? "" : "ok"; izin = `<p>Rasio terhadap kapasitas: lapangan <span class="${w(p)}">${fmt(p, 0)}%</span>${mi[1] ? ` • tumpuan <span class="${w(n)}">${fmt(n, 0)}%</span>` : ""} ${p > 100 || n > 100 ? '<span class="nok">→ melampaui kapasitas</span>' : '<span class="ok">→ dalam batas</span>'}</p>`; }
        const langkah = "Resultan beban:\n  " + (rs.map(x => x.ket).join("\n  ") || "-") +
          `\nPersamaan: ΣFy = 0 ; ΣM(x=0) = 0${sd.length ? " ; M = 0 di sendi dalam x = " + sd.map(x => fmt(x)).join(", ") : ""}` +
          "\nHasil reaksi:\n  " + reak.map(x => x.join(" = ")).join("\n  ") +
          `\nPemeriksaan ΣFy = ${fmt(r.cekFy, 4)} ${Math.abs(r.cekFy) < 1e-6 ? "✓" : "✗"}` +
          `\nM maks (+) = ${fmt(r.Mmaks)} kN·m @ x = ${fmt(r.xMmaks)} m ; M min (−) = ${fmt(r.Mmin)} kN·m @ x = ${fmt(r.xMmin)} m` +
          (r.nolV.length ? `\nV = 0 di x = ${r.nolV.map(x => fmt(x)).join("; ")} m` : "") + (r.nolM.length ? `\nTitik momen nol di x = ${r.nolM.map(x => fmt(x)).join("; ")} m` : "") +
          (sd.length ? "\nM di sendi dalam: " + sd.map(x => fmt(r.VM(x)[1], 4)).join("; ") + " (harus 0)" : "");
        let csv = "x (m);V (kN);M (kN.m)\n"; for (let x = 0; x <= L + 1e-9; x += Math.max(L / 100, 0.05)) { const q = r.VM(Math.min(x, L - 1e-9) + 1e-9); csv += `${fmt(x, 3)};${fmt(q[0], 4)};${fmt(q[1], 4)}\n`; }
        const sm = n => n.filter((_, i) => i % 3 === 0 || i === n.length - 1);
        return {
          nilai: Object.assign({ Mmaks: r.Mmaks, Mmin: r.Mmin, xMmaks: r.xMmaks, nolM: r.nolM[0] || 0 }, ...r.unk.map((u, i) => ({ ["R" + (i + 1)]: u.nilai }))),
          html: tabel(["Reaksi", "Nilai"], reak) + `<p><b>M maks = ${fmt(r.Mmaks)} kN·m</b> @ x = ${fmt(r.xMmaks)} m • <b>M min = ${fmt(r.Mmin)} kN·m</b> @ x = ${fmt(r.xMmin)} m${r.nolM.length ? " • momen nol @ " + r.nolM.map(x => fmt(x)).join("; ") + " m" : ""}</p>${izin}`
            + gambarBalok(L, tumpuan, sd, beban)
            + grafik(sm(r.xs), sm(r.V), { judul: "SFD – gaya lintang V (kN)", warna: "#006A7A" })
            + grafik(sm(r.xs), sm(r.M), { judul: "BMD – momen M (kN·m), positif digambar di bawah", warna: "#5B2FD6", balik: true, label: [[r.xMmaks, r.Mmaks, fmt(r.Mmaks)], [r.xMmin, r.Mmin, Math.abs(r.Mmin) > 1e-6 ? fmt(r.Mmin) : ""]] })
            + tabel(["x (m)", "V (kN) kiri/kanan", "M (kN·m)"], tabelTitik) + `<div class="langkah">${esc(langkah)}</div>`,
          teks: langkah, csv
        };
      },
      mode === "gerber" ? [
        { nama: "Contoh 7.2", v: pre[0].v, cek: [["R1", 8], ["R2", 32], ["R3", 8], ["Mmin", -24], ["Mmaks", 8]] },
        { nama: "Contoh 7.3", v: pre[1].v, cek: [["R1", 4.5], ["R2", 12.5], ["R3", 12.5], ["R4", 4.5], ["Mmaks", 11.25], ["Mmin", -7.5]] },
        { nama: "Contoh 7.1(c): sendi + rol + 2 sendi dalam (labil)", v: { L: "6", tumpuan: "sendi 0\nrol 6", sendi: "2 4", beban: "P 3 10", mizin: "" }, galat: true }] : [
        { nama: "Contoh 4.2", v: PRE.balok[0].v, cek: [["R1", 8.1667], ["R2", 7.8333]] },
        { nama: "Contoh 4.3/5.4", v: PRE.balok[1].v, cek: [["R1", 13.2], ["R2", 14.8], ["Mmaks", 21.6]] },
        { nama: "Contoh 4.4/6.3 (segitiga)", v: PRE.balok[2].v, cek: [["R1", 6], ["R2", 12], ["Mmaks", 13.856]] },
        { nama: "Contoh 4.6 (kanopi)", v: PRE.balok[3].v, cek: [["R1", 7.51], ["R2", 6.3825], ["Mmin", -6.3825]] },
        { nama: "Contoh 6.1 (overhang)", v: PRE.balok[4].v, cek: [["R1", 13.3333], ["R2", 26.6667], ["Mmaks", 17.7778], ["Mmin", -10], ["nolM", 5.3333]] },
        { nama: "Contoh 6.4 (trapesium)", v: PRE.balok[6].v, cek: [["R1", 9], ["R2", 12], ["Mmaks", 15.83]] },
        { nama: "Case Method 2 – Opsi B", v: PRE.balok[8].v, cek: [["R1", 24.24], ["Mmaks", 24.482], ["Mmin", -28.8]] }],
      pre);
  }

  // =========================================================
  // 5. PORTAL (L, sendi–rol, tiga sendi datar/pelana) – Bab 8–9
  // =========================================================
  function analisisPortal(nodes, tump, sendi, gayaTitik, qBatang) {
    // nodes: [[x,y],...] lintasan; tump: [jenis awal, jenis akhir]; sendi: {x,y}|null
    // gayaTitik: [{p:[x,y], F:[fx,fy]}]; qBatang: [{i, q}] beban vertikal per proyeksi horizontal (ke bawah +)
    const pj = []; let s0 = 0; for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i], b = nodes[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); pj.push({ a, b, L, s0, t: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }); s0 += L; }
    const posS = p => { let best = 0, d = 1e18; pj.forEach(m => { const u = Math.max(0, Math.min(m.L, (p[0] - m.a[0]) * m.t[0] + (p[1] - m.a[1]) * m.t[1])); const q = [m.a[0] + m.t[0] * u, m.a[1] + m.t[1] * u]; const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < d - 1e-12) { d = dd; best = m.s0 + u; } }); return best; };
    const F = []; // {s, p, F}
    gayaTitik.forEach(g => F.push({ s: posS(g.p), p: g.p, F: g.F }));
    qBatang.forEach(({ i, q }) => { const m = pj[i], n = 200, dx = Math.abs(m.b[0] - m.a[0]); for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; F.push({ s: m.s0 + m.L * u, p: [m.a[0] + (m.b[0] - m.a[0]) * u, m.a[1] + (m.b[1] - m.a[1]) * u], F: [0, -q * dx / n] }); } });
    const unk = []; const ends = [[nodes[0], 0], [nodes[nodes.length - 1], s0]];
    tump.forEach((j, k) => { const [p, s] = ends[k]; if (j === "jepit" || j === "sendi") { unk.push({ k, j, arah: "H", p, s }); unk.push({ k, j, arah: "V", p, s }); } if (j === "rol") unk.push({ k, j, arah: "V", p, s }); if (j === "jepit") unk.push({ k, j, arah: "M", p, s }); });
    const nEq = 3 + (sendi ? 1 : 0);
    if (unk.length !== nEq) throw new Error(unk.length < nEq ? "Portal labil: reaksi kurang." : "Portal statis tak tentu: di luar cakupan.");
    const kol = u => (p0, idx) => u.arah === "H" ? [1, 0, -(u.p[1] - p0[1])][idx] : u.arah === "V" ? [0, 1, (u.p[0] - p0[0])][idx] : [0, 0, 1][idx];
    const A = [[], [], []], b = [0, 0, 0];
    unk.forEach(u => { for (let r = 0; r < 3; r++) A[r].push(kol(u)([0, 0], r)); });
    F.forEach(f => { b[0] -= f.F[0]; b[1] -= f.F[1]; b[2] -= f.p[0] * f.F[1] - f.p[1] * f.F[0]; });
    if (sendi) { const sh = posS([sendi.x, sendi.y]); const ph = [sendi.x, sendi.y]; A.push(unk.map(u => u.s < sh ? kol(u)(ph, 2) : 0)); let m = 0; F.forEach(f => { if (f.s < sh) m += (f.p[0] - ph[0]) * f.F[1] - (f.p[1] - ph[1]) * f.F[0]; }); b.push(-m); }
    const sol = selesaikan(A, b); if (!sol) throw new Error("Portal labil secara geometri.");
    unk.forEach((u, i) => (u.nilai = sol[i]));
    unk.forEach(u => { if (u.arah === "M") F.push({ s: u.s, p: u.p, F: [0, 0], C: u.nilai }); else F.push({ s: u.s, p: u.p, F: u.arah === "H" ? [u.nilai, 0] : [0, u.nilai] }); });
    // gaya dalam sepanjang lintasan
    const titik = [];
    pj.forEach((m, mi) => { for (let k = 0; k <= 240; k++) { const u = m.L * k / 240; const s = m.s0 + u + (k === 0 ? 1e-9 : k === 240 ? -1e-9 : 0); const P = [m.a[0] + m.t[0] * u, m.a[1] + m.t[1] * u]; let Mi = 0, Fs = [0, 0]; F.forEach(f => { if (f.s < s) { Mi += (f.p[0] - P[0]) * f.F[1] - (f.p[1] - P[1]) * f.F[0] + (f.C || 0); Fs[0] += f.F[0]; Fs[1] += f.F[1]; } }); const nr = [m.t[1], -m.t[0]]; titik.push({ mi, P, M: -Mi, N: -(Fs[0] * m.t[0] + Fs[1] * m.t[1]), V: -(Fs[0] * nr[0] + Fs[1] * nr[1]), nr }); } });
    return { unk, titik, pj };
  }
  function gambarPortal(nodes, titik, pj, tump, sendi) {
    const xs0 = nodes.map(n => n[0]), ys0 = nodes.map(n => n[1]);
    const bentang = Math.max(Math.max(...xs0) - Math.min(...xs0), Math.max(...ys0) - Math.min(...ys0));
    const mAbs = Math.max(...titik.map(t => Math.abs(t.M)), 1e-9), skM = 0.2 * bentang / mAbs;
    const semua = titik.map(t => [t.P[0] + t.nr[0] * t.M * skM, t.P[1] + t.nr[1] * t.M * skM]).concat(nodes);
    const pad = 0.06 * bentang;
    const mx = Math.min(...semua.map(q => q[0])) - pad, Mx = Math.max(...semua.map(q => q[0])) + pad, my = Math.min(...semua.map(q => q[1])) - pad - 0.05 * bentang, My = Math.max(...semua.map(q => q[1])) + pad;
    const W = 640, H = Math.round(Math.max(220, Math.min(520, W * (My - my) / (Mx - mx)))); const sk = Math.min(W / (Mx - mx), H / (My - my));
    const X = x => (x - mx) * sk + (W - (Mx - mx) * sk) / 2, Y = y => H - (y - my) * sk - (H - (My - my) * sk) / 2;
    let s = `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Portal dan diagram momen di sisi tarik">`;
    pj.forEach((m, mi) => { const tt = titik.filter(t => t.mi === mi); const Q = tt.map(t => [t.P[0] + t.nr[0] * t.M * skM, t.P[1] + t.nr[1] * t.M * skM]); const d = tt.map((t, i) => (i ? "L" : "M") + X(t.P[0]).toFixed(1) + " " + Y(t.P[1]).toFixed(1)).join("") + Q.slice().reverse().map(q => "L" + X(q[0]).toFixed(1) + " " + Y(q[1]).toFixed(1)).join("") + "Z"; s += `<path d="${d}" fill="#7C4DFF" fill-opacity=".2" stroke="#5B2FD6" stroke-width="1.4"/>`; });
    s += `<polyline points="${nodes.map(n => X(n[0]) + "," + Y(n[1])).join(" ")}" fill="none" stroke="currentColor" stroke-width="4"/>`;
    [[nodes[0], tump[0]], [nodes[nodes.length - 1], tump[1]]].forEach(([p, j]) => { const x = X(p[0]), y = Y(p[1]); s += j === "sendi" ? `<path d="M${x} ${y + 2}l-9 15h18z" fill="#0B3C5D"/>` : j === "rol" ? `<circle cx="${x}" cy="${y + 9}" r="7" fill="none" stroke="#0B3C5D" stroke-width="2"/>` : j === "jepit" ? `<rect x="${x - 14}" y="${y}" width="28" height="6" fill="#0B3C5D"/>` : ""; });
    if (sendi) s += `<circle cx="${X(sendi.x)}" cy="${Y(sendi.y)}" r="6" fill="#fff" stroke="#F26622" stroke-width="2.5"/>`;
    // label nilai di ujung batang & ekstrem
    const lab = []; pj.forEach((m, mi) => { const tt = titik.filter(t => t.mi === mi); [tt[0], tt[tt.length - 1], tt.reduce((a, t) => Math.abs(t.M) > Math.abs(a.M) ? t : a, tt[0])].forEach(t => { if (Math.abs(t.M) > 0.05 && !lab.some(l => Math.hypot(l.P[0] - t.P[0], l.P[1] - t.P[1]) < 0.4)) lab.push(t); }); });
    lab.forEach(t => { const q = [t.P[0] + t.nr[0] * t.M * skM, t.P[1] + t.nr[1] * t.M * skM]; s += `<text x="${X(q[0])}" y="${Y(q[1])}" font-size="15" text-anchor="middle" fill="#5B2FD6" stroke="var(--bg)" stroke-width="3" paint-order="stroke">${fmt(Math.abs(t.M))}</text>`; });
    return s + "</svg>";
  }
  function kalkPortal(el, mode) {
    const opsi = mode === "portal3" ? [["tiga-datar", "Portal tiga sendi – balok datar"], ["tiga-pelana", "Portal tiga sendi – atap pelana"]] : [["L", "Portal L (jepit di dasar, balok kantilever)"], ["sendi-rol", "Portal persegi sendi–rol"]];
    pasang(el, mode === "portal3" ? "Portal Tiga Sendi" : "Portal Statis Tertentu",
      `<div class="grid-input"><label style="grid-column:1/-1">Jenis portal<select name="jenis">${opsi.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select></label>
       ${inp("h", "Tinggi kolom h (m)", "4")}${inp("L", "Bentang / panjang balok L (m)", "6")}${inp("f", "Tinggi sendi puncak f (m) – pelana", "6")}
       ${inp("q", "Beban merata balok/atap q (kN/m, proyeksi horizontal)", "3")}${inp("H", "Gaya horizontal di puncak kolom kiri H (kN, → +)", "0")}${inp("P", "Beban titik di ujung balok (portal L) atau tengah balok P (kN)", "0")}
       ${inp("mizin", "Kapasitas momen izin (kN·m), opsional", "")}</div>`,
      v => {
        const h = num(v.h), L = num(v.L), f = num(v.f), q = num(v.q), Hh = num(v.H), P = num(v.P), j = v.jenis;
        if (h <= 0 || L <= 0) throw new Error("Tinggi dan bentang harus lebih dari 0.");
        let nodes, tump, sendi = null, gt = [], qb = [];
        if (j === "L") { nodes = [[L, h], [0, h], [0, 0]]; tump = ["bebas", "jepit"]; if (P) gt.push({ p: [L, h], F: [0, -P] }); if (q) qb.push({ i: 0, q }); if (Hh) gt.push({ p: [0, h], F: [Hh, 0] }); }
        else if (j === "sendi-rol") { nodes = [[0, 0], [0, h], [L, h], [L, 0]]; tump = ["sendi", "rol"]; if (q) qb.push({ i: 1, q }); if (Hh) gt.push({ p: [0, h], F: [Hh, 0] }); if (P) gt.push({ p: [L / 2, h], F: [0, -P] }); }
        else if (j === "tiga-datar") { nodes = [[0, 0], [0, h], [L, h], [L, 0]]; tump = ["sendi", "sendi"]; sendi = { x: L / 2, y: h }; if (q) qb.push({ i: 1, q }); if (Hh) gt.push({ p: [0, h], F: [Hh, 0] }); if (P) gt.push({ p: [L / 2, h], F: [0, -P] }); }
        else { if (f <= h) throw new Error("Untuk atap pelana, f harus lebih besar dari h."); nodes = [[0, 0], [0, h], [L / 2, f], [L, h], [L, 0]]; tump = ["sendi", "sendi"]; sendi = { x: L / 2, y: f }; if (q) { qb.push({ i: 1, q }); qb.push({ i: 2, q }); } if (Hh) gt.push({ p: [0, h], F: [Hh, 0] }); if (P) gt.push({ p: [L / 2, f], F: [0, -P] }); }
        const r = analisisPortal(nodes, tump, sendi, gt, qb);
        const nama = ["kaki kiri", "kaki kanan"]; if (j === "L") nama[1] = "jepit A";
        const reak = r.unk.map(u => [`${u.arah === "M" ? "M" : u.arah} (${nama[u.k]})`, u.arah === "M" ? `${fmt(u.nilai)} kN·m` : `${fmt(u.nilai)} kN ${u.arah === "H" ? (u.nilai >= 0 ? "→" : "←") : (u.nilai >= 0 ? "↑" : "↓")}`]);
        const per = r.pj.map((m, mi) => { const tt = r.titik.filter(t => t.mi === mi); const e = tt.reduce((a, t) => Math.abs(t.M) > Math.abs(a.M) ? t : a, tt[0]); return [`Batang ${mi + 1}`, `${fmt(tt[0].N)} / ${fmt(tt[tt.length - 1].N)}`, `${fmt(tt[0].V)} / ${fmt(tt[tt.length - 1].V)}`, `${fmt(tt[0].M)} / ${fmt(tt[tt.length - 1].M)}`, `${fmt(e.M)}`]; });
        const all = r.titik.map(t => t.M); const Mabs = Math.max(...all.map(Math.abs));
        const Msudut = Math.abs(r.titik.filter(t => t.mi === 0).slice(-1)[0].M);
        const ui = (k, a) => (r.unk.find(u => u.k === k && u.arah === a) || {}).nilai || 0;
        let izin = ""; if ((v.mizin || "").trim()) { const c = num(v.mizin), p = Mabs / c * 100; izin = `<p>|M| terbesar = ${fmt(Mabs)} kN·m → <span class="${p > 100 ? "nok" : "ok"}">${fmt(p, 0)}% kapasitas</span></p>`; }
        const langkah = `Persamaan: ΣFx = 0 ; ΣFy = 0 ; ΣM = 0${sendi ? " ; ΣM bagian kiri terhadap sendi S = 0" : ""}\n` + reak.map(x => x.join(" = ")).join("\n") + `\nTanda momen: + = tarik di sisi kanan arah lintasan (sisi dalam portal). N: + tarik.\n|M| terbesar = ${fmt(Mabs)} kN·m`;
        let csv = "batang;x (m);y (m);N (kN);V (kN);M (kN.m)\n"; r.titik.forEach(t => (csv += `${t.mi + 1};${fmt(t.P[0], 3)};${fmt(t.P[1], 3)};${fmt(t.N, 4)};${fmt(t.V, 4)};${fmt(t.M, 4)}\n`));
        return {
          nilai: { VA: ui(0, "V"), VE: ui(1, "V"), HA: ui(0, "H"), HE: ui(1, "H"), MA: ui(1, "M"), Mabs, Msudut, Mmaks: Math.max(...all) },
          html: tabel(["Reaksi", "Nilai"], reak) + `<p><b>|M| terbesar = ${fmt(Mabs)} kN·m</b></p>${izin}` + gambarPortal(nodes, r.titik, r.pj, tump, sendi)
            + tabel(["Batang (urut lintasan)", "N awal/akhir (kN)", "V awal/akhir (kN)", "M awal/akhir (kN·m)", "M ekstrem"], per) + `<div class="langkah">${esc(langkah)}</div>`,
          teks: langkah, csv
        };
      },
      mode === "portal3" ? [
        { nama: "Contoh 9.1 (datar, q = 2)", v: { jenis: "tiga-datar", h: "4", L: "10", f: "6", q: "2", H: "0", P: "0", mizin: "" }, cek: [["VA", 10], ["HA", 6.25], ["Msudut", 25]] },
        { nama: "Contoh 9.2 (angin 5 kN)", v: { jenis: "tiga-datar", h: "4", L: "10", f: "6", q: "0", H: "5", P: "0", mizin: "" }, cek: [["VA", -2], ["VE", 2], ["HA", -2.5], ["HE", -2.5], ["Mabs", 10]] },
        { nama: "Contoh 9.3 (pelana, q = 2,8)", v: { jenis: "tiga-pelana", h: "4", L: "12", f: "6", q: "2.8", H: "0", P: "0", mizin: "" }, cek: [["VA", 16.8], ["HA", 8.4], ["Msudut", 33.6]] },
        { nama: "Case Method 3 (q = 4,4)", v: { jenis: "tiga-pelana", h: "4", L: "12", f: "6", q: "4.4", H: "0", P: "0", mizin: "45" }, cek: [["HA", 13.2], ["Mabs", 52.8]] },
        { nama: "UAS B1 (q = 3 + angin 4)", v: { jenis: "tiga-datar", h: "4", L: "8", f: "6", q: "3", H: "4", P: "0", mizin: "" }, cek: [["VA", 10], ["VE", 14], ["HA", 4], ["HE", -8], ["Mabs", 32]] }] : [
        { nama: "Contoh 8.1 (portal L)", v: { jenis: "L", h: "3", L: "2", f: "0", q: "0", H: "0", P: "6", mizin: "" }, cek: [["VE", 6], ["MA", 12], ["Mabs", 12]] },
        { nama: "Contoh 8.2 (sendi–rol, q = 3)", v: { jenis: "sendi-rol", h: "4", L: "6", f: "0", q: "3", H: "0", P: "0", mizin: "" }, cek: [["VA", 9], ["VE", 9], ["Mmaks", 13.5]] },
        { nama: "Contoh 8.3 (q = 3 + H = 4)", v: { jenis: "sendi-rol", h: "4", L: "6", f: "0", q: "3", H: "4", P: "0", mizin: "" }, cek: [["HA", -4], ["VA", 6.3333], ["VE", 11.6667], ["Msudut", 16], ["Mmaks", 22.685]] }],
      mode === "portal3" ? [{ nama: "Contoh 9.1", v: { jenis: "tiga-datar", h: "4", L: "10", q: "2", H: "0", P: "0" } }, { nama: "Contoh 9.3 – gudang (penutup lama)", v: { jenis: "tiga-pelana", h: "4", L: "12", f: "6", q: "2.8", H: "0", P: "0", mizin: "45" } }, { nama: "Case Method 3 – genteng beton", v: { jenis: "tiga-pelana", h: "4", L: "12", f: "6", q: "4.4", H: "0", P: "0", mizin: "45" } }, { nama: "Case Method 3 – jarak portal 3 m", v: { jenis: "tiga-pelana", h: "4", L: "12", f: "6", q: "3.3", H: "0", P: "0", mizin: "45" } }]
        : [{ nama: "Contoh 8.3", v: { jenis: "sendi-rol", h: "4", L: "6", q: "3", H: "4", P: "0" } }, { nama: "Contoh 8.1", v: { jenis: "L", h: "3", L: "2", q: "0", H: "0", P: "6" } }, { nama: "Studi kasus carport", v: { jenis: "sendi-rol", h: "2.6", L: "5", q: "0.8", H: "2.5", P: "0" } }]);
  }

  // =========================================================
  // 6. RANGKA BATANG (Pratt/Howe/Warren) – Bab 10, UAS
  // =========================================================
  function bangunRangka(tipe, n, a, h) {
    const N = {}, M = [];
    for (let i = 0; i <= n; i++) N["L" + i] = [i * a, 0];
    if (tipe === "Warren") {
      for (let i = 1; i <= n; i++) N["U" + i] = [(i - 0.5) * a, h];
      for (let i = 0; i < n; i++) M.push(["L" + i, "L" + (i + 1)]);
      for (let i = 1; i < n; i++) M.push(["U" + i, "U" + (i + 1)]);
      for (let i = 1; i <= n; i++) { M.push(["L" + (i - 1), "U" + i]); M.push(["U" + i, "L" + i]); }
    } else {
      if (n % 2) throw new Error("Pratt/Howe memerlukan jumlah panel genap.");
      for (let i = 1; i < n; i++) N["U" + i] = [i * a, h];
      for (let i = 0; i < n; i++) M.push(["L" + i, "L" + (i + 1)]);
      for (let i = 1; i < n - 1; i++) M.push(["U" + i, "U" + (i + 1)]);
      M.push(["L0", "U1"]); M.push(["L" + n, "U" + (n - 1)]);
      for (let i = 1; i < n; i++) M.push(["U" + i, "L" + i]);
      const t = n / 2;
      for (let i = 1; i < t; i++) M.push(tipe === "Pratt" ? ["U" + i, "L" + (i + 1)] : ["L" + i, "U" + (i + 1)]);
      for (let i = t + 1; i < n; i++) M.push(tipe === "Pratt" ? ["U" + i, "L" + (i - 1)] : ["L" + i, "U" + (i - 1)]);
    }
    return { N, M };
  }
  function analisisRangka(N, M, tump, beban) {
    const nama = Object.keys(N), idx = Object.fromEntries(nama.map((k, i) => [k, i])), J = nama.length;
    const cols = M.length + tump.length; if (M.length + tump.length !== 2 * J) throw new Error(`m + r = ${M.length} + ${tump.length} = ${M.length + tump.length} ≠ 2j = ${2 * J}: ${M.length + tump.length < 2 * J ? "labil" : "statis tak tentu"}.`);
    const A = Array.from({ length: 2 * J }, () => Array(cols).fill(0)), b = Array(2 * J).fill(0);
    M.forEach(([p, q], k) => { const P = N[p], Q = N[q], L = Math.hypot(Q[0] - P[0], Q[1] - P[1]), u = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L]; A[2 * idx[p]][k] += u[0]; A[2 * idx[p] + 1][k] += u[1]; A[2 * idx[q]][k] -= u[0]; A[2 * idx[q] + 1][k] -= u[1]; });
    tump.forEach(([n, d], k) => { A[2 * idx[n] + (d === "x" ? 0 : 1)][M.length + k] = 1; });
    Object.entries(beban).forEach(([n, [fx, fy]]) => { if (!(n in idx)) throw new Error(`Titik “${n}” tidak ada.`); b[2 * idx[n]] -= fx; b[2 * idx[n] + 1] -= fy; });
    const s = selesaikan(A, b); if (!s) throw new Error("Rangka labil (susunan bukan segitiga).");
    return { F: s.slice(0, M.length), R: s.slice(M.length) };
  }
  function ritter(N, M, F, tump, R, beban, k) { // persamaan Ritter untuk batang k (batang tepi/diagonal) memakai bagian kiri
    const [p, q] = M[k]; const xc = (N[p][0] + N[q][0]) / 2;
    const potong = M.map((m, i) => [m, i]).filter(([m]) => (Math.min(N[m[0]][0], N[m[1]][0]) < xc && Math.max(N[m[0]][0], N[m[1]][0]) > xc));
    if (potong.length !== 3) return "Ritter: potongan melalui batang ini tidak memotong tepat 3 batang.";
    const lain = potong.filter(([, i]) => i !== k).map(([m]) => m);
    const garis = m => [N[m[0]], N[m[1]]];
    const titikPot = (g1, g2) => { const [a, b] = g1, [c, d] = g2; const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]); if (Math.abs(den) < 1e-9) return null; const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den; return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; };
    const ext = []; tump.forEach(([n, d], i) => { if (N[n][0] < xc) ext.push({ p: N[n], F: d === "x" ? [R[i], 0] : [0, R[i]], ket: `R ${n} (${d}) = ${fmt(R[i])}` }); });
    Object.entries(beban).forEach(([n, f]) => { if (N[n][0] < xc) ext.push({ p: N[n], F: f, ket: `beban ${n} = ${fmt(Math.hypot(f[0], f[1]))}` }); });
    const kiriNode = N[p][0] < xc ? p : q, kananNode = kiriNode === p ? q : p;
    const u = [N[kananNode][0] - N[kiriNode][0], N[kananNode][1] - N[kiriNode][1]]; const L = Math.hypot(...u); u[0] /= L; u[1] /= L;
    const c = titikPot(garis(lain[0]), garis(lain[1]));
    if (c) {
      const Mext = ext.reduce((a, e) => a + (e.p[0] - c[0]) * e.F[1] - (e.p[1] - c[1]) * e.F[0], 0);
      const lengan = (N[kiriNode][0] - c[0]) * u[1] - (N[kiriNode][1] - c[1]) * u[0];
      return `Ritter ${p}${q}: potong 3 batang, ambil bagian kiri; ΣM terhadap titik temu (${fmt(c[0])}; ${fmt(c[1])}) = 0\n  ΣM gaya luar kiri = ${fmt(Mext)} kN·m ; lengan batang = ${fmt(lengan)} m\n  F = −${fmt(Mext)} / ${fmt(lengan)} = ${fmt(-Mext / lengan)} kN (${-Mext / lengan >= 0 ? "tarik" : "tekan"})`;
    }
    const Fy = ext.reduce((a, e) => a + e.F[1], 0);
    return `Ritter ${p}${q}: dua batang lain sejajar → ΣFy bagian kiri = 0\n  ΣFy gaya luar = ${fmt(Fy)} kN ; komponen vertikal satuan batang = ${fmt(u[1])}\n  F = −${fmt(Fy)} / ${fmt(u[1])} = ${fmt(-Fy / u[1])} kN`;
  }
  function gambarRangka(N, M, F, beban, satuan) {
    const xs = Object.values(N).map(p => p[0]), ys = Object.values(N).map(p => p[1]);
    const W = 640, mx = Math.min(...xs), Mx = Math.max(...xs), My = Math.max(...ys); const sk = (W - 60) / (Mx - mx || 1); const H = My * sk + 90;
    const X = x => 30 + (x - mx) * sk, Y = y => H - 50 - y * sk;
    let s = `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rangka batang: biru tarik, merah tekan, abu-abu nol">`;
    M.forEach(([p, q], k) => { const f = F[k], z = Math.abs(f) < 1e-6, c = z ? "#94A3B8" : f > 0 ? "#006A7A" : "#B91C1C"; s += `<line x1="${X(N[p][0])}" y1="${Y(N[p][1])}" x2="${X(N[q][0])}" y2="${Y(N[q][1])}" stroke="${c}" stroke-width="3" ${z ? 'stroke-dasharray="6 4"' : ""}/><text x="${(X(N[p][0]) + X(N[q][0])) / 2}" y="${(Y(N[p][1]) + Y(N[q][1])) / 2 - 3}" font-size="13" text-anchor="middle" fill="${c}" stroke="var(--bg)" stroke-width="3" paint-order="stroke">${z ? "0" : (f > 0 ? "+" : "") + fmt(f)}</text>`; });
    Object.entries(N).forEach(([n, p]) => (s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="currentColor"/><text x="${X(p[0])}" y="${Y(p[1]) + (p[1] > 0 ? -8 : 16)}" font-size="10" text-anchor="middle" fill="currentColor">${n}</text>`));
    Object.entries(beban).forEach(([n, f]) => (s += `<text x="${X(N[n][0])}" y="${Y(N[n][1]) + 32}" font-size="10" text-anchor="middle" fill="#B3470F">↓ ${fmt(-f[1], 1)} ${satuan}</text>`));
    return s + `<text x="${W - 6}" y="${H - 4}" font-size="10" text-anchor="end" fill="currentColor">biru = tarik (+), merah = tekan (−), abu putus = nol</text></svg>`;
  }
  function kalkRangka(el) {
    pasang(el, "Rangka Batang – Titik Buhul & Ritter",
      `<div class="grid-input"><label>Tipe<select name="tipe"><option>Pratt</option><option>Howe</option><option>Warren</option></select></label>
       ${inp("n", "Jumlah panel", "4")}${inp("a", "Panjang panel (m)", "3")}${inp("h", "Tinggi rangka (m)", "3")}
       ${area("beban", "Beban di titik bawah: “L1 10” (kN ke bawah). Sendi di L0, rol di L(n).", "L1 10\nL2 10\nL3 10")}
       ${inp("ritter", "Batang untuk langkah Ritter, mis. U1U2", "U1U2")}</div>`,
      v => {
        const n = Math.round(num(v.n)), a = num(v.a), h = num(v.h); if (n < 2 || n > 12) throw new Error("Jumlah panel 2–12."); if (a <= 0 || h <= 0) throw new Error("Panjang panel dan tinggi harus > 0.");
        const { N, M } = bangunRangka(v.tipe, n, a, h);
        const beban = {}; baris(v.beban).forEach((l, i) => { const w = kata(l); if (w.length < 2) throw new Error(`Baris beban ${i + 1}: format “L2 10”.`); const nm = w[0].toUpperCase(); if (!(nm in N)) throw new Error(`Baris beban ${i + 1}: titik ${nm} tidak ada.`); beban[nm] = [0, -num(w[1])]; });
        const tump = [["L0", "x"], ["L0", "y"], ["L" + n, "y"]];
        const { F, R } = analisisRangka(N, M, tump, beban);
        const rows = M.map(([p, q], k) => [p + q, fmt(Math.hypot(N[q][0] - N[p][0], N[q][1] - N[p][1])), fmt(F[k]), Math.abs(F[k]) < 1e-6 ? "nol" : F[k] > 0 ? "tarik" : "tekan"]);
        const nol = M.filter((_, k) => Math.abs(F[k]) < 1e-6).map(([p, q]) => p + q);
        const target = (v.ritter || "").toUpperCase().replace(/\s/g, ""); const kR = M.findIndex(([p, q]) => p + q === target || q + p === target);
        const rit = kR >= 0 ? ritter(N, M, F, tump, R, beban, kR) : "Ritter: isi nama batang yang ada (mis. U1U2).";
        const j = Object.keys(N).length;
        const langkah = `m = ${M.length}, r = 3, j = ${j} → m + r = ${M.length + 3} = 2j = ${2 * j} ✓ statis tertentu\nReaksi: H(L0) = ${fmt(R[0])} ; V(L0) = ${fmt(R[1])} ; V(L${n}) = ${fmt(R[2])} kN\nBatang nol: ${nol.join(", ") || "-"}\n${rit}`;
        const val = { RL0: R[1], RLn: R[2] }; M.forEach(([p, q], k) => (val[p + q] = F[k]));
        return { nilai: val, html: `<p>${esc(langkah).replace(/\n/g, "<br>")}</p>` + gambarRangka(N, M, F, beban, "kN") + tabel(["Batang", "Panjang (m)", "Gaya (kN)", "Sifat"], rows), teks: langkah + "\n" + rows.map(r => r.join(" ")).join("\n"), csv: "batang;panjang (m);gaya (kN);sifat\n" + rows.map(r => r.join(";")).join("\n") };
      },
      [{ nama: "Contoh 10.3 (Pratt, 3 × 10 kN)", v: { tipe: "Pratt", n: "4", a: "3", h: "3", beban: "L1 10\nL2 10\nL3 10", ritter: "U1U2" }, cek: [["U1U2", -20], ["L1L2", 15], ["L0U1", -21.213], ["U1L2", 7.071], ["U1L1", 10], ["U2L2", 0]] },
       { nama: "Contoh 10.5 (Pratt, 20 kN di L2)", v: { tipe: "Pratt", n: "4", a: "3", h: "3", beban: "L2 20", ritter: "U1U2" }, cek: [["U1L1", 0], ["U1L2", 14.142], ["U1U2", -20], ["L0L1", 10]] },
       { nama: "UAS B2 (Warren 4 × 4 m, h = 3)", v: { tipe: "Warren", n: "4", a: "4", h: "3", beban: "L1 12\nL2 12\nL3 12", ritter: "U2U3" }, cek: [["U2U3", -32], ["L1L2", 28], ["L0U1", -21.633], ["L0L1", 12]] }],
      [{ nama: "Contoh 10.3", v: { tipe: "Pratt", n: "4", a: "3", h: "3", beban: "L1 10\nL2 10\nL3 10", ritter: "U1U2" } }, { nama: "Contoh 10.5 – batang nol", v: { tipe: "Pratt", n: "4", a: "3", h: "3", beban: "L2 20", ritter: "U1L2" } }, { nama: "UAS B2 – Warren", v: { tipe: "Warren", n: "4", a: "4", h: "3", beban: "L1 12\nL2 12\nL3 12", ritter: "U2U3" } }]);
  }

  // =========================================================
  // 7. PERENCANA MODEL JEMBATAN (Bab 11)
  // =========================================================
  function kalkJembatan(el) {
    pasang(el, "Perencana Model Jembatan Rangka (RT-01)",
      `<div class="grid-input"><label>Tipe<select name="tipe"><option>Pratt</option><option>Warren</option><option>Howe</option></select></label>
       ${inp("n", "Jumlah panel", "4")}${inp("a", "Panjang panel (cm)", "15")}${inp("h", "Tinggi rangka (cm)", "12")}
       ${inp("ct", "Kapasitas tarik batang (N) – dari uji", "600")}${inp("cc1", "Kapasitas tekan batang pendek (N)", "150")}${inp("lb", "Batas panjang batang pendek (cm)", "16")}${inp("cc2", "Kapasitas tekan batang panjang (N)", "110")}
       ${inp("berat", "Berat model (g)", "120")}${inp("uji", "Beban runtuh hasil uji (N), opsional", "")}
       ${area("sw", "Verifikasi: hasil perangkat lunak untuk P = 100 N, satu baris “batang nilai” (mis. U1U2 -121)", "U1U2 -121\nL0U1 -80.5")}</div>`,
      v => {
        const n = Math.round(num(v.n)), a = num(v.a), h = num(v.h), tipe = v.tipe;
        const { N, M } = bangunRangka(tipe, n, a, h); const tengah = "L" + Math.round(n / 2);
        const { F } = analisisRangka(N, M, [["L0", "x"], ["L0", "y"], ["L" + n, "y"]], { [tengah]: [0, -1] });
        const ct = num(v.ct), c1 = num(v.cc1), c2 = num(v.cc2), lb = num(v.lb);
        const rows = M.map(([p, q], k) => { const Lb = Math.hypot(N[q][0] - N[p][0], N[q][1] - N[p][1]), f = F[k]; const C = f > 1e-9 ? ct : f < -1e-9 ? (Lb <= lb ? c1 : c2) : Infinity; return { nama: p + q, Lb, f, C, Pf: Math.abs(f) > 1e-9 ? C / Math.abs(f) : Infinity }; });
        const urut = rows.filter(r => isFinite(r.Pf)).sort((x, y) => x.Pf - y.Pf); const kritis = urut[0];
        const W = num(v.berat) * 9.81 / 1000; const Pu = (v.uji || "").trim() ? num(v.uji) : null;
        const ver = baris(v.sw).map(l => { const [nm, val] = kata(l); const r = rows.find(x => x.nama === nm.toUpperCase()); if (!r) throw new Error(`Batang ${nm} tidak ada pada desain ini.`); const man = r.f * 100, s = num(val); const sel = Math.abs(man - s) / Math.abs(s) * 100; return [nm.toUpperCase(), fmt(man, 1), fmt(s, 1), `<span class="${sel <= 5 ? "ok" : "nok"}">${fmt(sel, 1)}%</span>`]; });
        const langkah = `Beban P di ${tengah}. Koefisien gaya f = gaya per P = 1.\nPrediksi P_runtuh = min(C / |f|) = ${fmt(kritis.C)} / ${fmt(Math.abs(kritis.f), 3)} = ${fmt(kritis.Pf, 1)} N (batang kritis ${kritis.nama}, ${kritis.f < 0 ? "tekan" : "tarik"})\nBerat model = ${fmt(W, 3)} N → rasio prediksi = ${fmt(kritis.Pf / W, 1)}` + (Pu ? `\nHasil uji = ${fmt(Pu, 1)} N → rasio uji = ${fmt(Pu / W, 1)} ; selisih prediksi vs uji = ${fmt((Pu - kritis.Pf) / kritis.Pf * 100, 1)}%` : "");
        const val = { Pruntuh: kritis.Pf }; rows.forEach(r => (val[r.nama] = r.f));
        return { nilai: val, html: `<p>${esc(langkah).replace(/\n/g, "<br>")}</p>` + gambarRangka(N, M, F, { [tengah]: [0, -1] }, "P") + tabel(["Batang", "Panjang (cm)", "f (per P)", "Kapasitas (N)", "P runtuh batang (N)"], urut.map(r => [r.nama === kritis.nama ? `<b>${r.nama}</b>` : r.nama, fmt(r.Lb, 1), fmt(r.f, 3), fmt(r.C, 0), fmt(r.Pf, 1)])) + (ver.length ? "<b>Verifikasi perangkat lunak (P = 100 N, syarat ≤ 5%)</b>" + tabel(["Batang", "Manual (N)", "Perangkat lunak (N)", "Selisih"], ver) : ""), teks: langkah, csv: "batang;panjang (cm);f;kapasitas (N);P runtuh (N)\n" + urut.map(r => [r.nama, fmt(r.Lb, 2), fmt(r.f, 4), fmt(r.C, 0), fmt(r.Pf, 2)].join(";")).join("\n") };
      },
      [{ nama: "Desain acuan Pratt (Gambar 11.1)", v: { tipe: "Pratt", n: "4", a: "15", h: "12", ct: "600", cc1: "150", lb: "16", cc2: "110", berat: "120", uji: "", sw: "" }, cek: [["U1U2", -1.25], ["L0U1", -0.8004], ["U1L2", 0.8004], ["L0L1", 0.625], ["U1L1", 0], ["Pruntuh", 120]] },
       { nama: "Alternatif Warren (Gambar 11.2)", v: { tipe: "Warren", n: "4", a: "15", h: "12", ct: "600", cc1: "150", lb: "16", cc2: "110", berat: "120", uji: "", sw: "" }, cek: [["U2U3", -1.25], ["L1L2", 0.9375], ["L0U1", -0.5896]] }],
      null);
  }

  // ---------- pemasangan sesuai atribut data-kalk ----------
  const PETA = { vektor: kalkVektor, momen: kalkMomen, setimbang: kalkSetimbang, balok: el => kalkBalok(el, "balok"), gerber: el => kalkBalok(el, "gerber"), portal: el => kalkPortal(el, "portal"), portal3: el => kalkPortal(el, "portal3"), rangka: kalkRangka, jembatan: kalkJembatan };
  document.querySelectorAll(".kalk[data-kalk]").forEach(el => { const f = PETA[el.dataset.kalk]; if (f) try { f(el); } catch (e) { el.textContent = "Alat hitung gagal dimuat: " + e.message; } });
  window.MT1 = window.MT1 || {}; window.MT1.kalk = { analisisBalok, analisisPortal, analisisRangka, bangunRangka };
})();
