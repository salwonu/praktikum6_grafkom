# Mini 3D Scene dengan Three.js

## Identitas Kelompok
- Nama Kelompok : <isi>
- Anggota:
  | Nama | NRP |
  |------|-----|
  | <nama 1> | <NRP 1> |
  | <nama 2> | <NRP 2> |

## Judul & Deskripsi Scene
**"Playground Geometri"** - sebuah diorama kecil berisi box, sphere, cone, dan torus di atas ground hijau, dengan
satu deret *material gallery* di belakang. Matahari (DirectionalLight) menghasilkan bayangan, sementara point light
oranye mengorbit di sekitar scene. Pengguna dapat memutar kamera, memilih dan menggerakkan object, serta mengubah
kualitas shadow secara langsung.

## Daftar Geometry
| Geometry | Dipakai pada |
|----------|--------------|
| PlaneGeometry | Ground |
| BoxGeometry | Box merah |
| SphereGeometry | Sphere biru, marker light, material gallery |
| ConeGeometry (challenge) | Cone kuning |
| TorusGeometry (challenge) | Torus ungu |

## Daftar Material
| Material | Merespons cahaya? | Dipakai pada |
|----------|-------------------|--------------|
| MeshStandardMaterial | Ya | Ground, Box, Cone, Torus |
| MeshPhongMaterial | Ya | Sphere |
| MeshBasicMaterial | Tidak | Marker point light, gallery "Basic" |
| Lambert / Physical / Toon / Normal | Ya (Normal: tidak) | Material gallery |

## Daftar Light
- AmbientLight (intensitas 0.45)
- DirectionalLight "sun" (intensitas 2.5, posisi 6,10,5, **castShadow**)
- PointLight oranye yang mengorbit (challenge Light animation)

## Konfigurasi Shadow
- `renderer.shadowMap.enabled = true`, tipe `PCFSoftShadowMap`
- Shadow map default 2048x2048 (bisa diubah 512/1024/2048/4096 lewat tombol 1-4)
- Shadow camera orthographic: left/right/top/bottom = +-14, near 1, far 40
- `bias = -0.0004`, `normalBias = 0.02` untuk mengurangi shadow acne
- `castShadow = true`: Box, Sphere, Cone, Torus, gallery. `receiveShadow = true`: Ground

## Animasi
Animation loop memakai `requestAnimationFrame()` dan `THREE.Clock.getDelta()`.
Box berputar, Sphere memantul, Cone dan Torus berputar, point light mengorbit,
dan sun dapat mengorbit (tombol L). Semua animasi dapat di-pause (Space).

## Challenge yang Dikerjakan
1. Tambah 2 geometry (Cone dan Torus)
2. Material gallery (7 jenis material, tombol G untuk show/hide)
3. OrthographicCamera (tombol C)
4. Light animation (point light orbit + sun orbit)
5. Shadow quality (tombol 1-4)
6. Scene information (HUD: FPS, jumlah mesh/light, draw calls, triangles, dll)
7. Toggle animation (Space)
8. Object control (Tab pilih object, panah/R/F geser, Q/E putar, +/- skala)

## Cara Menjalankan
```bash
git clone <url-repository>
cd <nama-folder>
npm install
npm run dev
```
Buka alamat yang muncul di terminal (biasanya http://localhost:5173).

## Kontrol Keyboard
| Tombol | Fungsi |
|--------|--------|
| Mouse | Orbit / zoom / pan |
| Space | Toggle animasi |
| C | Ganti Perspective / Orthographic |
| L | Toggle orbit sun |
| G | Tampil/sembunyi material gallery |
| 1-4 | Kualitas shadow |
| Tab | Pilih object berikutnya |
| Panah | Geser object di X/Z |
| R / F | Naikkan / turunkan object |
| Q / E | Putar object |
| + / - | Perbesar / perkecil object |

## Screenshot
![Screenshot](screenshots/scene.png)

## Catatan Debugging
- Shadow acne (garis-garis di permukaan) diatasi dengan `shadow.bias` dan `shadow.normalBias`.
- Shadow terpotong karena area shadow camera terlalu kecil, jadi `left/right/top/bottom` diperbesar.
- Saat mengganti ukuran shadow map, map lama harus di-`dispose()` dan di-set `null` agar dibuat ulang.
- Saat pindah ke OrthographicCamera, `controls.object` harus diganti, dan `left/right/top/bottom` ikut diperbarui saat resize.
- Layar blur/berat di monitor retina diatasi dengan `Math.min(devicePixelRatio, 2)`.
