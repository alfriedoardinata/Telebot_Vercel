import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const qrisRawString = process.env.QRIS_RAW_STRING || "";
const adminId = 1294259168;

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== HELPER: CRC16 & QRIS DINAMIS ====================
function hitungCRC16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) hex = "0" + hex;
  return hex;
}

function buatQRISDinamis(rawString: string, nominal: number): string {
  let cleanString = rawString.trim();
  if (cleanString.endsWith("6304")) {
    cleanString = cleanString.slice(0, -4);
  } else if (/6304[0-9A-Fa-f]{4}$/.test(cleanString)) {
    cleanString = cleanString.slice(0, -8);
  }

  cleanString = cleanString.replace("010211", "010212");

  const nominalStr = nominal.toString();
  const panjangNominal = nominalStr.length.toString().padStart(2, "0");
  const tag54 = `54${panjangNominal}${nominalStr}5802ID`;

  let baseQR = "";
  if (cleanString.includes("5802ID")) {
    baseQR = cleanString.replace(/5802ID.*/, tag54);
  } else {
    baseQR = cleanString + tag54;
  }

  const payloadSebelumCRC = baseQR + "6304";
  const nilaiCRC = hitungCRC16(payloadSebelumCRC);
  return payloadSebelumCRC + nilaiCRC;
}

// ==================== 1. COMMAND: /start ====================
const pesanMenuUtama =
  "👋 <b>Selamat Datang di Toko Tumbal Bot!</b>\n" +
  "━━━━━━━━━━━━━━━━━━━━━━\n" +
  "Layanan otomatis penyedia akun tumbal dan berkas digital dengan verifikasi instan QRIS DANA.\n\n" +
  "⚡ <b>Keunggulan Sistem:</b>\n" +
  "• Pengiriman berkas instan otomatis 24/7\n" +
  "• Tanpa antre konfirmasi manual admin\n" +
  "• Pembayaran QRIS mendukung seluruh e-wallet & m-banking\n" +
  "━━━━━━━━━━━━━━━━━━━━━━\n" +
  "Silakan pilih menu transaksi di bawah:";

function keyboardMenuUtama() {
  return new InlineKeyboard()
    .text("🟢 Beli Produk", "menu_katalog")
    .text("📜 Riwayat Pesanan", "menu_riwayat")
    .row()
    .text("ℹ️ Panduan Pembayaran", "menu_panduan")
    .text("💬 Hubungi Admin", "menu_admin")
    .row()
    .text("🔄 Segarkan Bot", "menu_start");
}

bot.command("start", async (ctx) => {
  await ctx.reply(pesanMenuUtama, { reply_markup: keyboardMenuUtama(), parse_mode: "HTML" });
});

bot.callbackQuery("menu_start", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
  } catch {}
  try {
    await ctx.editMessageText(pesanMenuUtama, { reply_markup: keyboardMenuUtama(), parse_mode: "HTML" });
  } catch {
    await ctx.reply(pesanMenuUtama, { reply_markup: keyboardMenuUtama(), parse_mode: "HTML" });
  }
});

// ==================== 2. MENU: KATALOG PRODUK ====================
bot.callbackQuery("menu_katalog", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
  } catch {}

  const { data: products } = await supabase.from("products").select("*").order("id", { ascending: true });

  const keyboard = new InlineKeyboard();

  if (products && products.length > 0) {
    for (const p of products) {
      if (p.stock > 0) {
        keyboard.text(`🟢 ${p.name} - Rp ${p.price.toLocaleString("id-ID")} (Stok: ${p.stock})`, `detail_${p.id}`).row();
      } else {
        keyboard.text(`🔴 ${p.name} - Rp ${p.price.toLocaleString("id-ID")} [HABIS]`, `stok_habis_${p.id}`).row();
      }
    }
  }

  keyboard.text("🔙 Kembali ke Menu", "menu_start");

  const teksKatalog =
    "🛍️ <b>KATALOG PRODUK TERSEDIA</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Pilih produk yang ingin Anda beli dari daftar di bawah.\n" +
    "Stok diperbarui secara <i>real-time</i> oleh sistem.\n" +
    "━━━━━━━━━━━━━━━━━━━━━━";

  await ctx.editMessageText(teksKatalog, { reply_markup: keyboard, parse_mode: "HTML" });
});

bot.callbackQuery(/^stok_habis_/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "⚠️ Maaf, stok produk ini sedang habis!", show_alert: true });
});

// ==================== 3. MENU: DETAIL PRODUK & PILIH JUMLAH ====================
bot.callbackQuery(/^detail_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  try {
    await ctx.answerCallbackQuery();
  } catch {}

  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

  if (!product || product.stock <= 0) {
    return ctx.answerCallbackQuery({ text: "⚠️ Produk tidak ditemukan atau stok kosong.", show_alert: true });
  }

  const keyboard = new InlineKeyboard();
  const opsiJumlah = [1, 2, 5, 10].filter((jml) => jml <= product.stock);
  if (!opsiJumlah.includes(1) && product.stock >= 1) opsiJumlah.unshift(1);

  for (const jml of opsiJumlah) {
    keyboard.text(`🟢 Beli ${jml} Item`, `beli_${product.id}_${jml}`);
  }
  keyboard.row().text("🔙 Kembali ke Katalog", "menu_katalog");

  const teksDetail =
    `📦 <b>DETAIL PRODUK: ${product.name.toUpperCase()}</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    `💵 <b>Harga Satuan:</b> Rp ${product.price.toLocaleString("id-ID")}\n` +
    `📊 <b>Sisa Stok:</b> ${product.stock} item\n` +
    `📝 <b>Keterangan:</b> ${product.description || "Pengiriman otomatis file .txt langsung di obrolan ini."}\n` +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Pilih jumlah pembelian:";

  await ctx.editMessageText(teksDetail, { reply_markup: keyboard, parse_mode: "HTML" });
});

// ==================== 4. BUAT INVOICE & QRIS DINAMIS ====================
bot.callbackQuery(/^beli_(\d+)_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  const jumlahBeli = parseInt(ctx.match[2]);

  try {
    await ctx.answerCallbackQuery({ text: "⚡ Menyiapkan invoice..." });
  } catch {}

  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

  if (!product || product.stock < jumlahBeli) {
    return ctx.reply("⚠️ Stok tidak mencukupi untuk jumlah pembelian ini.");
  }

  const subtotal = product.price * jumlahBeli;
  const kodeUnik = Math.floor(Math.random() * 150) + 1;
  const totalTagihan = subtotal + kodeUnik;

  const { data: newTrx, error } = await supabase
    .from("transactions")
    .insert({
      user_id: ctx.from.id,
      user_name: ctx.from.first_name,
      username: ctx.from.username || null,
      product_id: product.id,
      amount: totalTagihan,
      status: "MENUNGGU_PEMBAYARAN",
    })
    .select()
    .single();

  if (error || !newTrx) {
    return ctx.reply("❌ Gagal membuat transaksi. Silakan coba kembali.");
  }

  // QR code generated via URL publik berkecepatan tinggi tanpa dependensi local canvas
  const qrisStringFinal = buatQRISDinamis(qrisRawString, totalTagihan);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=10&data=${encodeURIComponent(qrisStringFinal)}`;

  const invoiceKeyboard = new InlineKeyboard()
    .text("🔄 Cek Pembayaran", `cek_bayar_${newTrx.id}`)
    .text("🔴 Batalkan Pesanan", `batal_${newTrx.id}`)
    .row()
    .text("💬 Bantuan Admin", "menu_admin");

  const teksInvoice =
    `🧾 <b>INVOICE PEMBAYARAN #TRX-${newTrx.id}</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    `📦 <b>Produk:</b> ${product.name}\n` +
    `🔢 <b>Jumlah:</b> ${jumlahBeli} item\n` +
    `💰 <b>Subtotal:</b> Rp ${subtotal.toLocaleString("id-ID")}\n` +
    `🎟️ <b>Kode Unik:</b> Rp ${kodeUnik}\n` +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    `💵 <b>TOTAL WAJIB TRANSFER:</b>\n` +
    `👉 <code>${totalTagihan}</code> <i>(Ketuk untuk menyalin)</i>\n` +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    "📌 <b>PETUNJUK BAYAR INSTAN:</b>\n" +
    "1. Scan QRIS di atas via <b>DANA, GoPay, OVO, ShopeePay, BCA, atau m-Banking</b>.\n" +
    "2. Nominal transfer otomatis terkunci sesuai tagihan.\n" +
    "3. Setelah berhasil, bot akan <b>langsung mengirim berkas pesanan</b> tanpa perlu menekan tombol apa pun!";

  try {
    await ctx.deleteMessage();
  } catch {}

  await ctx.replyWithPhoto(qrImageUrl, {
    caption: teksInvoice,
    parse_mode: "HTML",
    reply_markup: invoiceKeyboard,
  });
});

// ==================== 5. HANDLER: CEK STATUS PEMBAYARAN ====================
bot.callbackQuery(/^cek_bayar_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);

  try {
    await ctx.answerCallbackQuery({ text: "🔍 Memeriksa status transaksi..." });
  } catch {}

  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (!trx) {
    return ctx.reply("❌ Transaksi tidak ditemukan.");
  }

  if (trx.status === "SELESAI") {
    try {
      await ctx.deleteMessage();
    } catch {}
    return ctx.reply("✅ <b>Pembayaran lunas! Produk telah dikirimkan ke chat ini.</b>", { parse_mode: "HTML" });
  }

  if (trx.status === "BATAL" || trx.status === "DITOLAK") {
    return ctx.reply("⚠️ Pesanan ini sudah dibatalkan.");
  }

  await ctx.reply(
    "⏳ <b>MENUNGGU PEMBAYARAN</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    `Tagihan: <b>Rp ${trx.amount.toLocaleString("id-ID")}</b>\n\n` +
    "Sistem mendeteksi transaksi secara <b>otomatis dalam 5-15 detik</b> setelah uang masuk ke DANA.\n" +
    "Pastikan nominal transfer persis sama hingga digit terakhir.",
    { parse_mode: "HTML" }
  );
});

// ==================== 6. HANDLER: BATALKAN PESANAN ====================
bot.callbackQuery(/^batal_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);

  await supabase.from("transactions").update({ status: "BATAL" }).eq("id", trxId);

  try {
    await ctx.answerCallbackQuery({ text: "Pesanan dibatalkan." });
    await ctx.deleteMessage();
  } catch {}

  const keyboard = new InlineKeyboard().text("🟢 Buka Katalog", "menu_katalog");
  await ctx.reply("🛑 <b>Pesanan telah dibatalkan.</b> Silakan pesan kembali jika membutuhkan item.", {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
});

// ==================== 7. MENU: RIWAYAT & BANTUAN ====================
bot.callbackQuery("menu_riwayat", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
  } catch {}

  const { data: listTrx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("user_id", ctx.from.id)
    .order("id", { ascending: false })
    .limit(5);

  const keyboard = new InlineKeyboard().text("🔙 Kembali ke Menu", "menu_start");

  if (!listTrx || listTrx.length === 0) {
    return ctx.editMessageText("📜 <b>Riwayat Transaksi</b>\n\nAnda belum memiliki riwayat pembelian.", {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  let teks = "📜 <b>5 RIWAYAT TRANSAKSI TERAKHIR</b>\n━━━━━━━━━━━━━━━━━━━━━━\n";
  for (const t of listTrx) {
    const statusIcon = t.status === "SELESAI" ? "✅" : t.status === "BATAL" ? "❌" : "⏳";
    teks += `${statusIcon} <b>#TRX-${t.id}</b> | ${t.products?.name || "Produk"}\n`;
    teks += `💵 Rp ${t.amount.toLocaleString("id-ID")} • <i>Status: ${t.status}</i>\n\n`;
  }
  teks += "━━━━━━━━━━━━━━━━━━━━━━";

  await ctx.editMessageText(teks, { reply_markup: keyboard, parse_mode: "HTML" });
});

bot.callbackQuery("menu_panduan", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
  } catch {}

  const keyboard = new InlineKeyboard()
    .text("🟢 Mulai Beli", "menu_katalog")
    .row()
    .text("🔙 Kembali ke Menu", "menu_start");

  const teksPanduan =
    "ℹ️ <b>PANDUAN PEMBAYARAN QRIS</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    "1. Pilih produk dan jumlah pesanan yang Anda butuhkan.\n" +
    "2. Simpan gambar QRIS atau scan langsung menggunakan aplikasi pembayaran pilihan Anda.\n" +
    "3. <b>PENTING:</b> Transfer sesuai nominal hingga 3 digit terakhir (jangan dibulatkan).\n" +
    "4. Begitu transfer berhasil, berkas pesanan berupa file <b>.txt</b> akan langsung terkirim otomatis di chat ini.\n" +
    "━━━━━━━━━━━━━━━━━━━━━━";

  await ctx.editMessageText(teksPanduan, { reply_markup: keyboard, parse_mode: "HTML" });
});

bot.callbackQuery("menu_admin", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
  } catch {}

  const keyboard = new InlineKeyboard()
    .url("💬 Chat Admin Telegram", "https://t.me/alfriedoardinata")
    .row()
    .text("🔙 Kembali ke Menu", "menu_start");

  const teksAdmin =
    "👨‍💻 <b>LAYANAN BANTUAN & ADMIN</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Kendala transaksi, klaim garansi, atau request stok akun dalam jumlah besar dapat langsung menghubungi admin resmi kami di bawah ini.\n" +
    "━━━━━━━━━━━━━━━━━━━━━━";

  await ctx.editMessageText(teksAdmin, { reply_markup: keyboard, parse_mode: "HTML" });
});

// ==================== VERCEL HANDLER ====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("Error webhook bot:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(200).send("Bot webhook is running!");
}
