import { Bot, InlineKeyboard, webhookCallback, InputFile } from "grammy";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Environment Variables
const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = parseInt(process.env.ADMIN_ID || "0");

const QRIS_IMAGE_URL = "https://haqwznpsrtojwyjkgigm.supabase.co/storage/v1/object/public/assets/qris.jpg";

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper pembuat tampilan tombol counter (+ dan -)
function buatKeyboardCounter(prodId: number, qty: number, harga: number) {
  const totalHarga = qty * harga;
  return new InlineKeyboard()
    .text("➖", `qty_min_${prodId}_${qty}`)
    .text(`📦 ${qty} Item`, "noop")
    .text("➕", `qty_plus_${prodId}_${qty}`)
    .row()
    .text(`💳 Lanjut Pembayaran (Rp ${totalHarga.toLocaleString("id-ID")})`, `beli_${prodId}_${qty}`)
    .row()
    .text("⬅️ Kembali ke Katalog", "menu_beli");
}

// 1. MENU UTAMA (/start)
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "Pelanggan";
  const username = ctx.from?.username ? `@${ctx.from.username}` : "-";

  if (userId) {
    await supabase.from("users").upsert({
      user_id: userId,
      username: username,
      first_name: userName,
    });
  }

  const keyboard = new InlineKeyboard()
    .text("🛒 Katalog Produk", "menu_beli").row()
    .text("👤 Profil Saya", "menu_profil")
    .text("📜 Riwayat Pesanan", "menu_history").row()
    .url("💬 Hubungi Admin", `tg://user?id=${adminId || ctx.from?.id}`);

  await ctx.reply(
    `👋 Halo *${userName}*!\n\nSelamat datang di Store Bot. Silakan pilih menu di bawah ini:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// 2. KATALOG PRODUK
bot.callbackQuery("menu_beli", async (ctx) => {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error || !products || products.length === 0) {
      return ctx.answerCallbackQuery({ text: "Gagal memuat produk!", show_alert: true });
    }

    const keyboard = new InlineKeyboard();

    products.forEach((prod) => {
      const statusStok = prod.stock > 0 ? `(Stok: ${prod.stock})` : "[HABIS]";
      keyboard
        .text(`📦 ${prod.name} - Rp ${Number(prod.price).toLocaleString("id-ID")} ${statusStok}`, `pilih_prod_${prod.id}`)
        .row();
    });
    keyboard.text("⬅️ Kembali ke Menu", "back_to_menu");

    await ctx.editMessageText(
      `🛒 *KATALOG PRODUK*\n\nSilakan pilih produk yang ingin Anda beli:`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } catch (err: any) {
    console.error("Error Katalog:", err);
  }
});

// 3. PILIH PRODUK -> TAMPILKAN COUNTER (+ dan -)
bot.callbackQuery(/^pilih_prod_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();

  if (!product) {
    return ctx.answerCallbackQuery({ text: "Produk tidak ditemukan!", show_alert: true });
  }

  if (product.stock <= 0) {
    const adminLink = adminId ? `tg://user?id=${adminId}` : "https://t.me";
    const pesanHabis = 
      `⚠️ *PEMBERITAHUAN*\n\n` +
      `Maaf, stok untuk *${product.name}* sedang habis!\n` +
      `Silakan hubungi admin untuk info restock.`;

    const keyboardHabis = new InlineKeyboard()
      .url("💬 Tanya Admin", adminLink).row()
      .text("⬅️ Pilih Produk Lain", "menu_beli");

    return await ctx.editMessageText(pesanHabis, {
      parse_mode: "Markdown",
      reply_markup: keyboardHabis,
    });
  }

  const harga = Number(product.price);
  const stok = Number(product.stock);
  const qtyAwal = 1;

  const pesanPilihan = 
    `📦 *PRODUK: ${product.name}*\n\n` +
    `💵 *Harga Satuan:* Rp ${harga.toLocaleString("id-ID")}\n` +
    `📊 *Sisa Stok Tersedia:* ${stok} item\n\n` +
    `Gunakan tombol *[-] / [+]* di bawah untuk menentukan jumlah:`;

  await ctx.editMessageText(pesanPilihan, {
    parse_mode: "Markdown",
    reply_markup: buatKeyboardCounter(product.id, qtyAwal, harga),
  });
  await ctx.answerCallbackQuery();
});

// Tombol Kurang (-)
bot.callbackQuery(/^qty_min_(\d+)_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const currentQty = parseInt(ctx.match[2]);

  if (currentQty <= 1) {
    return ctx.answerCallbackQuery({ text: "Minimal pembelian adalah 1 item!" });
  }

  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();
  if (!product) return ctx.answerCallbackQuery();

  const newQty = currentQty - 1;
  const harga = Number(product.price);

  await ctx.editMessageReplyMarkup({
    reply_markup: buatKeyboardCounter(prodId, newQty, harga),
  });
  await ctx.answerCallbackQuery();
});

// Tombol Tambah (+)
bot.callbackQuery(/^qty_plus_(\d+)_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const currentQty = parseInt(ctx.match[2]);

  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();
  if (!product) return ctx.answerCallbackQuery();

  if (currentQty >= product.stock) {
    return ctx.answerCallbackQuery({ 
      text: `Maksimal pembelian hanya ${product.stock} item!`, 
      show_alert: true 
    });
  }

  const newQty = currentQty + 1;
  const harga = Number(product.price);

  await ctx.editMessageReplyMarkup({
    reply_markup: buatKeyboardCounter(prodId, newQty, harga),
  });
  await ctx.answerCallbackQuery();
});

// Tombol dummy teks kuantitas
bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// 4. BUAT INVOICE PEMBAYARAN
bot.callbackQuery(/^beli_(\d+)_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  const jumlahBeli = parseInt(ctx.match[2]);

  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

  if (!product || product.stock < jumlahBeli) {
    return ctx.answerCallbackQuery({ text: "Maaf, stok tidak mencukupi!", show_alert: true });
  }

  const subtotal = product.price * jumlahBeli;
  const kodeUnik = jumlahBeli;
  const totalTagihan = subtotal + kodeUnik;

  const { data: trx, error } = await supabase.from("transactions").insert([
    {
      user_id: ctx.from.id,
      username: ctx.from.username ? `@${ctx.from.username}` : "-",
      user_name: ctx.from.first_name || "User",
      product_id: product.id,
      amount: totalTagihan,
      status: "MENUNGGU_PEMBAYARAN",
    },
  ]).select().single();

  if (error || !trx) {
    return ctx.answerCallbackQuery({ text: "Gagal membuat invoice.", show_alert: true });
  }

  await ctx.deleteMessage();

  const invoiceText =
    `🧾 *INVOICE PEMBAYARAN #TRX-${trx.id}*\n\n` +
    `📦 Produk: *${product.name} (${jumlahBeli} item)*\n` +
    `💵 Harga Satuan: Rp ${product.price.toLocaleString("id-ID")}\n` +
    `🔢 Kode Unik: *+Rp ${kodeUnik}*\n` +
    `💰 *Total Tagihan: Rp ${totalTagihan.toLocaleString("id-ID")}*\n\n` +
    `⚠️ *PERHATIAN:*\n` +
    `Mohon transfer tepat hingga nominal digit terakhir (*Rp ${totalTagihan.toLocaleString("id-ID")}*).\n\n` +
    `📌 *Instruksi:*\n` +
    `1. Scan QRIS di atas.\n` +
    `2. Transfer sejumlah *Rp ${totalTagihan.toLocaleString("id-ID")}*.\n` +
    `3. *Kirim screenshot bukti transfer langsung ke bot ini.*`;

  await ctx.replyWithPhoto(QRIS_IMAGE_URL, {
    caption: invoiceText,
    parse_mode: "Markdown",
  });
});

// 5. TERIMA BUKTI TRANSFER (FOTO)
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id;

  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("user_id", userId)
    .eq("status", "MENUNGGU_PEMBAYARAN")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!trx) {
    return ctx.reply("❌ Tidak ada pesanan menunggu pembayaran. Gunakan /start untuk memesan.");
  }

  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  await supabase
    .from("transactions")
    .update({ payment_proof_file_id: fileId, status: "MENUNGGU_ACC" })
    .eq("id", trx.id);

  await ctx.reply("✅ Bukti pembayaran berhasil diterima. Mohon tunggu verifikasi admin.");

  const adminKeyboard = new InlineKeyboard()
    .text("✅ Terima (ACC)", `acc_${trx.id}`)
    .text("❌ Tolak", `reject_${trx.id}`);

  const keteranganAdmin =
    `🔔 *PESANAN MASUK!*\n\n` +
    `🆔 *ID:* #TRX-${trx.id}\n` +
    `👤 *Pembeli:* ${trx.user_name} (${trx.username})\n` +
    `📦 *Produk:* ${trx.products?.name}\n` +
    `💰 *Total:* Rp ${trx.amount.toLocaleString("id-ID")}`;

  await ctx.api.sendPhoto(adminId, fileId, {
    caption: keteranganAdmin,
    parse_mode: "Markdown",
    reply_markup: adminKeyboard,
  });
});

// 6. ADMIN ACC
bot.callbackQuery(/^acc_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (trx && trx.status !== "SELESAI") {
    await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trxId);
    const jumlahBeli = (trx.amount % trx.products.price) || 1;

    // Untuk Cookie Fresh, Cookie Bekas, FP (ID selain 1) -> Kirim file .txt
    if (trx.product_id !== 1) {
      const { data: stockItems } = await supabase
        .from("product_stocks")
        .select("*")
        .eq("product_id", trx.product_id)
        .eq("is_used", false)
        .limit(jumlahBeli);

      if (stockItems && stockItems.length > 0) {
        const itemIds = stockItems.map((item) => item.id);
        await supabase.from("product_stocks").update({ is_used: true }).in("id", itemIds);

        await supabase
          .from("products")
          .update({ stock: Math.max(0, trx.products.stock - stockItems.length) })
          .eq("id", trx.product_id);

        const isiTeksFile = stockItems.map((item) => item.account_data).join("\n\n");
        const fileBuffer = Buffer.from(isiTeksFile, "utf-8");
        const namaFile = trx.products.name.replace(/\s+/g, "_");

        const pesanPengiriman =
          `🎉 *PEMBAYARAN DITERIMA!*\n\n` +
          `Pesanan *#TRX-${trx.id}* telah disetujui.\n` +
          `📦 Produk: *${trx.products.name} (${stockItems.length} item)*\n\n` +
          `✅ Pesanan Anda terlampir pada file *.txt* di bawah ini.`;

        await ctx.api.sendDocument(
          trx.user_id,
          new InputFile(fileBuffer, `${namaFile}_TRX${trx.id}.txt`),
          { caption: pesanPengiriman, parse_mode: "Markdown" }
        );
      }
    } else {
      // Untuk Slot Tumbal (ID 1) -> Kirim tautan chat manual
      if (trx.products.stock >= jumlahBeli) {
        await supabase
          .from("products")
          .update({ stock: trx.products.stock - jumlahBeli })
          .eq("id", trx.product_id);
      }

      const adminUsername = ctx.from?.username;
      const adminLink = adminUsername ? `https://t.me/${adminUsername}` : `tg://user?id=${adminId}`;
      const pesanManual = 
        `🎉 *PEMBAYARAN DITERIMA!*\n\n` +
        `Pesanan *#TRX-${trx.id}* telah diverifikasi.\n\n` +
        `Silahkan konfirmasi akun ke [Saya](${adminLink})`;

      const customerKeyboard = new InlineKeyboard().url("💬 Chat Admin (Klaim Akun)", adminLink);
      await ctx.api.sendMessage(trx.user_id, pesanManual, { parse_mode: "Markdown", reply_markup: customerKeyboard });
    }

    await ctx.editMessageCaption({
      caption: `✅ *PESANAN #TRX-${trx.id} TELAH DI-ACC*`,
      parse_mode: "Markdown",
    });
  }
  await ctx.answerCallbackQuery({ text: "Pesanan diproses." });
});

// 7. ADMIN REJECT
bot.callbackQuery(/^reject_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  await supabase.from("transactions").update({ status: "DITOLAK" }).eq("id", trxId);
  await ctx.api.sendMessage(adminId, `❌ Pesanan #TRX-${trxId} telah ditolak.`);
  await ctx.answerCallbackQuery({ text: "Pesanan ditolak." });
});

// 8. MENU LAINNYA & BROADCAST
bot.command("broadcast", async (ctx) => {
  if (ctx.from?.id !== adminId) return;
  const pesan = ctx.match?.trim();
  if (!pesan) return ctx.reply("Format: `/broadcast <pesan>`");

  const { data: users } = await supabase.from("users").select("user_id");
  if (users) {
    for (const u of users) {
      try {
        await ctx.api.sendMessage(u.user_id, pesan, { parse_mode: "Markdown" });
      } catch {}
    }
  }
  await ctx.reply("✅ Broadcast selesai dikirim.");
});

bot.callbackQuery("back_to_menu", async (ctx) => {
  const userName = ctx.from?.first_name || "Pelanggan";
  const keyboard = new InlineKeyboard()
    .text("🛒 Katalog Produk", "menu_beli").row()
    .text("👤 Profil Saya", "menu_profil")
    .text("📜 Riwayat Pesanan", "menu_history").row()
    .url("💬 Hubungi Admin", `tg://user?id=${adminId || ctx.from?.id}`);

  await ctx.editMessageText(
    `👋 Halo *${userName}*!\n\nSelamat datang di Store Bot. Silakan pilih menu di bawah ini:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

bot.callbackQuery("menu_profil", async (ctx) => {
  const profilText = `👤 *PROFIL*\n\n• Nama: ${ctx.from.first_name}\n• ID: \`${ctx.from.id}\``;
  const keyboard = new InlineKeyboard().text("⬅️ Kembali", "back_to_menu");
  await ctx.editMessageText(profilText, { parse_mode: "Markdown", reply_markup: keyboard });
});

bot.callbackQuery("menu_history", async (ctx) => {
  const { data: listTrx } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", ctx.from.id)
    .order("id", { ascending: false })
    .limit(5);

  let riwayatText = `📜 *5 TRANSAKSI TERAKHIR*\n\n`;
  if (!listTrx || listTrx.length === 0) {
    riwayatText += `_Belum ada riwayat pesanan._`;
  } else {
    listTrx.forEach((trx) => {
      riwayatText += `• *#TRX-${trx.id}* | Rp ${trx.amount.toLocaleString("id-ID")} | \`${trx.status}\`\n`;
    });
  }

  const keyboard = new InlineKeyboard().text("⬅️ Kembali", "back_to_menu");
  await ctx.editMessageText(riwayatText, { parse_mode: "Markdown", reply_markup: keyboard });
});

export default webhookCallback(bot, "http");
