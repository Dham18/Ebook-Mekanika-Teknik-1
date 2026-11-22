# E-Book Interaktif "Mekanika Teknik 1" (SIP3115)

Buku ajar interaktif D3 Teknik Sipil Politeknik Negeri Padang – penulis dan pemegang hak cipta **Dham** (© 2026).
Fitur: 11 bab + 2 bab evaluasi + bagian awal/akhir, AI Tutor, Zona AR (11 model 3D), 9 alat hitung dengan kasus uji,
kuis berskor, pencarian, penanda, catatan, progres belajar, mode gelap, pengatur huruf, baca suara, flashcard glosarium,
sertifikat penyelesaian, dan mode luring (PWA).

## Struktur folder

```
/ebook
 ├── index.html            beranda: kover, progres, daftar isi
 ├── kover.html            kover depan/belakang, thumbnail LMS, banner bab
 ├── bab/                  awal, bab-01 … bab-11, uts, uas, akhir
 ├── kalkulator/index.html semua alat hitung
 ├── kuis/index.html       ringkasan skor kuis & evaluasi
 ├── ar/                   galeri AR + 11 halaman AR (kode QR)
 ├── assets/css            design-tokens.css, kover.css, ebook.css
 ├── assets/js             config.js, app.js, ai-tutor.js, kuis.js, kalkulator.js, halaman.json
 ├── assets/icons          icons.svg (27 ikon)
 ├── assets/img            logo, ikon PWA, gambar bab
 ├── assets/model-3d       11 model .glb
 ├── server/proxy-contoh.js  contoh server perantara AI (JANGAN diunggah ke hosting statis)
 ├── manifest.json  service-worker.js
 └── README.md
```

## Menjalankan di komputer

E-book harus dibuka lewat server (bukan klik ganda berkas) agar pencarian, PWA, dan AR berjalan:

```bash
cd ebook
python3 -m http.server 8000      # lalu buka http://localhost:8000
```

## Mengunggah

**GitHub Pages:** buat repositori, unggah isi folder `docs`, Settings → Pages → Deploy from branch → `main` / root. Alamatnya menjadi `https://<akun>.github.io/<repo>/`.

**SPADA/LMS PNP (Moodle):** (1) unggah ke hosting/GitHub Pages lalu tambahkan sebagai *URL resource* di kursus SIP3115 – cara paling stabil; atau (2) kompres folder menjadi .zip, tambahkan *File* → buka sebagai *Embed/In pop-up* dengan `index.html` sebagai berkas utama (fitur PWA dan AR bergantung pada pengaturan server LMS). Ganti alamat kode QR di `kover.html` bila tautan kursus sudah ada.

## Pengaturan (assets/js/config.js)

| Kunci | Fungsi |
|---|---|
| `API_ENDPOINT` | Kosong = AI Tutor Mode 1 (salin prompt & buka chatbot). Isi alamat server perantara = Mode 2. |
| `CHATBOT` | Daftar chatbot untuk Mode 1 (`{q}` diganti prompt). |
| `LMS_URL` | Alamat SPADA PNP. |
| `AMBANG_TUNTAS` | Ambang skor tuntas (70). |

**Keamanan:** kunci API AI **tidak boleh** ditaruh di `config.js` atau berkas apa pun di folder `ebook`. Untuk Mode 2 jalankan `server/proxy-contoh.js` di server kampus dengan kunci di variabel lingkungan, batasi asal (CORS) dan jumlah permintaan.

## Memperbarui konten

Isi bab bersumber dari berkas Word Tahap 3. Alur pembaruan: sunting Word → konversi `pandoc <berkas>.docx -t html5 --extract-media=raw/media -o raw/<berkas>.html` → jalankan `python3 build.py` (alat perakit disertakan terpisah). Setelah mengubah berkas, naikkan `VERSI` di `service-worker.js` agar perangkat pembaca mengambil versi baru.

## Mengganti model AR

Simpan model Blender/SketchUp/Revit sebagai GLB (≤ 10 MB, kompresi Draco dianjurkan) dengan nama yang sama di `assets/model-3d/`. Posisi label (hotspot) diatur di `build.py` (variabel `HOTSPOT`). Berkas USDZ untuk iPhone dibuat otomatis oleh `<model-viewer>`.

## Pustaka pihak ketiga (disimpan lokal di assets/vendor – tanpa CDN)

KaTeX 0.16.11 (rumus, MIT), `<model-viewer>` 3.5.0 (AR/3D, Apache-2.0), qrcodejs 1.0.0 (kode QR, MIT), huruf Space Grotesk, Plus Jakarta Sans, JetBrains Mono (SIL OFL). Seluruh e-book dapat dibaca luring; hanya AI Tutor yang memerlukan internet. Grafik SFD/BMD/portal/rangka digambar langsung dengan SVG (tanpa Chart.js) agar ringan dan bekerja luring.

## Privasi

Progres, skor, catatan, dan penanda hanya disimpan di `localStorage` perangkat pembaca. Tidak ada data yang dikirim kecuali pembaca memakai AI Tutor Mode 2.
