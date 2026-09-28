<div align="center"> 

# 🤖 TeleBot

### Bot Telegram Serverless — Modern, Cepat, dan Gratis 100%

[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-2cb67d?style=for-the-badge)](LICENSE)

Bot Telegram ringan berbasis **webhook** yang berjalan di **Vercel Serverless**.
Tanpa server, tanpa biaya, siap 24/7.

[🌐 Live Demo](https://bot-tele-omega-seven.vercel.app) • [📖 Dokumentasi](#-instalasi) • [🐛 Laporkan Bug](https://github.com/Masjjoooo/bot_tele/issues)

</div>

---

## ✨ Fitur

- ⚡ **Serverless** — berjalan di edge network Vercel, respons cepat
- 🔒 **Aman** — verifikasi webhook pakai `secret_token`
- 🎨 **Landing Page** — tampilan glassmorphism modern
- 🧩 **Modular** — command terpisah per file, gampang ditambah
- 💰 **Gratis 100%** — cukup Vercel Hobby Plan
- 📱 **TypeScript** — type-safe, mudah di-maintain
- 🚀 **Auto Deploy** — push ke GitHub → Vercel otomatis deploy

---

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) | Bahasa utama |
| ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=nodedotjs&logoColor=white) | Runtime |
| ![Vercel](https://img.shields.io/badge/-Vercel-000000?logo=vercel&logoColor=white) | Hosting serverless |
| ![Telegram](https://img.shields.io/badge/-Telegram_API-26A5E4?logo=telegram&logoColor=white) | Platform bot |
| **Webhook** | Metode komunikasi |

---

## 📁 Struktur Project

```
bot_tele/
├── api/
│   ├── webhook.ts           # Entry point (GET landing, POST webhook)
│   ├── _lib/
│   │   ├── types.ts         # Tipe data Telegram
│   │   └── telegram.ts      # Helper API Telegram
│   ├── _handlers/
│   │   └── message.ts       # Router pesan → command
│   └── _commands/
│       ├── index.ts         # Registry command
│       ├── start.ts         # /start
│       ├── help.ts          # /help
│       ├── ping.ts          # /ping
│       └── echo.ts          # /echo
├── public/
│   └── index.html           # Landing page glassmorphism
├── .env.example             # Template environment
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 🚀 Instalasi

### 📋 Prasyarat

- [Node.js 20+](https://nodejs.org) — atau
- [Termux](https://f-droid.org/packages/com.termux/) (untuk Android)
- Akun [GitHub](https://github.com)
- Akun [Vercel](https://vercel.com) (gratis)
- Bot Telegram dari [@BotFather](https://t.me/BotFather)

### 1️⃣ Dapatkan Token Bot

1. Buka Telegram → chat [@BotFather](https://t.me/BotFather)
2. Ketik `/newbot` → ikuti instruksi
3. **Copy token** yang diberikan (format: `123456:ABC-DEF...`)

### 2️⃣ Clone Repository

```bash
git clone https://github.com/Masjjoooo/Telebot_Vercel.git
cd bot_tele
```

### 3️⃣ Setup Environment

```bash
cp .env.example .env
nano .env
```

Isi dengan:

```env
BOT_TOKEN=123456:ABC-DEF_GantiDenganTokenKamu
WEBHOOK_SECRET=RahasiaKamuYangAman
```

> ⚠️ **Penting:** `WEBHOOK_SECRET` **hanya boleh** berisi:
> `A-Z`, `a-z`, `0-9`, `_`, dan `-`.
> **Jangan** pakai karakter `@`, `#`, `$`, `%`, dll — Telegram akan tolak.

### 4️⃣ Install Dependencies (Opsional)

```bash
npm install
```

---

## ☁️ Deploy ke Vercel

### Cara 1 — Lewat Dashboard (Rekomendasi)

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repo `bot_tele` dari GitHub
3. Di bagian **Environment Variables**, tambahkan:

   | Name | Value |
   |------|-------|
   | `BOT_TOKEN` | token dari BotFather |
   | `WEBHOOK_SECRET` | secret yang kamu pilih |

4. Klik **Deploy** → tunggu sampai selesai
5. Catat URL-nya (contoh: `https://bot-tele-omega-seven.vercel.app`)

### Cara 2 — Lewat CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### 🔗 Set Webhook ke Telegram

Setelah deploy sukses, buka URL berikut di browser (ganti `<TOKEN>` dan `<SECRET>`):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://bot-tele-omega-seven.vercel.app/api/webhook&secret_token=<SECRET>
```

Kalau berhasil, Telegram balas:

```json
{ "ok": true, "result": true, "description": "Webhook was set" }
```

### ✅ Verifikasi

Cek status webhook:

```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

Pastikan:
- `url` → sama dengan URL Vercel kamu
- `pending_update_count` → `0`
- **Tidak ada** `last_error_message`

---

## 💬 Daftar Command

| Command | Deskripsi |
|---------|-----------|
| `/start` | Mulai percakapan dengan bot |
| `/help` | Tampilkan daftar perintah |
| `/ping` | Cek status bot |
| `/echo <teks>` | Ulangi teks yang kamu kirim |

---

## ➕ Menambah Command Baru

Bikin file di `api/_commands/`, contoh `time.ts`:

```ts
import type { TelegramMessage } from "../_lib/types.js";

export const time = {
  name: "time",
  description: "Waktu sekarang",
  handler: async (_msg: TelegramMessage): Promise<string> => {
    return `🕐 ${new Date().toISOString()}`;
  },
};
```

Daftarkan di `api/_commands/index.ts`:

```ts
import { time } from "./time.js";

export const commands: Command[] = [start, help, ping, echo, time];
```

Push → Vercel auto deploy → selesai. 🎉

---

## 🔄 Update & Redeploy

Setiap kali kamu ubah kode:

```bash
git add .
git commit -m "feat: command baru"
git push
```

Vercel otomatis rebuild & redeploy dalam ~1 menit.

---

## 🐛 Troubleshooting

<details>
<summary><b>Error: <code>Cannot find module</code></b></summary>

Pastikan semua import di dalam `api/` memakai **ekstensi `.js`** (aturan Node ESM), contoh:

```ts
import { sendMessage } from "./_lib/telegram.js";  // ✅
import { sendMessage } from "./_lib/telegram";     // ❌
```
</details>

<details>
<summary><b>Error: <code>secret token contains illegal characters</code></b></summary>

`WEBHOOK_SECRET` kamu mengandung karakter ilegal. Ganti jadi hanya `A-Z`, `a-z`, `0-9`, `_`, `-`.
</details>

<details>
<summary><b>Bot tidak balas pesan</b></summary>

1. Cek `getWebhookInfo` — ada `last_error_message`?
2. Cek log Vercel → tab **Logs**
3. Pastikan `BOT_TOKEN` & `WEBHOOK_SECRET` di Vercel **sama** dengan yang di-set saat `setWebhook`
4. Pastikan sudah **Redeploy** setelah ganti env
</details>

<details>
<summary><b>Error: <code>type: module</code> related</b></summary>

Pastikan `package.json` punya:

```json
{
  "type": "module"
}
```
</details>

---

## 🔐 Keamanan

- ❌ **Jangan** commit file `.env`
- ❌ **Jangan** share `BOT_TOKEN` ke publik
- ✅ Kalau token bocor → `/revoke` di [@BotFather](https://t.me/BotFather)
- ✅ Pakai `secret_token` di webhook untuk verifikasi
- ✅ `.env` sudah masuk `.gitignore`

---

## 🤝 Kontribusi

Pull request dipersilakan!

1. Fork repo ini
2. Buat branch fitur: `git checkout -b fitur/keren`
3. Commit: `git commit -m "feat: fitur keren"`
4. Push: `git push origin fitur/keren`
5. Buka Pull Request

---

## 📜 Lisensi

MIT License — bebas dipakai, dimodifikasi, dan dibagikan.

---

<div align="center">

### 💖 Dibuat dengan TypeScript & Vercel

**© 2025 [Masjjoooo](https://github.com/Masjjoooo)**

[![GitHub](https://img.shields.io/badge/GitHub-Masjjoooo-181717?style=for-the-badge&logo=github)](https://github.com/Masjjoooo)
[![Telegram](https://img.shields.io/badge/Live_Demo-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://bot-tele-omega-seven.vercel.app)

⭐ **Jangan lupa kasih bintang kalau repo ini bermanfaat!**

</div>
