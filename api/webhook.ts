import { Bot, InlineKeyboard, webhookCallback, InputFile } from "grammy";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Environment Variables & Konfigurasi
const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = 1294259168;

const GOBIZ_TOKEN = process.env.GOBIZ_TOKEN || "eyJhbGciOiJkaXIiLCJjdHkiOiJKV1QiLCJlbmMiOiJBMTI4R0NNIiwidHlwIjoiSldUIiwiemlwIjoiREVGIn0..J1-B62Rd2fW4dS1H.cb_lhRxcOust-stoafwrDr2GDRC2O7u6toGob9c14CRlN1AN2_xqcpwNs4kx4YBhsCmZuZ48dSN7hTOqYhFnfvnRa59_uK0seNY9ZFuzxuRPll24qu3TYZrX-SG9mIaZbmdq9pe3qTgVqoaC9wYWCoebMfVBsOZ26WumgNZIwlIj3BeqwBjwpXbvXQH0qQmMhQSNbGJk2nYW95G8MHJKL1NUB_VQGIxrxtkCjrQgOZCypkaaA5iyQSVQc6OOVYZ0Y0R3MiT5TTvXUNyJIPg9tXB1jbTFhyC9yEHta9rlBkcLiIsvsdpzgHFfHg1aou3LmHeSkrkwstMRwIXCOzI1YAkrBk3NtC3yAhtjsBc5hSmymJf7cLYv2mG2GVKWqg4cPoafhK1-iZf0km0rWjPy3hqEIW9vDZr1OE_P5ip0nNb_0U2EZa-abcYKRmyUCIKg1h0mYDC15sdMrjHFuX8DvCnRwXYbKtV3gB4eQwZkDq0nBTQ5NiFFyRa2oSDaqLy8G6z-LhfaKZ_tjTNA18lfzuyh6I4wWHRpvSnzz4kqOepqBJ1nhQ09UrrFD6oUV1He5Er-VINDAVYANh5-4GpXv49FMU5eaoqI217ii1ocxjbghEXnq5BTXZhvLOeMtGTt91cWqVA-v5QdG7GFhkbtgX5aTOvh0dVSx1Xt4ZnV2RTH4Es7BifMgZZX2QwxSJpUvHPvFWguZ83d_i8rlC5UEMQGoYFzm6I0FNeOobJCmHNKyVeVK5fj-bhJZWW-ZLzrMXC4Nv1GG8e4Ci3HjOpml6Rs9B2LaxKEtWRam73mASwHx_GeP8EKG5vKi7m_LGjdO_-oQiDyuErOm7z3I9Us42J26PNTUeL7qqFtxH3kH9azZrf2LMo9r9zCXQlNr4ATigsNaeyiald4CfCyNzRIo8jcSg-4dCLmfoNvMFrUs_XRHKKKwqTVSqoZsRcRGk5hIbKow1jhNZ7uqneqDDcwsf2x9heM3Mjq77807LZa3zUC-xnfiuChP5A5Qm_5eaM5f8-YuhKK6SvpzZfT2gIA-9NA8NbHmvfDZDxH4SQTXlW1Bp7YEvVFEQOyQwgw-xd6K6aLnxzw4fG5Q1GBRcc7oKPMbY_WWuNo429vRWMrUNexsUbhTayO-oPioGtU60Da7qTa0a4VvxisUUffJFcQ-zHRMG2NtXLqNH_T8Z9DCuztwvVsn6VzA5g4T6m8R2qftbjQjWBfrQayWfGVn6yTPia7FtP9J7QT3-SilaIJ87QUoI7pvltzsjaKGgqiY62eN-RxTKQfhzrrxWN_ozY4s_4-FSD9gVzq6sAe0vzaLWlHtqeNNy7EOf-IrOUDG7UIDpWnT1U84aDlJdZdGqwkS7UOvjA7Mx5T7NXJ0D-VPZfw0hYH2S9UG83A8xCxhPOUe9IrbxLwhC3bjcMEzL4wy2X5sN95BPgUPkJMA4zG8MXFST4UFV61rCp8zVsp0_Pz9OXT8LpSwqeCnt_j2wRIFaHdSg2PfBLSjaqX5yW1RAW5CjXJi8RLU5OJvqse5oC_ua47QUuegXc87it40wS4xxZeW53LaR6h7OP8Ut8m484MZIfbmLH5pSPC7o5hKLkBgsQPPCgn4cYVaZBT1Stc_1ccPCZk6VhmMgkPZuRMC0lZzQmzjSN0vqDPlsXzZB_4zlEcC9MQC6b8I7lwx-YCBBzXEQb6KEP5XLn1GslEAi-rWPt4qjgWMra8uNhIeJLtO_aLcOP-hPQh_FjitS8GSEXPUEYP75VzuBLW45O4bnFfDdPnJMzQdYEz2zxjcDu3kzm6pN8XviRe_4QXVg1E-HD7p8KtzzbHd01bdPQwxOdp5_qhZTA-vRlZplwrttuDOfJHBN8iKh_fOYHf0bFJ3dznxSavR_c_MPnHshkjGIdgNcIOwxpm1dX0bdQ0a3-TUbwKuOynSrMft8uusPrJRI5y66SbWPZzRiGOqqD1voGaHUru8zQBQXoQVQfog2C44SO31sOhXOOKfT2yE6oVmXXygQs5q-vBLAs-BPMMV0QkZiPg-FWLHZs_e7h--ss9k5vNDvT-Ai3D2L-b_sRy5a_l-xtUwXfskc7jca8g-zC__sDwYWE652PIWhNbUnki1Gj8WdgsKCU6T6V0nw2n-0v8rIjpaoOYo1pDH5WWmwvTlS8.o7zqi-GQ4FGJMx3jtXyC_A";
const GOBIZ_MERCHANT_ID = process.env.GOBIZ_MERCHANT_ID || "G591782521";
const QRIS_RAW_STRING = process.env.QRIS_RAW_STRING || "00020101021126610014COM.GO-JEK.WWW01189360091435917825210210G5917825210303UMI51440014ID.CO.QRIS.WWW0215ID10254308911560303UMI5204594753033605802ID5925ALFRIEDO STORE , Toko Kad6012DELI SERDANG61052037162070703A016304FCD1";

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== HELPER QRIS DINAMIS & MUTASI ====================
async function cekMutasiGojek(nominal: number): Promise<boolean> {
  if (!GOBIZ_TOKEN) {
    console.error("GOBIZ_TOKEN belum diset di Environment Variables");
    return false;
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Cari dalam 24 jam terakhir

  const url =
    "https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions?from=0&size=20&statuses=SETTLEMENT,CAPTURE&payment_types=QRIS,GOPAY&start_time=" +
    encodeURIComponent(startTime.toISOString()) +
    "&end_time=" +
    encodeURIComponent(endTime.toISOString()) +
    "&merchant_ids=" +
    GOBIZ_MERCHANT_ID;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + GOBIZ_TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    console.log("Status respons Gojek API:", res.status);

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Gagal fetch Gojek:", res.status, errorBody);
      return false;
    }

    const json = await res.json();
    const transactions = json.transactions || [];
    console.log("Jumlah transaksi ditemukan:", transactions.length);

    return transactions.some((t: any) => {
      const gross = t.gross_amount / 100;
      return (
        (t.transaction_status === "SETTLEMENT" || t.transaction_status === "CAPTURE") &&
        gross === nominal
      );
    });
  } catch (err) {
    console.error("Exception cek mutasi GoBiz:", err);
    return false;
  }
}
  // 1. Bersihkan string dan potong 4 digit CRC lama di akhir
  let cleanQris = rawQris.trim();
  if (cleanQris.includes("6304")) {
    cleanQris = cleanQris.substring(0, cleanQris.lastIndexOf("6304"));
  }

  // 2. Ubah indikator tipe QR dari Statis (010211) menjadi Dinamis (010212)
  cleanQris = cleanQris.replace("010211", "010212");

  // 3. Format Tag 54 (Nominal Transaksi)
  const nominalStr = String(nominal);
  const nominalLen = String(nominalStr.length).padStart(2, "0");
  const tag54 = "54" + nominalLen + nominalStr;

  // 4. Sisipkan Tag 54 tepat sebelum Tag 5802ID
  let dynamicPayload = "";
  if (cleanQris.includes("5802ID")) {
    const parts = cleanQris.split("5802ID");
    dynamicPayload = parts[0] + tag54 + "5802ID" + parts.slice(1).join("5802ID") + "6304";
  } else {
    dynamicPayload = cleanQris + tag54 + "6304";
  }

  // 5. Hitung CRC16-CCITT Standar EMVCo (Polynomial 0x1021, Init 0xFFFF)
  let crc = 0xffff;
  for (let i = 0; i < dynamicPayload.length; i++) {
    let c = dynamicPayload.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return dynamicPayload + crcHex;
}

// Fungsi Pengiriman Item Sukses
async function prosesPesananSelesai(trx: any, ctxApi: any) {
  const jumlahBeli = (trx.amount % trx.products.price) || 1;

  // PRODUK BERKAS DIGITAL: Cookie Fresh (2), Cookie Bekas (3), FP (4)
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

      const sisaStokBaru = Math.max(0, trx.products.stock - stockItems.length);
      await supabase.from("products").update({ stock: sisaStokBaru }).eq("id", trx.product_id);

      if (sisaStokBaru <= 3) {
        try {
          await ctxApi.sendMessage(
            adminId,
            "⚠️ <b>PERINGATAN STOK MENIPIS!</b>\n\nStok untuk produk <b>" +
              trx.products.name +
              "</b> tersisa <b>" +
              sisaStokBaru +
              " item</b>.",
            { parse_mode: "HTML" }
          );
        } catch {}
      }

      const isiTeksFile = stockItems.map((item) => item.account_data.trim()).join("\n");
      const fileBuffer = Buffer.from(isiTeksFile, "utf-8");
      const namaFile = trx.products.name.replace(/\s+/g, "_");

      const pesanPengiriman =
        "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\n" +
        "Pesanan <b>#TRX-" +
        trx.id +
        "</b> telah diverifikasi lunas secara otomatis.\n" +
        "📦 Produk: <b>" +
        trx.products.name +
        " (" +
        stockItems.length +
        " item)</b>\n\n" +
        "✅ File <b>.txt</b> terlampir di bawah (format raw per baris).";

      await ctxApi.sendDocument(
        trx.user_id,
        new InputFile(fileBuffer, namaFile + "_TRX" + trx.id + ".txt"),
        { caption: pesanPengiriman, parse_mode: "HTML" }
      );
    } else {
      await ctxApi.sendMessage(
        trx.user_id,
        "🎉 <b>PEMBAYARAN DITERIMA!</b>\nPesanan <b>#TRX-" +
          trx.id +
          "</b> telah lunas, namun stok otomatis sedang habis. Admin akan segera mengirimkannya manual.",
        { parse_mode: "HTML" }
      );
    }
  } 
  // PRODUK MANUAL: Slot Tumbal (ID 1)
  else {
    const sisaStokBaru = Math.max(0, trx.products.stock - jumlahBeli);
    await supabase.from("products").update({ stock: sisaStokBaru }).eq("id", trx.product_id);

    const adminLink = "tg://user?id=" + adminId;
    const pesanManual = 
      "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\n" +
      "Pesanan <b>#TRX-" +
      trx.id +
      "</b> telah diverifikasi lunas secara otomatis.\n\n" +
      "Silakan konfirmasi akun Anda ke Admin sekarang:";

    const customerKeyboard = new InlineKeyboard().url("💬 Chat Admin (Klaim Slot)", adminLink);
    await ctxApi.sendMessage(trx.user_id, pesanManual, { parse_mode: "HTML", reply_markup: customerKeyboard });
  }

  // Notifikasi ke Admin
  try {
    await ctxApi.sendMessage(
      adminId,
      "💰 <b>PEMBAYARAN OTOMATIS LUNAS!</b>\n\n" +
      "🆔 <b>ID:</b> #TRX-" + trx.id + "\n" +
      "👤 <b>Pembeli:</b> " + (trx.user_name || "User") + " (" + (trx.username || "-") + ")\n" +
      "📦 <b>Produk:</b> " + trx.products.name + "\n" +
      "💵 <b>Nominal:</b> Rp " + trx.amount.toLocaleString("id-ID"),
      { parse_mode: "HTML" }
    );
  } catch {}
}

// ==================== HELPER KEYBOARD BULK ====================
function buatKeyboardBulk(prodId: number, qty: number, harga: number, stok: number) {
  const totalHarga = qty * harga;
  const keyboard = new InlineKeyboard();

  keyboard
    .text("➖ 1", "bulk_adj_" + prodId + "_" + Math.max(1, qty - 1) + "_" + harga + "_" + stok)
    .text("📦 " + qty + " Item", "noop")
    .text("➕ 1", "bulk_adj_" + prodId + "_" + Math.min(stok, qty + 1) + "_" + harga + "_" + stok)
    .row();

  keyboard
    .text("➕ 5", "bulk_adj_" + prodId + "_" + Math.min(stok, qty + 5) + "_" + harga + "_" + stok)
    .text("➕ 10", "bulk_adj_" + prodId + "_" + Math.min(stok, qty + 10) + "_" + harga + "_" + stok)
    .text("🚀 Max", "bulk_adj_" + prodId + "_" + stok + "_" + harga + "_" + stok)
    .row();

  keyboard
    .text("💳 Beli " + qty + " Item (Rp " + totalHarga.toLocaleString("id-ID") + ")", "beli_" + prodId + "_" + qty)
    .row()
    .text("⬅️ Kembali ke Katalog", "menu_beli");

  return keyboard;
}

// ==================== 1. MENU UTAMA (/start) ====================
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "Pelanggan";
  const username = ctx.from?.username ? "@" + ctx.from.username : "-";

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
    .url("💬 Hubungi Admin", "tg://user?id=" + (adminId || ctx.from?.id));

  await ctx.reply(
    "👋 Halo *" + userName + "*!\n\nSelamat datang di Store Bot. Silakan pilih menu di bawah ini:",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// ==================== 2. KATALOG PRODUK ====================
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
      const statusStok = prod.stock > 0 ? "(Stok: " + prod.stock + ")" : "[HABIS]";
      keyboard
        .text("📦 " + prod.name + " - Rp " + Number(prod.price).toLocaleString("id-ID") + " " + statusStok, "pilih_prod_" + prod.id)
        .row();
    });
    keyboard.text("⬅️ Kembali ke Menu", "back_to_menu");

    await ctx.editMessageText(
      "🛒 *KATALOG PRODUK*\n\nSilakan pilih produk yang ingin Anda beli:",
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } catch (err: any) {
    console.error("Error Katalog:", err);
  }
});

// ==================== 3. PILIH PRODUK & COUNTER ====================
bot.callbackQuery(/^pilih_prod_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();

  if (!product) {
    return ctx.answerCallbackQuery({ text: "Produk tidak ditemukan!", show_alert: true });
  }

  if (product.stock <= 0) {
    const adminLink = "tg://user?id=" + adminId;
    const pesanHabis = 
      "⚠️ *PEMBERITAHUAN*\n\n" +
      "Maaf, stok untuk *" + product.name + "* sedang habis!\n" +
      "Silakan hubungi admin untuk info restock.";

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
    "📦 *PRODUK: " + product.name + "*\n\n" +
    "💵 *Harga Satuan:* Rp " + harga.toLocaleString("id-ID") + "\n" +
    "📊 *Stok Tersedia:* " + stok + " item\n\n" +
    "Gunakan tombol di bawah untuk mengatur jumlah item:";

  await ctx.editMessageText(pesanPilihan, {
    parse_mode: "Markdown",
    reply_markup: buatKeyboardBulk(product.id, qtyAwal, harga, stok),
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^bulk_adj_(\d+)_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
  const prodId = parseInt(ctx.match[1]);
  const newQty = parseInt(ctx.match[2]);
  const harga = parseInt(ctx.match[3]);
  const stok = parseInt(ctx.match[4]);

  await ctx.editMessageReplyMarkup({
    reply_markup: buatKeyboardBulk(prodId, newQty, harga, stok),
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// ==================== 4. BUAT INVOICE & GENERATE QRIS DINAMIS ====================
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
      username: ctx.from.username ? "@" + ctx.from.username : "-",
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

  let qrImageUrl = "";
  if (QRIS_RAW_STRING) {
    const dynamicQrisPayload = generateDynamicQris(QRIS_RAW_STRING, totalTagihan);
    qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(dynamicQrisPayload);
  } else {
    qrImageUrl = "https://i.postimg.cc/3rBPcpG4/DANA-ALFRIEDO.jpg";
  }

  const invoiceText =
    "🧾 <b>INVOICE PEMBAYARAN #TRX-" + trx.id + "</b>\n\n" +
    "📦 Produk: <b>" + product.name + " (" + jumlahBeli + " item)</b>\n" +
    "💵 Total Tagihan: <b>Rp " + totalTagihan.toLocaleString("id-ID") + "</b>\n" +
    "⏳ Batas Waktu: <b>5 Menit</b>\n\n" +
    "📌 <b>CARA BAYAR (OTOMATIS):</b>\n" +
    "1. Scan QRIS di atas menggunakan GoPay, DANA, BCA, OVO, ShopeePay, dll.\n" +
    "2. Nominal sudah otomatis terkunci (tidak perlu ketik manual).\n" +
    "3. Setelah transfer berhasil, klik tombol <b>🔄 Cek Pembayaran</b> di bawah!";

  const invoiceKeyboard = new InlineKeyboard()
    .text("🔄 Cek Pembayaran", "cek_bayar_" + trx.id).row()
    .text("❌ Batalkan Pesanan", "batal_trx_" + trx.id);

  await ctx.replyWithPhoto(qrImageUrl, {
    caption: invoiceText,
    parse_mode: "HTML",
    reply_markup: invoiceKeyboard,
  });
});

// ==================== HANDLER: CEK PEMBAYARAN OTOMATIS ====================
bot.callbackQuery(/^cek_bayar_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);

  try {
    await ctx.answerCallbackQuery({ text: "🔍 Memeriksa mutasi..." });
  } catch {}

  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (!trx) {
    return ctx.reply("❌ Transaksi tidak ditemukan di database.");
  }

  if (trx.status === "SELESAI") {
    return ctx.reply("✅ Transaksi ini sudah diselesaikan sebelumnya.");
  }

  if (trx.status === "BATAL" || trx.status === "DITOLAK") {
    return ctx.reply("⚠️ Pesanan ini sudah dibatalkan atau ditolak.");
  }

  const isPaid = await cekMutasiGojek(trx.amount);

  if (isPaid) {
    await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trx.id);
    try {
      await ctx.deleteMessage();
    } catch {}
    await prosesPesananSelesai(trx, ctx.api);
  } else {
    await ctx.reply(
      "⚠️ <b>Pembayaran Belum Terdeteksi</b>\n\n" +
      "Tagihan: <b>Rp " + trx.amount.toLocaleString("id-ID") + "</b>\n\n" +
      "Sistem belum mendeteksi dana masuk. Jika baru saja transfer, mohon tunggu 15-30 detik lalu tekan kembali tombol <b>🔄 Cek Pembayaran</b>.",
      { parse_mode: "HTML" }
    );
  }
});

// Handler Batal Pesanan
bot.callbackQuery(/^batal_trx_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);

  await supabase
    .from("transactions")
    .update({ status: "BATAL" })
    .eq("id", trxId)
    .eq("user_id", ctx.from.id)
    .eq("status", "MENUNGGU_PEMBAYARAN");

  await ctx.deleteMessage();
  await ctx.reply("❌ <b>Pesanan telah dibatalkan.</b> Gunakan /start jika ingin berbelanja kembali.", {
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery({ text: "Pesanan dibatalkan." });
});

// ==================== 5. TERIMA BUKTI TRANSFER (FALLBACK MANUAL FOTO) ====================
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id;
  const waktuBatas = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: trx, error } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("user_id", userId)
    .eq("status", "MENUNGGU_PEMBAYARAN")
    .gte("created_at", waktuBatas)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !trx) return;

  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  const { error: updateErr } = await supabase
    .from("transactions")
    .update({ payment_proof_file_id: fileId, status: "MENUNGGU_ACC" })
    .eq("id", trx.id)
    .eq("status", "MENUNGGU_PEMBAYARAN");

  if (updateErr) return;

  await ctx.reply("✅ Bukti pembayaran berhasil diterima. Mohon tunggu verifikasi admin.");

  const adminKeyboard = new InlineKeyboard()
    .text("✅ Terima (ACC)", "acc_" + trx.id)
    .text("❌ Tolak", "reject_" + trx.id);

  const namaPembeli = (trx.user_name || "User").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const usernamePembeli = (trx.username || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const namaProduk = (trx.products?.name || "Produk").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const keteranganAdmin =
    "🔔 <b>PESANAN MASUK (MANUAL FOTO)!</b>\n\n" +
    "🆔 <b>ID:</b> #TRX-" + trx.id + "\n" +
    "👤 <b>Pembeli:</b> " + namaPembeli + " (" + usernamePembeli + ")\n" +
    "📦 <b>Produk:</b> " + namaProduk + "\n" +
    "💰 <b>Total:</b> Rp " + trx.amount.toLocaleString("id-ID");

  try {
    await ctx.api.sendPhoto(adminId, fileId, {
      caption: keteranganAdmin,
      parse_mode: "HTML",
      reply_markup: adminKeyboard,
    });
  } catch (err: any) {
    try {
      await ctx.api.sendMessage(adminId, keteranganAdmin + "\n\n⚠️ <i>(Cek riwayat bukti foto di database)</i>", {
        parse_mode: "HTML",
        reply_markup: adminKeyboard,
      });
    } catch {}
  }
});

// ==================== 6. ADMIN ACC MANUAL ====================
bot.callbackQuery(/^acc_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);
  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (trx && trx.status !== "SELESAI") {
    await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trxId);
    await prosesPesananSelesai(trx, ctx.api);

    await ctx.editMessageCaption({
      caption: "✅ <b>PESANAN #TRX-" + trx.id + " TELAH DI-ACC MANUAL</b>",
      parse_mode: "HTML",
    });
  }
  await ctx.answerCallbackQuery({ text: "Pesanan diproses." });
});

// ==================== 7. ADMIN REJECT ====================
bot.callbackQuery(/^reject_(\d+)$/, async (ctx) => {
  const trxId = parseInt(ctx.match[1]);

  const { data: trx } = await supabase
    .from("transactions")
    .select("*, products(*)")
    .eq("id", trxId)
    .single();

  if (trx && trx.status !== "DITOLAK") {
    await supabase.from("transactions").update({ status: "DITOLAK" }).eq("id", trxId);

    const adminUsername = ctx.from?.username;
    const adminLink = adminUsername ? "https://t.me/" + adminUsername : "tg://user?id=" + adminId;
    const keyboardTolak = new InlineKeyboard().url("💬 Hubungi Admin", adminLink);

    const pesanTolak =
      "❌ <b>PEMBAYARAN TIDAK DAPAT DIVERIFIKASI</b>\n\n" +
      "Mohon maaf, pesanan <b>#TRX-" + trx.id + "</b> (" + (trx.products?.name || "Produk") + ") telah ditolak oleh admin.\n\n" +
      "Jika Anda merasa sudah mentransfer dengan benar, silakan hubungi admin di bawah ini:";

    try {
      await ctx.api.sendMessage(trx.user_id, pesanTolak, {
        parse_mode: "HTML",
        reply_markup: keyboardTolak,
      });
    } catch {}

    await ctx.editMessageCaption({
      caption: "❌ <b>PESANAN #TRX-" + trxId + " TELAH DITOLAK</b>",
      parse_mode: "HTML",
    });
  }

  await ctx.answerCallbackQuery({ text: "Pesanan ditolak." });
});

// ==================== FITUR ADMIN: CEK STOK (/stok) ====================
bot.command("stok", async (ctx) => {
  if (ctx.from?.id !== adminId) return;

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error || !products) {
    return ctx.reply("❌ Gagal mengambil data stok dari database.");
  }

  let text = "📊 <b>LAPORAN STOK TOKO SAAT INI</b>\n\n";
  products.forEach((p) => {
    const warning = p.stock <= 3 ? " <i>(⚠️ Menipis!)</i>" : "";
    text += "• <b>" + p.name + "</b> (ID: " + p.id + ")\n";
    text += "  💰 Harga: Rp " + Number(p.price).toLocaleString("id-ID") + "\n";
    text += "  📦 Stok: <b>" + p.stock + "</b>" + warning + "\n\n";
  });

  text += "💡 <i>Gunakan /tambahstok untuk menambah stok langsung dari Telegram.</i>";
  await ctx.reply(text, { parse_mode: "HTML" });
});

// ==================== FITUR ADMIN: RESTOCK MASSAL (/tambahstok) ====================
bot.command("tambahstok", async (ctx) => {
  if (ctx.from?.id !== adminId) return;

  const rawText = ctx.message?.text || "";
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const firstLineArgs = lines[0].split(" ").filter((s) => s.length > 0);
  const prodId = parseInt(firstLineArgs[1]);

  if (!prodId) {
    const panduan =
      "ℹ️ <b>PANDUAN RESTOCK MASSAL:</b>\n\n" +
      "<b>1. Untuk Produk Berkas (ID 2: Cookie Fresh, 3: Cookie Bekas, 4: FP):</b>\n" +
      "Kirim perintah berikut dengan data di baris bawahnya:\n" +
      "<code>/tambahstok 2\n" +
      "data_cookie_1\n" +
      "data_cookie_2</code>\n\n" +
      "<b>2. Untuk Slot Tumbal (ID 1):</b>\n" +
      "<code>/tambahstok 1 20</code> (tambah 20 slot)";
    return ctx.reply(panduan, { parse_mode: "HTML" });
  }

  const { data: product } = await supabase.from("products").select("*").eq("id", prodId).single();
  if (!product) {
    return ctx.reply("❌ Produk dengan ID " + prodId + " tidak ditemukan!");
  }

  if (prodId === 1) {
    const jumlahTambah = parseInt(firstLineArgs[2]);
    if (!jumlahTambah || isNaN(jumlahTambah)) {
      return ctx.reply("❌ Format salah untuk Slot Tumbal! Gunakan: `/tambahstok 1 <jumlah_angka>`", { parse_mode: "Markdown" });
    }

    const stokBaru = (product.stock || 0) + jumlahTambah;
    await supabase.from("products").update({ stock: stokBaru }).eq("id", 1);
    return ctx.reply("✅ Berhasil menambahkan <b>" + jumlahTambah + " slot</b> ke <b>" + product.name + "</b>.\n📦 Total stok sekarang: <b>" + stokBaru + " slot</b>.", { parse_mode: "HTML" });
  }

  const itemsToAdd = lines.slice(1);
  if (itemsToAdd.length === 0) {
    return ctx.reply("❌ Tidak ada data akun/cookie yang dimasukkan di bawah baris perintah!", { parse_mode: "HTML" });
  }

  const rows = itemsToAdd.map((dataString) => ({
    product_id: prodId,
    account_data: dataString,
    is_used: false,
  }));

  const { error: insertErr } = await supabase.from("product_stocks").insert(rows);
  if (insertErr) {
    return ctx.reply("❌ Gagal menyimpan data: " + insertErr.message);
  }

  const totalStokBaru = (product.stock || 0) + itemsToAdd.length;
  await supabase.from("products").update({ stock: totalStokBaru }).eq("id", prodId);

  await ctx.reply(
    "✅ <b>BERHASIL RESTOCK!</b>\n\n" +
    "📦 Produk: <b>" + product.name + "</b>\n" +
    "➕ Jumlah Baru Masuk: <b>" + itemsToAdd.length + " data</b>\n" +
    "📊 Total Stok Sekarang: <b>" + totalStokBaru + " data</b>",
    { parse_mode: "HTML" }
  );
});

// ==================== FITUR ADMIN: BERSIHKAN DATABASE (/bersihkan) ====================
bot.command("bersihkan", async (ctx) => {
  if (ctx.from?.id !== adminId) return;

  const { count: countTrxSampah, error: errTrx } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .in("status", ["BATAL", "DITOLAK"]);

  const { count: countStokBekas, error: errStok } = await supabase
    .from("product_stocks")
    .select("*", { count: "exact", head: true })
    .eq("is_used", true);

  if (errTrx || errStok) {
    return ctx.reply("❌ Gagal menganalisis database.");
  }

  const totalSampah = (countTrxSampah || 0) + (countStokBekas || 0);
  if (totalSampah === 0) {
    return ctx.reply("✨ <b>Database Bersih!</b>\nTidak ada sampah yang perlu dibersihkan.", { parse_mode: "HTML" });
  }

  const teksPeringatan =
    "🧹 <b>ANALISIS SAMPAH DATABASE</b>\n\n" +
    "• Transaksi Batal/Ditolak: <b>" + (countTrxSampah || 0) + " baris</b>\n" +
    "• Stok Terpakai: <b>" + (countStokBekas || 0) + " baris</b>\n\n" +
    "Apakah Anda ingin menghapus data sampah di atas?";

  const keyboardBersih = new InlineKeyboard()
    .text("🗑 Hapus Sekarang", "eksekusi_bersihkan_db")
    .text("❌ Batal", "batal_bersihkan_db");

  await ctx.reply(teksPeringatan, { parse_mode: "HTML", reply_markup: keyboardBersih });
});

bot.callbackQuery("eksekusi_bersihkan_db", async (ctx) => {
  if (ctx.from?.id !== adminId) return;
  await supabase.from("transactions").delete().in("status", ["BATAL", "DITOLAK"]);
  await supabase.from("product_stocks").delete().eq("is_used", true);

  await ctx.editMessageText("✅ <b>PEMBERSIHAN BERHASIL!</b>\nData sampah berhasil dihapus.", { parse_mode: "HTML" });
  await ctx.answerCallbackQuery({ text: "Database dibersihkan!" });
});

bot.callbackQuery("batal_bersihkan_db", async (ctx) => {
  if (ctx.from?.id !== adminId) return;
  await ctx.editMessageText("❌ Pembersihan dibatalkan.");
  await ctx.answerCallbackQuery();
});

// ==================== 8. MENU LAINNYA & BROADCAST ====================
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
    .url("💬 Hubungi Admin", "tg://user?id=" + (adminId || ctx.from?.id));

  await ctx.editMessageText(
    "👋 Halo *" + userName + "*!\n\nSelamat datang di Store Bot. Silakan pilih menu di bawah ini:",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

bot.callbackQuery("menu_profil", async (ctx) => {
  const profilText = "👤 *PROFIL*\n\n• Nama: " + ctx.from.first_name + "\n• ID: `" + ctx.from.id + "`";
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

  let riwayatText = "📜 *5 TRANSAKSI TERAKHIR*\n\n";
  if (!listTrx || listTrx.length === 0) {
    riwayatText += "_Belum ada riwayat pesanan._";
  } else {
    listTrx.forEach((trx) => {
      riwayatText += "• *#TRX-" + trx.id + "* | Rp " + trx.amount.toLocaleString("id-ID") + " | `" + trx.status + "`\n";
    });
  }

  const keyboard = new InlineKeyboard().text("⬅ Kembali", "back_to_menu");
  await ctx.editMessageText(riwayatText, { parse_mode: "Markdown", reply_markup: keyboard });
});

export default webhookCallback(bot, "http");
