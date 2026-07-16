import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-comidayamor.png";
import { supabase } from "@/integrations/supabase/client";

async function loadLogoDataUrl(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

// Arredondamento monetário: 2 casas decimais
export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

const brl = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
const pct = (n: number | null) =>
  n != null && isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : "—";

export type PropostaFaixaPDF = {
  label: string;
  preco: number | null;
  margemRevenda: number | null;
};

export type PropostaItemPDF = {
  nome: string;
  qtd: number;
  precoB2B: number;
  b2c: number | null;
  margemComprador: number | null;
  faixaSelecionadaIdx?: number;
  faixas?: PropostaFaixaPDF[];
  claims?: string | null;
  validadeDias?: number | null;
  conservacao?: string | null;
  alergenicos?: string | null;
};

export type PropostaPDFData = {
  numero: string;
  emissao: Date;
  validadeDias: number;
  cliente: string;
  itens: PropostaItemPDF[];
  prazoPagamento: string;
  frete: number;
  freteGratis?: boolean;
  pedidoMinimo?: number;
  prazoEntregaDias?: number;
  tipoVenda?: "b2b" | "evento";
};

// Identidade visual Comida y Amor
const BORDO: [number, number, number] = [162, 36, 47];
const CREME: [number, number, number] = [239, 227, 211];
const CARAMELO: [number, number, number] = [167, 97, 65];
const PINK: [number, number, number] = [239, 192, 203];
const VERMELHO: [number, number, number] = [242, 5, 49];
const ESCURO: [number, number, number] = [46, 20, 22];
const CREME_CLARO: [number, number, number] = [247, 240, 228];

const F_DISPLAY = "times";
const F_SANS = "helvetica";

/**
 * Reserva um novo número sequencial no formato CYA-YYYY-NNN.
 * Fallback local (baseado em timestamp) caso a chamada RPC falhe.
 */
export async function gerarNumeroProposta(): Promise<string> {
  try {
    const { data, error } = await (supabase.rpc as any)("next_numero_proposta");
    if (!error && typeof data === "string" && (data as string).startsWith("CYA-")) return data as string;
  } catch {
    // ignore
  }
  const d = new Date();
  const y = d.getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `CYA-${y}-${seq}`;
}

function itemMetaLine(i: PropostaItemPDF): string {
  const partes: string[] = [];
  if (i.claims && i.claims.trim()) partes.push(i.claims.trim());
  if (i.validadeDias != null && i.validadeDias > 0) partes.push(`Validade: ${i.validadeDias} dias`);
  if (i.conservacao && i.conservacao.trim()) partes.push(i.conservacao.trim());
  return partes.join("  |  ");
}

export async function gerarPropostaPDF(data: PropostaPDFData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
  const validade = new Date(data.emissao);
  validade.setDate(validade.getDate() + data.validadeDias);

  const desenharFundoPagina = () => {
    doc.setFillColor(...CREME);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...PINK);
    doc.rect(0, 0, pageW, 6, "F");
    doc.setFillColor(...BORDO);
    doc.rect(0, 6, pageW, 2, "F");
  };

  desenharFundoPagina();

  // ==== CABEÇALHO ====
  const logo = await loadLogoDataUrl();
  if (logo) {
    const logoH = 60;
    const logoW = (logo.w / logo.h) * logoH;
    doc.addImage(logo.dataUrl, "PNG", margin, 30, logoW, logoH);
  } else {
    doc.setFont(F_DISPLAY, "bold");
    doc.setTextColor(...BORDO);
    doc.setFontSize(24);
    doc.text("comida yamor", margin, 68);
  }

  doc.setFont(F_SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ESCURO);
  const rightX = pageW - margin;
  doc.setTextColor(...CARAMELO);
  doc.text("CNPJ", rightX, 40, { align: "right" });
  doc.setTextColor(...ESCURO);
  doc.text("39.710.375/0001-80", rightX, 52, { align: "right" });
  doc.setTextColor(...CARAMELO);
  doc.text("Contato", rightX, 66, { align: "right" });
  doc.setTextColor(...ESCURO);
  doc.text("comidayamor2020@gmail.com", rightX, 78, { align: "right" });
  doc.text("+55 51 99643-7080", rightX, 90, { align: "right" });

  doc.setDrawColor(...PINK);
  doc.setLineWidth(1.2);
  doc.line(margin, 105, pageW - margin, 105);

  // ==== TÍTULO ====
  doc.setFont(F_DISPLAY, "bold");
  doc.setTextColor(...BORDO);
  doc.setFontSize(28);
  doc.text("Proposta Comercial", margin, 145);

  doc.setFont(F_DISPLAY, "italic");
  doc.setTextColor(...CARAMELO);
  doc.setFontSize(11);
  doc.text(`nº ${data.numero}`, pageW - margin, 132, { align: "right" });
  doc.setFont(F_SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ESCURO);
  doc.text(`Emissão: ${fmtDate(data.emissao)}`, pageW - margin, 146, { align: "right" });
  doc.text(`Válida até: ${fmtDate(validade)}`, pageW - margin, 158, { align: "right" });

  // ==== CLIENTE ====
  const clienteY = 175;
  doc.setFillColor(...CREME_CLARO);
  doc.setDrawColor(...CARAMELO);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, clienteY, pageW - margin * 2, 44, 6, 6, "FD");
  doc.setFont(F_SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CARAMELO);
  doc.text("CLIENTE", margin + 14, clienteY + 16);
  doc.setFont(F_DISPLAY, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BORDO);
  doc.text(data.cliente || "—", margin + 14, clienteY + 34);

  // ==== ITENS ====
  const isEvento = data.tipoVenda === "evento";

  const descontoFrac = (i: PropostaItemPDF) =>
    i.b2c != null && i.b2c > 0 ? (i.b2c - round2(i.precoB2B)) / i.b2c : null;

  // Subtotais sempre com preços arredondados
  const subtotal = data.itens.reduce((s, i) => s + round2(i.precoB2B) * i.qtd, 0);
  const total = subtotal + (data.frete || 0);

  if (isEvento) {
    const body = data.itens.map((i) => {
      const p = round2(i.precoB2B);
      return [
        i.nome,
        String(i.qtd),
        i.b2c != null ? brl(i.b2c) : "—",
        brl(p),
        pct(descontoFrac(i)),
        brl(p * i.qtd),
      ];
    });
    const head = [["Produto", "Qtd", "Preço venda loja", "Preço evento", "Desconto", "Subtotal"]];
    autoTable(doc, {
      startY: clienteY + 60,
      head,
      body,
      styles: { font: F_SANS, fontSize: 9, cellPadding: 7, textColor: ESCURO, lineColor: CARAMELO, lineWidth: 0.3 },
      headStyles: { fillColor: BORDO, textColor: CREME, fontStyle: "bold", font: F_SANS, fontSize: 9, lineColor: BORDO, lineWidth: 0 },
      bodyStyles: { fillColor: CREME_CLARO },
      alternateRowStyles: { fillColor: CREME },
      columnStyles: {
        0: { textColor: BORDO, fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", textColor: CARAMELO, fontStyle: "bold" },
        5: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    });
  } else {
    const QTD_MINIMA = 15;
    let cursorY = clienteY + 60;

    data.itens.forEach((i, itemIdx) => {
      const precoUnit = round2(i.precoB2B);
      const faixas = (i.faixas ?? [{ label: "—", preco: precoUnit, margemRevenda: i.margemComprador }])
        .map((f) => ({ ...f, preco: f.preco != null ? round2(f.preco) : null }));
      const selIdx = i.faixaSelecionadaIdx ?? 0;
      const subtotalProduto = precoUnit * i.qtd;
      const metaLine = itemMetaLine(i);
      const headerH = metaLine ? 42 : 26;

      const alturaEstimada = headerH + 22 + faixas.length * 22 + 24 + 12;
      if (cursorY + alturaEstimada > pageH - 40) {
        doc.addPage();
        desenharFundoPagina();
        cursorY = 40;
      }

      // Cabeçalho do produto
      doc.setFillColor(...CREME_CLARO);
      doc.setDrawColor(...CARAMELO);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, cursorY, pageW - margin * 2, headerH, 4, 4, "FD");

      doc.setFont(F_DISPLAY, "bold");
      doc.setTextColor(...BORDO);
      doc.setFontSize(11);
      doc.text(i.nome, margin + 10, cursorY + 17);

      if (metaLine) {
        doc.setFont(F_SANS, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...CARAMELO);
        doc.text(metaLine, margin + 10, cursorY + 32);
      }

      doc.setFont(F_SANS, "normal");
      doc.setFontSize(8);
      const rightMetaX = pageW - margin - 10;
      const meta = [
        `Qtd pedida: ${i.qtd} un`,
        `Qtd mínima: ${QTD_MINIMA} un`,
        `Sugerido revenda: ${i.b2c != null ? brl(i.b2c) : "—"}`,
      ];
      let mx = rightMetaX;
      for (let k = meta.length - 1; k >= 0; k--) {
        doc.setTextColor(...ESCURO);
        doc.text(meta[k], mx, cursorY + 17, { align: "right" });
        mx -= doc.getTextWidth(meta[k]) + 18;
        if (k > 0) {
          doc.setDrawColor(...PINK);
          doc.setLineWidth(0.6);
          doc.line(mx + 9, cursorY + 8, mx + 9, cursorY + 20);
        }
      }

      cursorY += headerH + 4;

      const body = faixas.map((f, idx) => {
        const row: any[] = [
          { content: f.label, styles: { halign: "center", fontStyle: "bold", textColor: CARAMELO } },
          { content: f.preco != null ? brl(f.preco) : "—", styles: { halign: "right" } },
          {
            content: pct(f.margemRevenda),
            styles: {
              halign: "right",
              textColor: f.margemRevenda != null && f.margemRevenda < 0 ? VERMELHO : ESCURO,
            },
          },
        ];
        if (idx === selIdx) {
          row.forEach((c) => {
            c.styles = { ...c.styles, fillColor: PINK, fontStyle: "bold", textColor: BORDO };
          });
        }
        return row;
      });

      autoTable(doc, {
        startY: cursorY,
        head: [["Faixa", "Preço unit. (B2B)", "Margem da revenda"]],
        body,
        styles: { font: F_SANS, fontSize: 9, cellPadding: 6, textColor: ESCURO, lineColor: CARAMELO, lineWidth: 0.3 },
        headStyles: { fillColor: BORDO, textColor: CREME, fontStyle: "bold", font: F_SANS, fontSize: 9, lineColor: BORDO, lineWidth: 0 },
        bodyStyles: { fillColor: CREME_CLARO },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "right" },
          2: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 4;

      doc.setFont(F_SANS, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...CARAMELO);
      const subLabel = `Subtotal (${i.qtd} un × ${brl(precoUnit)}):`;
      const subValor = brl(subtotalProduto);
      const subValorW = doc.getTextWidth(subValor);
      doc.setFont(F_SANS, "bold");
      doc.setTextColor(...BORDO);
      doc.text(subValor, pageW - margin, cursorY + 12, { align: "right" });
      doc.setFont(F_SANS, "normal");
      doc.setTextColor(...CARAMELO);
      doc.text(subLabel, pageW - margin - subValorW - 8, cursorY + 12, { align: "right" });

      cursorY += 24;
      if (itemIdx < data.itens.length - 1) cursorY += 6;
    });

    (doc as any).lastAutoTable = { finalY: cursorY };
  }

  let y = (doc as any).lastAutoTable.finalY + 24;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 40) {
      doc.addPage();
      desenharFundoPagina();
      y = 40;
    }
  };

  // ==== NOTA DE ALERGÊNICOS (agregada, se houver) ====
  const alergenicos = data.itens
    .filter((i) => i.alergenicos && i.alergenicos.trim())
    .map((i) => `${i.nome}: ${i.alergenicos!.trim()}`);
  if (alergenicos.length > 0) {
    const linhas = alergenicos.length;
    const blocoH = 22 + linhas * 12 + 10;
    ensureSpace(blocoH + 12);
    doc.setFillColor(...CREME_CLARO);
    doc.setDrawColor(...CARAMELO);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, pageW - margin * 2, blocoH, 6, 6, "FD");
    doc.setFont(F_SANS, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BORDO);
    doc.text("Alergênicos", margin + 12, y + 16);
    doc.setFont(F_SANS, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ESCURO);
    alergenicos.forEach((linha, idx) => {
      doc.text(linha, margin + 12, y + 30 + idx * 12);
    });
    y += blocoH + 14;
  }

  // ==== CONDIÇÕES + TOTAL ====
  const cond: Array<[string, string]> = [
    ["Prazo de pagamento", data.prazoPagamento || "A combinar"],
    ["Formas de pagamento", "Pix  •  Boleto"],
    [
      "Frete / entrega",
      data.freteGratis ? "Grátis" : data.frete > 0 ? brl(data.frete) : "A combinar",
    ],
    ["Pedido mínimo", data.pedidoMinimo != null ? brl(data.pedidoMinimo) : "—"],
    [
      "Prazo de entrega",
      data.prazoEntregaDias != null
        ? `até ${data.prazoEntregaDias} dias úteis após confirmação`
        : "A combinar",
    ],
    ["Validade da proposta", `${data.validadeDias} dias (até ${fmtDate(validade)})`],
  ];

  const condLinhas = cond.length;
  const condBlockH = 22 + condLinhas * 16 + 8;
  const totalBoxW = 240;
  const totalBoxH = 76;
  const blocoH = Math.max(condBlockH, totalBoxH);

  ensureSpace(blocoH + 12);

  const bandaTopo = y;

  doc.setFont(F_DISPLAY, "bold");
  doc.setTextColor(...BORDO);
  doc.setFontSize(14);
  doc.text("Condições comerciais", margin, bandaTopo);

  doc.setDrawColor(...CARAMELO);
  doc.setLineWidth(0.5);
  doc.line(margin, bandaTopo + 4, margin + 160, bandaTopo + 4);

  doc.setFontSize(10);
  let condY = bandaTopo + 22;
  cond.forEach(([label, val]) => {
    doc.setFont(F_SANS, "bold");
    doc.setTextColor(...CARAMELO);
    doc.text(label, margin, condY);
    doc.setFont(F_SANS, "normal");
    doc.setTextColor(...ESCURO);
    doc.text(val, margin + 160, condY);
    condY += 16;
  });

  // Total box
  const totalBoxX = pageW - margin - totalBoxW;
  const totalBoxY = bandaTopo;

  doc.setFillColor(...BORDO);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, totalBoxH, 10, 10, "F");
  doc.setFillColor(...PINK);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 4, 10, 10, "F");
  doc.setFillColor(...BORDO);
  doc.rect(totalBoxX, totalBoxY + 2, totalBoxW, 6, "F");

  doc.setTextColor(...CREME);
  doc.setFont(F_SANS, "normal");
  doc.setFontSize(9);
  doc.text("Subtotal itens", totalBoxX + 16, totalBoxY + 24);
  doc.text(brl(subtotal), totalBoxX + totalBoxW - 16, totalBoxY + 24, { align: "right" });

  doc.text("Frete", totalBoxX + 16, totalBoxY + 40);
  const freteTxt = data.freteGratis ? "Grátis" : data.frete > 0 ? brl(data.frete) : "—";
  doc.text(freteTxt, totalBoxX + totalBoxW - 16, totalBoxY + 40, { align: "right" });

  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(totalBoxX + 12, totalBoxY + 48, totalBoxX + totalBoxW - 12, totalBoxY + 48);

  doc.setFont(F_DISPLAY, "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", totalBoxX + 16, totalBoxY + 66);
  doc.setFontSize(16);
  doc.text(brl(total), totalBoxX + totalBoxW - 16, totalBoxY + 66, { align: "right" });

  y = bandaTopo + blocoH + 20;

  // ==== BLOCO DE ACEITE ====
  const aceiteH = 66;
  ensureSpace(aceiteH + 20);
  doc.setFillColor(...CREME_CLARO);
  doc.setDrawColor(...CARAMELO);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageW - margin * 2, aceiteH, 8, 8, "FD");
  doc.setFont(F_SANS, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BORDO);
  doc.text("Aceite", margin + 14, y + 18);

  doc.setFont(F_SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ESCURO);
  const aceiteTxt =
    `Para confirmar este pedido, responda por WhatsApp ou e-mail com "DE ACORDO" ` +
    `mencionando o nº ${data.numero}. A confirmação por escrito formaliza o pedido ` +
    `nas condições desta proposta.`;
  const wrapped = doc.splitTextToSize(aceiteTxt, pageW - margin * 2 - 28);
  doc.text(wrapped, margin + 14, y + 34);

  y += aceiteH + 20;

  // ==== RODAPÉ ====
  const FOOTER_H = 60;
  ensureSpace(FOOTER_H);

  doc.setDrawColor(...PINK);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);

  doc.setFont(F_DISPLAY, "italic");
  doc.setTextColor(...BORDO);
  doc.setFontSize(18);
  doc.text("Obrigado pela preferência!", pageW / 2, y + 24, { align: "center" });

  doc.setFont(F_SANS, "normal");
  doc.setTextColor(...CARAMELO);
  doc.setFontSize(9);
  doc.text(
    "comidayamor2020@gmail.com  •  +55 51 99643-7080",
    pageW / 2,
    y + 42,
    { align: "center" },
  );

  doc.save(`proposta-${data.numero}.pdf`);
}
