# Panduan Pemasangan

## A. GitHub Pages
Repositori: https://github.com/Dham18/Ebook-Mekanika-Teknik-1
1. Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
2. Branch: **main**, folder: **/docs** → Save.
3. Tunggu 1–2 menit (tab Actions: "pages build and deployment" hijau).
4. Alamat: https://dham18.github.io/Ebook-Mekanika-Teknik-1/
5. Setiap pembaruan: ubah berkas di `docs/`, naikkan `VERSI` di `docs/service-worker.js` dan `docs/assets/js/config.js`, lalu commit & push.
6. Mode 1 wajib: `API_ENDPOINT` di `docs/assets/js/config.js` tetap kosong; jangan pernah menaruh kunci API di folder `docs/`.

## B. SPADA PNP (spadasp.pnp.ac.id)
**Opsi A (disarankan):** Add an activity or resource → **URL** → isi alamat GitHub Pages → Display: **New window**. Tambahkan juga resource **File** untuk PDF cetak dan EPUB. Di tiap topik mingguan, tautkan langsung ke `bab/bab-XX.html`.

**Opsi B (cadangan):** resource **File** → unggah `EBook_Mekanika_Teknik_1_web.zip` → Unzip → set `index.html` sebagai main file. Mode luring (PWA) dan AR di HP bisa terbatas.

Skor kuis tersimpan di peramban mahasiswa; minta tangkapan layar halaman Kuis/sertifikat diunggah ke tugas SPADA.

## C. Uji AR
AR hanya berjalan lewat HTTPS (GitHub Pages). Uji di HP Android (ARCore) dan iPhone/iPad (Safari) memakai lembar uji di dokumen Tahap 5.
