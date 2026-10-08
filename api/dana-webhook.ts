import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot, InputFile } from "grammy";
import { createClient } from "@supabase/supabase-js";

const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = 1294259168;

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

async function prosesPesananSelesai(trx: any) {
  const jumlahBeli = Math.floor(trx.amount / trx.products.price) || 1;

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

      const isiTeksFile = stockItems.map((item) => item.account_data.trim()).join("\n");
      const fileBuffer = Buffer.from(isiTeksFile, "utf-8");
      const namaFile = trx.products.name.replace(/\s+/g, "_");

      const pesanPengiriman =
        "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\n" +
        "Pesanan <b>#TRX-" + trx.id + "</b> telah diverifikasi lunas secara otomatis.\n" +
        "📦 Produk: <b>" + trx.products.name + " (" + stockItems.length + " item)</b>\n\n" +
        "✅ File produk terlampir:";

      await bot.api.sendDocument(
        trx.user_id,
        new InputFile(fileBuffer, namaFile + "_TRX" + trx.id + ".txt"),
        { caption: pesanPengiriman, parse_mode: "HTML" }
      );
    }
  } else {
    const sisaStokBaru = Math.max(0, trx.products.stock - jumlahBeli);
    await supabase.from("products").update({ stock: sisaStokBaru }).eq("id", trx.product_id);

    await bot.api.sendMessage(
      trx.user_id,
      "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\nPesanan <b>#TRX-" + trx.id + "</b> lunas. Silakan hubungi admin untuk klaim slot.",
      { parse_mode: "HTML" }
    );
  }

  try {
    await bot.api.sendMessage(
      adminId,
      "💰 <b>PEMBAYARAN DANA MASUK!</b>\n\n" +
      "🆔 #TRX-" + trx.id + "\n" +
      "👤 " + (trx.user_name || "User") + " (" + (trx.username || "-") + ")\n" +
      "📦 " + trx.products.name + "\n" +
      "💵 Rp " + trx.amount.toLocaleString("id-ID"),
      { parse_mode: "HTML" }
    );
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawData = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    console.log("PAYLOAD LENGKAP DARI HP:", rawData);

    // Ambil semua transaksi yang saat ini berstatus MENUNGGU_PEMBAYARAN
    const { data: pendingTrxList } = await supabase
      .from("transactions")
      .select("*, products(*)")
      .eq("status", "MENUNGGU_PEMBAYARAN");

    if (!pendingTrxList || pendingTrxList.length === 0) {
      console.log("Tidak ada transaksi pending.");
      return res.status(200).json({ status: "no_pending_transactions" });
    }

    // Cocokkan nominal transaksi pending yang tercantum di dalam teks notifikasi
    let matchedTrx = null;
    for (const trx of pendingTrxList) {
      const amountStr = String(trx.amount);
      const dotFormatted = trx.amount.toLocaleString("id-ID"); // contoh: "1.041"

      // Cek apakah angka nominal ada di dalam teks notifikasi
      if (rawData.includes(amountStr) || rawData.includes(dotFormatted)) {
        matchedTrx = trx;
        break;
      }
    }

    if (matchedTrx) {
      console.log("Transaksi cocok ditemukan: ID", matchedTrx.id, "dengan tagihan", matchedTrx.amount);
      await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", matchedTrx.id);
      await prosesPesananSelesai(matchedTrx);
      return res.status(200).json({ status: "success", trx_id: matchedTrx.id });
    }

    console.log("Tidak ada nominal pending yang cocok di teks payload.");
    return res.status(200).json({ status: "amount_not_matched", raw: rawData });
  } catch (error: any) {
    console.error("Error handler DANA:", error);
    return res.status(500).json({ error: error.message });
  }
}
