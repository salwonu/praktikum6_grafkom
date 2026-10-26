# Three.js Interactive 3D Prototype

## Identitas Kelompok

| Keterangan | Isi |
|---|---|
| Nama kelompok | _(isi)_ |
| Anggota 1 | _(nama, NRP)_ |
| Anggota 2 | _(nama, NRP)_ |
| Mata kuliah | Grafika Komputer |

## Judul dan Deskripsi Prototype

**Interactive 3D Playground: Robot, PBR Gallery, dan Mini Solar System**

Prototype 3D interaktif berbasis Three.js. Scene berisi model GLB beranimasi (robot), galeri material PBR, dan tata surya mini hierarkis. Pengguna dapat menggerakkan kamera dengan mouse/touch, mengarahkan pointer ke objek (hover), mengklik objek (selection), mengganti animation clip robot, serta menyalakan/mematikan environment lighting. HUD dan information panel menampilkan status objek secara langsung.

## Struktur Scene Graph

```
Scene
├─ HemisphereLight
├─ DirectionalLight (shadow)
├─ Ground (Mesh, MeshStandardMaterial) + GridHelper
└─ WorldRoot (Group)
   ├─ PBRGallery (Group, berputar)
   │   ├─ Sphere M1 R0.1 / M1 R0.5 / M1 R0.9   (metal)
   │   ├─ Sphere M0 R0.1 / M0 R0.5 / M0 R0.9   (non-metal)
   │   └─ AxesHelper
   ├─ SolarSystem (Group)
   │   ├─ Sun (Mesh)
   │   └─ PlanetPivot (Group, berputar)
   │       ├─ Planet (Mesh)
   │       ├─ MoonPivot (Group, berputar)
   │       │   └─ Moon (Mesh)
   │       └─ AxesHelper
   └─ RobotAnchor (Group)
       ├─ model GLB (hasil GLTFLoader, berisi bone dan SkinnedMesh)
       └─ AxesHelper
```

Hierarchy scene dan hierarchy GLB juga dicetak ke Console lewat `traverse()` (grup *Scene graph* dan *Hierarchy GLB*).

## Hierarchy Parent-Child

Contoh yang mendemonstrasikan local vs world transform:

- **PlanetPivot → Planet**: `Planet.position` (local) selalu `(2.4, 0, 0)`, tetapi world position-nya berubah karena `PlanetPivot` berputar dan `SolarSystem` berada di `(6, 1.8, -1)`.
- **PlanetPivot → MoonPivot → Moon**: posisi world Moon adalah gabungan rotasi `PlanetPivot` dan `MoonPivot`.
- **PBRGallery → Sphere**: sphere punya local position pada lingkaran radius 2, sedangkan world position ikut berputar bersama grup.

Klik objek mana pun, lalu lihat **Information Panel**: baris `Local pos` dan `World pos` memperlihatkan perbedaannya secara real-time (dihitung dengan `getWorldPosition()`). `AxesHelper` pada grup memperlihatkan sumbu lokal yang ikut berputar.

## Model GLB dan Sumber Asset

| Item | Keterangan |
|---|---|
| Model | RobotExpressive.glb |
| Sumber | Contoh resmi three.js (`examples/models/gltf/RobotExpressive`), dimuat via jsDelivr pada tag `r160` |
| Pembuat | Tomás Laulhé, modifikasi oleh Don McCurdy |
| Lisensi | CC0 1.0 (periksa kembali file lisensi pada repository three.js) |
| Loader | `GLTFLoader.loadAsync()` dengan penanganan error `try/catch` |

Untuk memakai file lokal: unduh GLB dari repository three.js, simpan di `assets/models/RobotExpressive.glb`, lalu ubah konstanta `MODEL_URL` di `src/main.js` menjadi `'assets/models/RobotExpressive.glb'`.

Setelah model termuat: `traverse()` mengaktifkan `castShadow` dan `receiveShadow` pada semua mesh, menghitung jumlah mesh dan bone, serta meng-clone material agar highlight tiap mesh independen.

## Animation Clip

Model memiliki banyak clip (antara lain Idle, Walking, Running, Dance, Jump, Wave, Yes, No, Punch, ThumbsUp, Death, Sitting, Standing). Semua dijalankan lewat `AnimationMixer` dan diperbarui dengan `mixer.update(delta)`.

- **Idle, Walking, Running, Dance**: loop berulang.
- **Clip lain**: diputar sekali, lalu otomatis kembali ke Idle lewat event `finished`.
- Perpindahan antar clip memakai `fadeOut` dan `fadeIn` (crossfade 0.35 detik).
- Daftar clip dibuat otomatis menjadi tombol di pojok kanan atas.

## Pengaturan PBR, Roughness, dan Metalness

Semua objek memakai `MeshStandardMaterial`. Galeri PBR memvariasikan kedua parameter:

| Sphere | Metalness | Roughness | Warna |
|---|---|---|---|
| M1 R0.1 | 1.0 | 0.1 | emas muda |
| M1 R0.5 | 1.0 | 0.5 | emas muda |
| M1 R0.9 | 1.0 | 0.9 | emas muda |
| M0 R0.1 | 0.0 | 0.1 | biru |
| M0 R0.5 | 0.0 | 0.5 | biru |
| M0 R0.9 | 0.0 | 0.9 | biru |

Ground: roughness 0.9, metalness 0. Planet: roughness 0.4, metalness 0.1. Material metalness tinggi terlihat gelap tanpa environment; coba matikan environment untuk membuktikannya.

## Interaksi Hover dan Click

- **Raycasting**: pointer dikonversi ke NDC (`x = (clientX - left)/width*2 - 1`, `y = -((clientY - top)/height)*2 + 1`), lalu `raycaster.setFromCamera()` dan `intersectObjects(selectables, true)`. Parameter `true` membuat child mesh model GLB ikut terdeteksi. Hasil hit dinaikkan ke root yang selectable lewat `findSelectable()`.
- **Hover**: dicek setiap frame selama pointer berada di canvas, sehingga tetap benar saat objek bergerak.
- **Click selection**: state disimpan di variabel `selected`. Klik objek untuk memilih, klik area kosong atau tekan `Esc` untuk membatalkan. Klik robot juga memutar clip berikutnya.
- Klik dibedakan dari drag `OrbitControls` dengan ambang jarak 6 piksel.
- Shortcut: `E` toggle environment, `A` toggle axes, `Esc` deselect.

## Visual Feedback

| State | Emissive | Scale |
|---|---|---|
| Normal | warna emissive asli | 1.0 |
| Hover | biru `0x3366ff`, intensitas 0.45 | 1.07 |
| Selected | oranye `0xffaa22`, intensitas 0.6 | 1.15 |

Perubahan scale dihaluskan dengan damping `1 - exp(-12 * delta)` sehingga tidak bergantung FPS. Kursor berubah menjadi pointer saat hover. HUD menampilkan nama objek yang di-hover (termasuk nama child mesh GLB), objek terpilih, clip aktif, status environment, dan FPS.

## Environment

`PMREMGenerator.fromScene(new RoomEnvironment())` menghasilkan environment map yang dipasang ke `scene.environment`, sehingga material PBR memantulkan lingkungan tanpa file HDR eksternal. Tombol **Environment** (atau tombol `E`) mengatur `scene.environment` antara texture dan `null`.

## Challenge yang Dikerjakan

1. **Multiple animation clips**: seluruh clip GLB tersedia sebagai tombol dan crossfade.
2. **Click menjalankan animasi**: klik robot memutar clip berikutnya.
3. **Information panel**: nama, deskripsi, parent, path hierarchy, local/world position, roughness/metalness, serta info mesh/bone/clip.
4. **Hierarchical solar system**: Sun, PlanetPivot, Planet, MoonPivot, Moon.
5. **PBR material gallery**: enam sphere dengan kombinasi metalness dan roughness.
6. **Hover emissive**: highlight emissive saat hover dan select.
7. **Environment toggle**: tombol ON/OFF environment lighting.

## Cara Menjalankan

Project memakai ES Module dan memuat GLB lewat `fetch`, sehingga **tidak bisa dibuka langsung via `file://`**. Jalankan lewat local server:

```bash
# Opsi 1: Python
python -m http.server 8000

# Opsi 2: Node
npx serve .
```

Buka `http://localhost:8000`. Opsi lain: ekstensi *Live Server* di VS Code. Three.js dimuat dari CDN (jsDelivr, versi 0.160.0) lewat `importmap`, jadi diperlukan koneksi internet kecuali model dan library disimpan lokal.

Struktur folder:

```
├─ index.html
├─ style.css
├─ README.md
├─ src/main.js
└─ assets/models/   (opsional, GLB lokal)
```

## Catatan Debugging

Hal-hal yang ditangani di kode (tambahkan temuan nyata kelompok di sini bila ada):

- **Halaman kosong / error CORS**: terjadi jika dibuka via `file://`; solusinya memakai local server.
- **Highlight ikut mengubah mesh lain**: material GLB bisa dipakai bersama; solusinya `material.clone()` per mesh saat import.
- **Klik terbaca saat drag kamera**: dibedakan dengan ambang jarak antara `pointerdown` dan `pointerup`.
- **Animasi melompat setelah tab di-background**: delta dibatasi `Math.min(delta, 0.1)`.
- **Shadow acne**: diatasi dengan `shadow.bias` dan `shadow.normalBias`.
- **Material metal tampak hitam**: wajar tanpa environment; diatasi dengan `RoomEnvironment` + PMREM.
- **Resize / layar HP**: `ResizeObserver` memperbarui renderer dan aspect; FOV diperlebar pada layar potret.
- **Raycast pada model beranimasi**: model memakai `SkinnedMesh`; raycast dilakukan pada root dengan `recursive = true` agar child mesh terdeteksi.
