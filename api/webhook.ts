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
bot.command("start", async (ctx) => {
  const userName = ctx.from?.first_name || "Pelanggan";
  const keyboard = new InlineKeyboard()
    .text("🛒 Beli Slot", "menu_beli").row()
    .text("👤 Profil Saya", "menu_profil")
    .text("📜 Riwayat Pesanan", "menu_history").row()
    .url("💬 Hubungi Admin", `tg://user?id=${adminId || ctx.from?.id}`);

  await ctx.reply(
    `👋 Halo *${userName}*!\n\nSelamat datang di Toko Tumbal Bot. Silakan pilih menu di bawah ini:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// 2. Klik Tombol Beli Slot -> Menampilkan Info Harga & Pilihan Jumlah Slot
bot.callbackQuery("menu_beli", async (ctx) => {
  try {
    // Ambil semua data produk tanpa limit strict
    const { data: products, error } = await supabase.from("products").select("*");

    // Jika terjadi error saat koneksi ke Supabase
    if (error) {
      console.error("Supabase Error:", error);
      return ctx.answerCallbackQuery({ 
        text: `Error Database: ${error.message}`, 
        show_alert: true 
      });
    }

    // Jika tabel produk benar-benar kosong
    if (!products || products.length === 0) {
      return ctx.answerCallbackQuery({ 
        text: "Tabel produk masih kosong di Supabase!", 
        show_alert: true 
      });
    }

    // Ambil produk pertama (Slot Tumbal)
    const product = products[0];

    if (!product || product.stock <= 0) {
      return ctx.answerCallbackQuery({ 
        text: `Stok slot tercatat: ${product?.stock ?? 0}. Silakan isi stok di Supabase.`, 
        show_alert: true 
      });
    }

    const hargaPerSlot = Number(product.price);
    const stok = Number(product.stock);

    // Daftar opsi kuantitas yang bisa dipilih
    const opsiJumlah = [1, 2, 3, 5, 10];
    const keyboard = new InlineKeyboard();

    opsiJumlah.forEach((jumlah) => {
      if (jumlah <= stok) {
        const totalHarga = jumlah * hargaPerSlot;
        keyboard.text(`🔹 ${jumlah} Slot - Rp ${totalHarga.toLocaleString("id-ID")}`, `beli_${product.id}_${jumlah}`).row();
      }
    });
    keyboard.text("⬅️ Kembali", "back_to_menu");

    const pesanBeli = 
      `🛒 *BELI SLOT*\n\n` +
      `📦 *Produk:* ${product.name}\n` +
      `💵 *Harga per Slot:* Rp ${hargaPerSlot.toLocaleString("id-ID")}\n` +
      `📊 *Sisa Stok:* ${stok} slot\n\n` +
      `Silakan tentukan jumlah slot yang ingin dibeli:`;

    await ctx.editMessageText(pesanBeli, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (err: any) {
    console.error("Catch Error:", err);
    return ctx.answerCallbackQuery({ 
      text: `Kendala: ${err.message || "Gagal memuat produk"}`, 
      show_alert: true 
    });
  }
});

// 3. User Memilih Jumlah Slot -> Buat Invoice & Kirim QRIS (Kode Unik = Jumlah Slot)
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

// 5. Menu Riwayat Pesanan
bot.callbackQuery("menu_history", async (ctx) => {
  const { data: list } = await supabase
    .from("transactions")
    .select("*, products(name)")
    .eq("user_id", ctx.from.id)
    .order("id", { ascending: false })
    .limit(5);

  let text = "📜 *5 RIWAYAT PESANAN TERAKHIR*\n\n";
  if (!list || list.length === 0) {
    text += "_Belum ada transaksi._";
  } else {
    list.forEach((t) => {
      const statusBadge =
        t.status === "SELESAI" ? "✅ Berhasil" : (t.status === "DITOLAK" ? "❌ Ditolak" : "⏳ Menunggu Bukti/ACC");
      text += `• #TRX-${t.id} | ${t.products?.name || "Slot"} | Rp ${t.amount.toLocaleString("id-ID")}\n  Status: ${statusBadge}\n`;
    });
  }

  const keyboard = new InlineKeyboard().text("⬅️ Kembali", "back_to_menu");

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
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
