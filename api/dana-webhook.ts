import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot, InputFile } from "grammy";
import { createClient } from "@supabase/supabase-js";

const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = 1294259168;

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== FUNGSI PENGIRIMAN STOK OTOMATIS ====================
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

      if (sisaStokBaru <= 3) {
        try {
          await bot.api.sendMessage(
            adminId,
            "⚠️ <b>PERINGATAN STOK MENIPIS!</b>\n\nStok untuk <b>" +
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
        "</b> telah diverifikasi lunas otomatis via DANA.\n" +
        "📦 Produk: <b>" +
        trx.products.name +
        " (" +
        stockItems.length +
        " item)</b>\n\n" +
        "✅ Berkas produk terlampir di bawah:";

      await bot.api.sendDocument(
        trx.user_id,
        new InputFile(fileBuffer, namaFile + "_TRX" + trx.id + ".txt"),
        { caption: pesanPengiriman, parse_mode: "HTML" }
      );
    } else {
      await bot.api.sendMessage(
        trx.user_id,
        "🎉 <b>PEMBAYARAN DITERIMA!</b>\nPesanan <b>#TRX-" +
          trx.id +
          "</b> telah lunas, namun stok otomatis sedang habis. Admin akan segera mengirimkannya manual.",
        { parse_mode: "HTML" }
      );
    }
  } else {
    const sisaStokBaru = Math.max(0, trx.products.stock - jumlahBeli);
    await supabase.from("products").update({ stock: sisaStokBaru }).eq("id", trx.product_id);

    await bot.api.sendMessage(
      trx.user_id,
      "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\nPesanan <b>#TRX-" +
        trx.id +
        "</b> telah lunas. Silakan hubungi admin untuk klaim slot tumbal Anda.",
      { parse_mode: "HTML" }
    );
  }

  try {
    await bot.api.sendMessage(
      adminId,
      "💰 <b>PEMBAYARAN DANA MASUK & LUNAS!</b>\n\n" +
      "🆔 <b>ID:</b> #TRX-" + trx.id + "\n" +
      "👤 <b>Pembeli:</b> " + (trx.user_name || "User") + " (" + (trx.username || "-") + ")\n" +
      "📦 <b>Produk:</b> " + trx.products.name + "\n" +
      "💵 <b>Nominal:</b> Rp " + trx.amount.toLocaleString("id-ID"),
      { parse_mode: "HTML" }
    );
  } catch {}
}

// ==================== HANDLER WEBHOOK DANA ====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Ambil isi request baik dalam format objek, teks polos, atau string JSON
    let rawData = "";
    if (typeof req.body === "object") {
      rawData = JSON.stringify(req.body);
    } else {
      rawData = String(req.body || "");
    }

    console.log("NOTIFIKASI DARI HP DITERIMA:", rawData);

    const { data: pendingTrxList } = await supabase
      .from("transactions")
      .select("*, products(*)")
      .eq("status", "MENUNGGU_PEMBAYARAN");

    if (!pendingTrxList || pendingTrxList.length === 0) {
      console.log("Tidak ada transaksi pending.");
      return res.status(200).json({ status: "no_pending_transactions" });
    }

    let matchedTrx = null;
    for (const trx of pendingTrxList) {
      const amountStr = String(trx.amount);
      const dotFormatted = trx.amount.toLocaleString("id-ID"); // contoh: "1.005"

      if (rawData.includes(amountStr) || rawData.includes(dotFormatted)) {
        matchedTrx = trx;
        break;
      }
    }

    if (matchedTrx) {
      console.log("Transaksi cocok: ID", matchedTrx.id, "dengan total Rp", matchedTrx.amount);
      await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", matchedTrx.id);
      await prosesPesananSelesai(matchedTrx);
      return res.status(200).json({ status: "success", trx_id: matchedTrx.id });
    }

    console.log("Nominal tidak ada yang cocok.");
    return res.status(200).json({ status: "amount_not_matched", raw: rawData });
  } catch (error: any) {
    console.error("Error handler DANA:", error);
    return res.status(200).json({ error: error.message });
  }
}
