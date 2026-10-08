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
        "Pesanan <b>#TRX-" + trx.id + "</b> telah diverifikasi lunas otomatis via DANA.\n" +
        "📦 Produk: <b>" + trx.products.name + " (" + stockItems.length + " item)</b>\n\n" +
        "✅ Berkas produk terlampir di bawah:";

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
      "💰 <b>PEMBAYARAN DANA MASUK & LUNAS!</b>\n\n" +
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
    const bodyStr = JSON.stringify(req.body);
    console.log("Raw Notif DANA:", bodyStr);

    // Ambil deretan angka nominal (Rp 1.145 atau 1.145 atau 1145)
    const matches = bodyStr.match(/(?:Rp\.?\s*|sebesar\s*|IDR\s*)?([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,})/gi);
    
    let detectedAmount = 0;
    if (matches) {
      for (const m of matches) {
        const clean = parseInt(m.replace(/[^0-9]/g, ""), 10);
        if (clean >= 1000) {
          detectedAmount = clean;
          break;
        }
      }
    }

    console.log("Nominal terbaca:", detectedAmount);

    if (!detectedAmount) {
      return res.status(200).json({ status: "ignored", reason: "Nominal tidak terbaca" });
    }

    const { data: trx } = await supabase
      .from("transactions")
      .select("*, products(*)")
      .eq("amount", detectedAmount)
      .eq("status", "MENUNGGU_PEMBAYARAN")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (trx) {
      await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trx.id);
      await prosesPesananSelesai(trx);
      return res.status(200).json({ status: "success", trx_id: trx.id });
    }

    return res.status(200).json({ status: "not_found", amount: detectedAmount });
  } catch (error: any) {
    console.error("Error DANA Webhook:", error);
    return res.status(500).json({ error: error.message });
  }
}
