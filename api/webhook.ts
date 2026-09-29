import { Bot, InlineKeyboard, webhookCallback, InputFile } from "grammy";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Environment Variables
const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = Number(process.env.ADMIN_ID || "0");

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// Gambar placeholder QRIS (bisa diganti URL link gambar QRIS asli Anda)
const QRIS_IMAGE_URL = "https://i.postimg.cc/3rBPcpG4/DANA-ALFRIEDO.jpg";

// 1. Menu Utama (/start)
// ==================== FITUR BROADCAST ADMIN ====================
bot.command("broadcast", async (ctx) => {
  // Hanya admin yang diizinkan menggunakan perintah ini
  if (ctx.from?.id !== adminId) {
    return ctx.reply("❌ Perintah ini khusus untuk Admin.");
  }

  // Mengambil isi pesan setelah kata /broadcast
  const pesanBroadcast = ctx.match?.trim();

  if (!pesanBroadcast) {
    return ctx.reply(
      "❌ Format salah!\n\n" +
      "Gunakan format:\n" +
      "`/broadcast <isi pesan>`\n\n" +
      "Contoh:\n" +
      "`/broadcast 📢 Halo semuanya! Stok slot sudah restock 100 slot. Silakan order!`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Sedang mengirim broadcast ke seluruh pelanggan...");

  // Ambil semua daftar ID pengguna dari database
  const { data: userList, error } = await supabase.from("users").select("user_id");

  if (error || !userList || userList.length === 0) {
    return ctx.reply("❌ Belum ada daftar pengguna di database.");
  }

  let sukses = 0;
  let gagal = 0;

  // Kirim ke tiap-tiap pengguna satu per satu
  for (const user of userList) {
    try {
      await ctx.api.sendMessage(user.user_id, pesanBroadcast, {
        parse_mode: "Markdown",
      });
      sukses++;
    } catch (err) {
      // Jika user memblokir bot, lewati tanpa membuat server error
      gagal++;
    }
  }

  // Laporan ke Admin setelah selesai
  await ctx.reply(
    `📢 *LAPORAN BROADCAST SELESAI*\n\n` +
    `✅ Berhasil terkirim: *${sukses} orang*\n` +
    `❌ Gagal / Diblokir: *${gagal} orang*`,
    { parse_mode: "Markdown" }
  );
});
// ===============================================================
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "Pelanggan";
  const username = ctx.from?.username ? `@${ctx.from.username}` : "-";

  // Simpan/Update pengguna ke database Supabase
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
    `👋 Halo *${userName}*!\n\nSelamat datang di Toko Tumbal Bot. Silakan pilih menu di bawah ini:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// 2. Menu Beli -> Menampilkan 4 Katalog Produk
bot.callbackQuery("menu_beli", async (ctx) => {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error || !products || products.length === 0) {
      return ctx.answerCallbackQuery({ text: "Gagal memuat data produk!", show_alert: true });
    }

    const keyboard = new InlineKeyboard();

    // Buat tombol untuk ke-4 produk
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

// ==================== PILIH KUANTITAS INTERAKTIF (+ dan -) ====================

// 3. Fungsi pembuat tampilan tombol counter
function buatKeyboardCounter(prodId: number, qty: number, harga: number) {
  const totalHarga = qty * harga;
  return new InlineKeyboard()
    .text("➖", `qty_min_${prodId}_${qty}`)
    .text(`📦 ${qty} Item`, "noop") // tombol display saja
    .text("➕", `qty_plus_${prodId}_${qty}`)
    .row()
    .text(`💳 Lanjut Pembayaran (Rp ${totalHarga.toLocaleString("id-ID")})`, `beli_${prodId}_${qty}`)
    .row()
    .text("⬅️ Kembali ke Katalog", "menu_beli");
}

// 1. Saat pertama kali produk dipilih (Default Qty = 1)
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
    `Gunakan tombol *[-] / [+]* di bawah ini untuk mengatur jumlah pembelian:`;

  await ctx.editMessageText(pesanPilihan, {
    parse_mode: "Markdown",
    reply_markup: buatKeyboardCounter(product.id, qtyAwal, harga),
  });
  await ctx.answerCallbackQuery();
});

// 2. Tombol Kurang (-)
bot.callbackQuery(/^qty_min_(\d+)_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const currentQty = parseInt(ctx.match[2]);

  if (currentQty <= 1) {
    return ctx.answerCallbackQuery({ text: "Jumlah minimal pembelian adalah 1 item!" });
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

// 3. Tombol Tambah (+)
bot.callbackQuery(/^qty_plus_(\d+)_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const currentQty = parseInt(ctx.match[2]);

  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();
  if (!product) return ctx.answerCallbackQuery();

  if (currentQty >= product.stock) {
    return ctx.answerCallbackQuery({ 
      text: `Maksimal pembelian hanya ${product.stock} item (sesuai sisa stok)!`, 
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

// 4. Tombol dummy agar tombol teks kuantitas tidak memunculkan error saat diklik
bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

=====// 3. User Memilih Jumlah Slot -> Buat Invoice & Kirim QRIS (Kode Unik = Jumlah Slot)
bot.callbackQuery(/^beli_(\d+)_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  const jumlahBeli = parseInt(ctx.match[2]);

  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

  if (!product || product.stock < jumlahBeli) {
    return ctx.answerCallbackQuery({ text: "Maaf, stok tidak mencukupi!", show_alert: true });
  }

  // Hitung subtotal dasar
  const subtotal = product.price * jumlahBeli;

  // Kode unik persis mengikuti jumlah slot yang dibeli
  const kodeUnik = jumlahBeli;

  // Total tagihan akhir yang harus ditransfer
  const totalTagihan = subtotal + kodeUnik;

  // Catat transaksi ke Supabase dengan nominal tagihan unik
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
    `📦 Pembelian: *${jumlahBeli} Slot*\n` +
    `💵 Harga Satuan: Rp ${product.price.toLocaleString("id-ID")}\n` +
    `🔢 Kode Unik: *+Rp ${kodeUnik}* (sesuai ${jumlahBeli} slot)\n` +
    `💰 *Total Tagihan: Rp ${totalTagihan.toLocaleString("id-ID")}*\n\n` +
    `⚠️ *PERHATIAN:*\n` +
    `Mohon transfer tepat hingga digit terakhir (*Rp ${totalTagihan.toLocaleString("id-ID")}*) agar pembayaran mudah diverifikasi.\n\n` +
    `📌 *Instruksi Pembayaran:*\n` +
    `1. Scan QRIS di atas via m-Banking atau E-Wallet.\n` +
    `2. Transfer sejumlah *Rp ${totalTagihan.toLocaleString("id-ID")}*.\n` +
    `3. *Kirim screenshot bukti transfer langsung ke bot ini.*`;

  await ctx.replyWithPhoto(QRIS_IMAGE_URL, {
    caption: invoiceText,
    parse_mode: "Markdown",
  });
});

// 4. Menu Profil Pembeli
bot.callbackQuery("menu_profil", async (ctx) => {
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.from.id)
    .eq("status", "SELESAI");

  const profilText =
    `👤 *PROFIL PENGGUNA*\n\n` +
    `• Nama: ${ctx.from.first_name}\n` +
    `• Telegram ID: \`${ctx.from.id}\`\n` +
    `• Transaksi Berhasil: *${count || 0}* kali`;

  const keyboard = new InlineKeyboard().text("⬅️ Kembali", "back_to_menu");

  await ctx.editMessageText(profilText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

// ==================== 5. ADMIN VERIFIKASI (ACC) ====================
bot.callbackQuery(/^acc_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (trx && trx.status !== "SELESAI") {
    // 1. Update status transaksi menjadi SELESAI
    await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trxId);

    // Hitung berapa item yang dibeli dari selisih amount / harga
    const jumlahBeli = (trx.amount % trx.products.price) || 1;

    // 2. KHUSUS PRODUK OTOMATIS: Cookie Fresh (ID 2), Cookie Bekas (ID 3), FP (ID 4)
    if (trx.product_id !== 1) {
      // Ambil data akun yang belum dipakai dari tabel product_stocks
      const { data: stockItems, error: stockErr } = await supabase
        .from("product_stocks")
        .select("*")
        .eq("product_id", trx.product_id)
        .eq("is_used", false)
        .limit(jumlahBeli);

      if (stockItems && stockItems.length > 0) {
        // Tandai data tersebut sudah terpakai
        const itemIds = stockItems.map((item) => item.id);
        await supabase.from("product_stocks").update({ is_used: true }).in("id", itemIds);

        // Sinkronkan sisa stok di tabel products
        await supabase
          .from("products")
          .update({ stock: Math.max(0, trx.products.stock - stockItems.length) })
          .eq("id", trx.product_id);

        // Susun isi data ke dalam format teks
        const isiTeksFile = stockItems.map((item) => item.account_data).join("\n\n");
        const fileBuffer = Buffer.from(isiTeksFile, "utf-8");

        const namaFileBersih = trx.products.name.replace(/\s+/g, "_");

        const pesanPengiriman =
          `🎉 *PEMBAYARAN DITERIMA!*\n\n` +
          `Pesanan *#TRX-${trx.id}* telah diverifikasi dan disetujui.\n` +
          `📦 Produk: *${trx.products.name} (${stockItems.length} item)*\n\n` +
          `✅ *Pesanan Anda terlampir pada file .txt di bawah ini.*\n` +
          `Terima kasih telah berbelanja!`;

        // Kirim file .txt ke pelanggan TANPA link/tombol chat admin
        await ctx.api.sendDocument(
          trx.user_id,
          new InputFile(fileBuffer, `${namaFileBersih}_TRX${trx.id}.txt`),
          {
            caption: pesanPengiriman,
            parse_mode: "Markdown",
          }
        );
      } else {
        // Antisipasi jika data di product_stocks ternyata habis
        await ctx.api.sendMessage(
          trx.user_id,
          `🎉 *PEMBAYARAN DITERIMA!*\n\nPesanan *#TRX-${trx.id}* disetujui, namun antrean stok otomatis sedang kosong. Admin akan segera mengirimkannya secara manual.`,
          { parse_mode: "Markdown" }
        );
      }
    } 
    // 3. KHUSUS PRODUK MANUAL: Slot Tumbal (ID 1)
    else {
      // Kurangi stok Slot Tumbal di tabel products
      if (trx.products.stock >= jumlahBeli) {
        await supabase
          .from("products")
          .update({ stock: trx.products.stock - jumlahBeli })
          .eq("id", trx.product_id);
      }

      const adminUsername = ctx.from?.username;
      const adminLink = adminUsername 
        ? `https://t.me/${adminUsername}` 
        : `tg://user?id=${adminId}`;

      const pesanManual = 
        `🎉 *PEMBAYARAN DITERIMA!*\n\n` +
        `Pesanan *#TRX-${trx.id}* telah diverifikasi dan disetujui.\n` +
        `Terima kasih atas pesanan Anda!\n\n` +
        `Silahkan konfirmasi akun ke [Saya](${adminLink})`;

      const customerKeyboard = new InlineKeyboard().url("💬 Chat Admin (Klaim Akun)", adminLink);

      await ctx.api.sendMessage(trx.user_id, pesanManual, {
        parse_mode: "Markdown",
        reply_markup: customerKeyboard,
      });
    }

    // Ubah tampilan pesan di chat admin
    await ctx.editMessageCaption({
      caption: `✅ *PESANAN #TRX-${trx.id} BERHASIL DI-ACC*\nSistem telah mengirimkan pesanan sesuai jenis produk.`,
      parse_mode: "Markdown",
    });
  }

  await ctx.answerCallbackQuery({ text: "Pesanan berhasil diproses." });
});

// 6. Tombol Kembali ke Menu Utama
bot.callbackQuery("back_to_menu", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🛒 Beli Slot", "menu_beli").row()
    .text("👤 Profil Saya", "menu_profil")
    .text("📜 Riwayat Pesanan", "menu_history").row()
    .url("💬 Hubungi Admin", `tg://user?id=${adminId || ctx.from?.id}`);

  await ctx.editMessageText(`👋 Halo *${ctx.from.first_name}*!\n\nSilakan pilih menu di bawah ini:`, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

// 7. Menerima Foto Bukti Transfer dari Pembeli
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id;

  // Cek pesanan aktif yang menunggu pembayaran
  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(name)")
    .eq("user_id", userId)
    .eq("status", "MENUNGGU_PEMBAYARAN")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!trx) {
    return ctx.reply("❌ Tidak ditemukan pesanan aktif yang menunggu bukti pembayaran.");
  }

  const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  // Ubah status jadi MENUNGGU_ACC
  await supabase
    .from("transactions")
    .update({ status: "MENUNGGU_ACC", payment_proof_file_id: photoId })
    .eq("id", trx.id);

  await ctx.reply(`✅ Bukti transfer untuk pesanan *#TRX-${trx.id}* sudah diterima.\nMohon tunggu admin memverifikasi pesanan Anda.`, {
    parse_mode: "Markdown",
  });

  // Notifikasi ke Admin beserta tombol ACC / Tolak
  if (adminId) {
    const adminKeyboard = new InlineKeyboard()
      .text("✅ Terima (ACC)", `acc_${trx.id}`)
      .text("❌ Tolak", `reject_${trx.id}`);

    const caption =
      `🚨 *PESANAN MASUK BARU* 🚨\n\n` +
      `🆔 Trx: #TRX-${trx.id}\n` +
      `👤 Pembeli: ${ctx.from.first_name} (\`${userId}\`)\n` +
      `📦 Item: ${trx.products?.name || "Slot"}\n` +
      `💰 Nominal: Rp ${trx.amount.toLocaleString("id-ID")}\n\n` +
      `Verifikasi bukti transfer di atas:`;

    await ctx.api.sendPhoto(adminId, photoId, {
      caption,
      parse_mode: "Markdown",
      reply_markup: adminKeyboard,
    });
  }
});

// 8. Admin Menyetujui (ACC) Pesanan
bot.callbackQuery(/^acc_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  const { data: trx } = await supabase.from("transactions").select("*, products(*)").eq("id", trxId).single();

  if (trx && trx.status !== "SELESAI") {
    // 1. Update status transaksi jadi SELESAI
    await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trxId);

    // 2. DI SINI LETAK SCRIPT PENGURANGAN STOK TERSEBUT:
    const jumlahBeli = (trx.amount % trx.products.price) || 1;
    if (trx.products && trx.products.stock >= jumlahBeli) {
      await supabase
        .from("products")
        .update({ stock: trx.products.stock - jumlahBeli })
        .eq("id", trx.product_id);
    }

    // 3. Ambil username atau link admin dari akun Anda
    const adminUsername = ctx.from?.username;
    const adminLink = adminUsername 
      ? `https://t.me/${adminUsername}` 
      : `tg://user?id=${adminId}`;

    const pesanSukses = 
      `🎉 *PEMBAYARAN DITERIMA!*\n\n` +
      `Pesanan *#TRX-${trx.id}* telah diverifikasi dan disetujui.\n` +
      `Terima kasih atas pesanan Anda!\n\n` +
      `Silahkan konfirmasi akun ke [Saya](${adminLink})`;

    const customerKeyboard = new InlineKeyboard().url("💬 Chat Admin (Klaim Akun)", adminLink);

    await ctx.api.sendMessage(
      trx.user_id,
      pesanSukses,
      { 
        parse_mode: "Markdown",
        reply_markup: customerKeyboard 
      }
    );

    await ctx.editMessageCaption({
      caption: `✅ *PESANAN #TRX-${trx.id} TELAH DI-ACC*\nPembeli sudah diarahkan ke chat Anda.`,
      parse_mode: "Markdown",
    });
  }
  await ctx.answerCallbackQuery({ text: "Pesanan berhasil disetujui." });
});

// 9. Admin Menolak Pesanan
bot.callbackQuery(/^reject_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  const { data: trx } = await supabase.from("transactions").select("*").eq("id", trxId).single();

  if (trx) {
    await supabase.from("transactions").update({ status: "DITOLAK" }).eq("id", trxId);

    // Beritahu pembeli
    await ctx.api.sendMessage(
      trx.user_id,
      `❌ *PEMBAYARAN DITOLAK*\nBukti pembayaran pesanan *#TRX-${trx.id}* tidak sesuai atau belum masuk. Hubungi admin untuk bantuan.`,
      { parse_mode: "Markdown" }
    );

    await ctx.editMessageCaption({
      caption: `❌ *PESANAN #TRX-${trx.id} TELAH DITOLAK*`,
      parse_mode: "Markdown",
    });
  }
  await ctx.answerCallbackQuery({ text: "Pesanan ditolak." });
});

// Ekspor handler webhook untuk Vercel
export default webhookCallback(bot, "http");
