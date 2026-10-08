import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot, InputFile } from "grammy";
import { createClient } from "@supabase/supabase-js";

const botToken = process.env.BOT_TOKEN || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const adminId = 1294259168;

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi Pengiriman Item Sukses
async function prosesPesananSelesai(trx: any) {
  const jumlahBeli = Math.floor(trx.amount / trx.products.price) || 1;

  // Produk Berkas Digital (ID 2, 3, 4)
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
        "✅ File <b>.txt</b> terlampir di bawah.";

      await bot.api.sendDocument(
        trx.user_id,
        new InputFile(fileBuffer, namaFile + "_TRX" + trx.id + ".txt"),
        { caption: pesanPengiriman, parse_mode: "HTML" }
      );
    }
  } else {
    // Slot Tumbal (ID 1)
    const sisaStokBaru = Math.max(0, trx.products.stock - jumlahBeli);
    await supabase.from("products").update({ stock: sisaStokBaru }).eq("id", trx.product_id);

    await bot.api.sendMessage(
      trx.user_id,
      "🎉 <b>PEMBAYARAN DITERIMA!</b>\n\nPesanan <b>#TRX-" + trx.id + "</b> lunas. Silakan hubungi admin untuk klaim slot.",
      { parse_mode: "HTML" }
    );
  }

  // Notifikasi ke Admin
  try {
    await bot.api.sendMessage(
      adminId,
      "💰 <b>PEMBAYARAN DANA LUNAS!</b>\n\n" +
      "🆔 <b>ID:</b> #TRX-" + trx.id + "\n" +
      "👤 <b>Pembeli:</b> " + (trx.user_name || "User") + "\n" +
      "📦 <b>Produk:</b> " + trx.products.name + "\n" +
      "💵 <b>Nominal:</b> Rp " + trx.amount.toLocaleString("id-ID"),
      { parse_mode: "HTML" }
    );
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;
    // Mengambil teks notifikasi (beberapa app mengirim field 'content', 'text', 'body', atau 'message')
    const rawText = JSON.stringify(payload);
    console.log("Notifikasi masuk dari DANA:", rawText);

    // Ambil angka nominal dari teks (contoh: "Rp 2.045" atau "2.045" atau "2045")
    const match = rawText.match(/(?:Rp\s*|sebesar\s*|IDR\s*)?([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,})/i);
    
    if (!match) {
      return res.status(200).json({ status: "ignored", reason: "Nominal tidak ditemukan" });
    }

    const cleanAmount = parseInt(match[1].replace(/\./g, ""), 10);
    console.log("Nominal terdeteksi:", cleanAmount);

    // Cari transaksi pending di database yang cocok dengan nominal ini
    const { data: trx } = await supabase
      .from("transactions")
      .select("*, products(*)")
      .eq("amount", cleanAmount)
      .eq("status", "MENUNGGU_PEMBAYARAN")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (trx) {
      await supabase.from("transactions").update({ status: "SELESAI" }).eq("id", trx.id);
      await prosesPesananSelesai(trx);
      return res.status(200).json({ status: "success", trx_id: trx.id });
    }

    return res.status(200).json({ status: "no_matching_transaction" });
  } catch (error: any) {
    console.error("Error webhook DANA:", error);
    return res.status(500).json({ error: error.message });
  }
}
