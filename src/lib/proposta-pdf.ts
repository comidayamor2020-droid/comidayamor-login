import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
};

const PRIMARY: [number, number, number] = [162, 36, 47]; // #A2242F
const BG_SOFT: [number, number, number] = [239, 227, 211]; // #EFE3D3

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
  const margin = 40;

  // Header band
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 90, "F");

  // Logo placeholder
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.rect(margin, 20, 70, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("LOGO", margin + 35, 48, { align: "center" });

  // Company name + meta
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Comida y Amor", margin + 85, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ: [a preencher]   •   Contato: [a preencher]", margin + 85, 58);

  // Proposta meta (right)
  doc.setFontSize(9);
  const validade = new Date(data.emissao);
  validade.setDate(validade.getDate() + data.validadeDias);
  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
  doc.text(`Proposta nº ${data.numero}`, pageW - margin, 36, { align: "right" });
  doc.text(`Emissão: ${fmtDate(data.emissao)}`, pageW - margin, 50, { align: "right" });
  doc.text(`Válida até: ${fmtDate(validade)}`, pageW - margin, 64, { align: "right" });

  // Title
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Proposta Comercial", margin, 125);

  // Cliente
  doc.setFillColor(...BG_SOFT);
  doc.rect(margin, 140, pageW - margin * 2, 40, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin + 12, 158);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.cliente || "—", margin + 12, 173);

  // Tabela de itens
  const body = data.itens.map((i) => [
    i.nome,
    String(i.qtd),
    brl(i.precoB2B),
    brl(i.precoB2B * i.qtd),
    i.b2c != null ? brl(i.b2c) : "—",
    pct(i.margemComprador),
  ]);

  const subtotal = data.itens.reduce((s, i) => s + i.precoB2B * i.qtd, 0);
  const total = subtotal + data.frete;

  autoTable(doc, {
    startY: 200,
    head: [[
      "Produto",
      "Qtd",
      "Preço unit. (B2B)",
      "Subtotal",
      "Sugerido revenda",
      "Margem do comprador",
    ]],
    body,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 246, 240] },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  let y = (doc as any).lastAutoTable.finalY + 20;

  // Condições + Totais
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Condições comerciais", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const cond = [
    `Prazo de pagamento: ${data.prazoDias} dias${data.prazoDias === 0 ? " (à vista)" : ""}`,
    `Frete / entrega: ${data.frete > 0 ? brl(data.frete) : "a combinar"}`,
    `Validade da proposta: ${data.validadeDias} dias (até ${fmtDate(validade)})`,
  ];
  cond.forEach((l) => {
    doc.text(l, margin, y);
    y += 14;
  });

  y += 8;
  // Total box
  doc.setFillColor(...PRIMARY);
  doc.rect(pageW - margin - 220, y, 220, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Subtotal itens:", pageW - margin - 210, y + 18);
  doc.text(brl(subtotal), pageW - margin - 10, y + 18, { align: "right" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageW - margin - 210, y + 40);
  doc.text(brl(total), pageW - margin - 10, y + 40, { align: "right" });

  // Rodapé
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(
    "Obrigado pela preferência! Dúvidas, estamos à disposição.",
    pageW / 2,
    footerY + 18,
    { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Comida y Amor  •  Contato: [telefone / e-mail]  •  [endereço]",
    pageW / 2,
    footerY + 34,
    { align: "center" },
  );

  doc.save(`proposta-${data.numero}.pdf`);
}
