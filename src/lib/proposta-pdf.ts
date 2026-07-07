import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-comidayamor.png";

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

const brl = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
const pct = (n: number | null) =>
  n != null && isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : "—";

export type PropostaItemPDF = {
  nome: string;
  qtd: number;
  precoB2B: number;
  b2c: number | null;
  margemComprador: number | null;
};

export type PropostaPDFData = {
  numero: string;
  emissao: Date;
  validadeDias: number;
  cliente: string;
  itens: PropostaItemPDF[];
  prazoDias: number;
  frete: number;
  tipoVenda?: "b2b" | "evento";
};

// Identidade visual Comida y Amor
const BORDO: [number, number, number] = [162, 36, 47];      // #A2242F
const CREME: [number, number, number] = [239, 227, 211];    // #EFE3D3
const CARAMELO: [number, number, number] = [167, 97, 65];   // #A76141
const PINK: [number, number, number] = [239, 192, 203];     // #EFC0CB
const VERMELHO: [number, number, number] = [242, 5, 49];    // #F20531
const ESCURO: [number, number, number] = [46, 20, 22];      // texto principal
const CREME_CLARO: [number, number, number] = [247, 240, 228];

// Fontes: jsPDF built-ins como fallback
// - "times" (serif) aproxima Playfair Display para títulos
// - "helvetica" aproxima Montserrat Alternates para corpo
// - italic é usado como fallback do Grandest Script
const F_DISPLAY = "times";
const F_SANS = "helvetica";

export function gerarNumeroProposta(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${dd}-${hh}${mm}`;
}

export function gerarPropostaPDF(data: PropostaPDFData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
  const validade = new Date(data.emissao);
  validade.setDate(validade.getDate() + data.validadeDias);

  // Função para desenhar o fundo creme + rodapé decorativo em cada página
  const desenharFundoPagina = () => {
    // Fundo creme
    doc.setFillColor(...CREME);
    doc.rect(0, 0, pageW, pageH, "F");

    // Faixa fina pink na borda superior
    doc.setFillColor(...PINK);
    doc.rect(0, 0, pageW, 6, "F");

    // Faixa fina bordô abaixo
    doc.setFillColor(...BORDO);
    doc.rect(0, 6, pageW, 2, "F");
  };

  desenharFundoPagina();

  // ==== CABEÇALHO ====
  // Monograma / logo textual (círculo bordô com "cyA")
  const logoX = margin + 26;
  const logoY = 62;
  doc.setFillColor(...BORDO);
  doc.circle(logoX, logoY, 26, "F");
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1);
  doc.circle(logoX, logoY, 30, "S");
  doc.setTextColor(...CREME);
  doc.setFont(F_DISPLAY, "italic");
  doc.setFontSize(20);
  doc.text("cyA", logoX, logoY + 7, { align: "center" });

  // Nome da empresa
  doc.setFont(F_DISPLAY, "bold");
  doc.setTextColor(...BORDO);
  doc.setFontSize(24);
  doc.text("Comida y Amor", margin + 66, 58);

  // Subtítulo caramelo
  doc.setFont(F_SANS, "normal");
  doc.setTextColor(...CARAMELO);
  doc.setFontSize(9);
  doc.text("Confeitaria artesanal", margin + 68, 74);

  // Bloco de contato (direita)
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

  // Linha divisória pink
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1.2);
  doc.line(margin, 105, pageW - margin, 105);

  // ==== TÍTULO PROPOSTA ====
  doc.setFont(F_DISPLAY, "bold");
  doc.setTextColor(...BORDO);
  doc.setFontSize(28);
  doc.text("Proposta Comercial", margin, 145);

  // Meta da proposta (direita, sob o título)
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

  // ==== TABELA DE ITENS ====
  const isEvento = data.tipoVenda === "evento";

  const body = data.itens.map((i) =>
    isEvento
      ? [i.nome, String(i.qtd), brl(i.precoB2B), brl(i.precoB2B * i.qtd)]
      : [
          i.nome,
          String(i.qtd),
          brl(i.precoB2B),
          brl(i.precoB2B * i.qtd),
          i.b2c != null ? brl(i.b2c) : "—",
          pct(i.margemComprador),
        ],
  );

  const subtotal = data.itens.reduce((s, i) => s + i.precoB2B * i.qtd, 0);
  const total = subtotal + data.frete;

  const head = isEvento
    ? [["Produto", "Qtd", "Preço unit.", "Subtotal"]]
    : [[
        "Produto",
        "Qtd",
        "Preço unit. (B2B)",
        "Subtotal",
        "Sugerido revenda",
        "Margem do comprador",
      ]];

  const columnStyles: Record<number, any> = isEvento
    ? {
        0: { textColor: BORDO, fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      }
    : {
        0: { textColor: BORDO, fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
        4: { halign: "right" },
        5: { halign: "right", textColor: CARAMELO, fontStyle: "bold" },
      };

  autoTable(doc, {
    startY: clienteY + 60,
    head,
    body,
    styles: {
      font: F_SANS,
      fontSize: 9,
      cellPadding: 7,
      textColor: ESCURO,
      lineColor: CARAMELO,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: BORDO,
      textColor: CREME,
      fontStyle: "bold",
      font: F_SANS,
      fontSize: 9,
      lineColor: BORDO,
      lineWidth: 0,
    },
    bodyStyles: { fillColor: CREME_CLARO },
    alternateRowStyles: { fillColor: CREME },
    columnStyles,
    // margem negativa em vermelho (apenas B2B)
    didParseCell: (hookData) => {
      if (
        !isEvento &&
        hookData.section === "body" &&
        hookData.column.index === 5
      ) {
        const item = data.itens[hookData.row.index];
        if (item?.margemComprador != null && item.margemComprador < 0) {
          hookData.cell.styles.textColor = VERMELHO;
        }
      }
    },
    margin: { left: margin, right: margin },
  });


  let y = (doc as any).lastAutoTable.finalY + 24;

  // ==== CONDIÇÕES COMERCIAIS ====
  doc.setFont(F_DISPLAY, "bold");
  doc.setTextColor(...BORDO);
  doc.setFontSize(14);
  doc.text("Condições comerciais", margin, y);

  // linha fina caramelo sob o título
  doc.setDrawColor(...CARAMELO);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 4, margin + 160, y + 4);

  y += 22;

  const cond: Array<[string, string]> = [
    ["Prazo de pagamento", `${data.prazoDias} dias${data.prazoDias === 0 ? " (à vista)" : ""}`],
    ["Formas de pagamento", "Pix  •  Boleto"],
    ["Frete / entrega", data.frete > 0 ? brl(data.frete) : "a combinar"],
    ["Validade da proposta", `${data.validadeDias} dias (até ${fmtDate(validade)})`],
  ];

  doc.setFontSize(10);
  cond.forEach(([label, val]) => {
    doc.setFont(F_SANS, "bold");
    doc.setTextColor(...CARAMELO);
    doc.text(label, margin, y);
    doc.setFont(F_SANS, "normal");
    doc.setTextColor(...ESCURO);
    doc.text(val, margin + 160, y);
    y += 16;
  });

  // ==== TOTAL BOX (bordô com cantos arredondados) ====
  const totalBoxW = 240;
  const totalBoxH = 76;
  const totalBoxX = pageW - margin - totalBoxW;
  const totalBoxY = y - 92;

  doc.setFillColor(...BORDO);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, totalBoxH, 10, 10, "F");

  // detalhe pink no topo do box
  doc.setFillColor(...PINK);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 4, 10, 10, "F");
  doc.setFillColor(...BORDO);
  doc.rect(totalBoxX, totalBoxY + 2, totalBoxW, 6, "F");

  doc.setTextColor(...CREME);
  doc.setFont(F_SANS, "normal");
  doc.setFontSize(9);
  doc.text("Subtotal itens", totalBoxX + 16, totalBoxY + 24);
  doc.text(brl(subtotal), totalBoxX + totalBoxW - 16, totalBoxY + 24, { align: "right" });

  doc.setFontSize(9);
  doc.text("Frete", totalBoxX + 16, totalBoxY + 40);
  doc.text(data.frete > 0 ? brl(data.frete) : "—", totalBoxX + totalBoxW - 16, totalBoxY + 40, { align: "right" });

  // linha divisória
  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(totalBoxX + 12, totalBoxY + 48, totalBoxX + totalBoxW - 12, totalBoxY + 48);

  doc.setFont(F_DISPLAY, "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", totalBoxX + 16, totalBoxY + 66);
  doc.setFontSize(16);
  doc.text(brl(total), totalBoxX + totalBoxW - 16, totalBoxY + 66, { align: "right" });

  y = Math.max(y, totalBoxY + totalBoxH) + 30;

  // ==== RODAPÉ ====
  const footerY = pageH - 70;

  // linha decorativa pink
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1);
  doc.line(margin, footerY, pageW - margin, footerY);

  // frase de encerramento (Grandest Script fallback: itálico serif)
  doc.setFont(F_DISPLAY, "italic");
  doc.setTextColor(...BORDO);
  doc.setFontSize(18);
  doc.text("Obrigado pela preferência!", pageW / 2, footerY + 24, { align: "center" });

  // contato no rodapé
  doc.setFont(F_SANS, "normal");
  doc.setTextColor(...CARAMELO);
  doc.setFontSize(9);
  doc.text(
    "comidayamor2020@gmail.com  •  +55 51 99643-7080",
    pageW / 2,
    footerY + 42,
    { align: "center" },
  );

  doc.save(`proposta-${data.numero}.pdf`);
}
