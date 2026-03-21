import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

/** Azul institucional cercano al recibo impreso original */
const INK_BLUE = "#1a5490";
const INK_RED = "#c40000";
const PREIMPRESO_BG_URL = "/recibocolegio.jpg";
const PREIMPRESO_FONT_SIZE = 15;
const PREIMPRESO_SHIFT_X = 0.0; // mueve todo el bloque horizontalmente (+ derecha / - izquierda)
const PREIMPRESO_SHIFT_Y = -0.6; // ajuste fino vertical global (+ abajo / - arriba)

export type ReciboOficialData = {
  numero?: string;
  fecha: string;
  estudiante: string;
  grado?: string;
  anio: string;
  nivel?: string;
  montoCordobas?: string;
  montoDolares?: string;
  sumaDe?: string;
  concepto: string;
  /** Título principal (bloque central). */
  institucion?: string;
  slogan?: string;
  direccion?: string;
  telefono?: string;
  ciudad?: string;
  /** Texto pequeño esquina inferior derecha (metadatos de tiraje). */
  pieImpresion?: string;
};

export type ReciboPrintLayout = "oficial" | "carta" | "preimpreso";

export type ImprimirReciboOptions = {
  /**
   * `oficial` — Réplica del recibo Asociación Escuela Padre Bruno (vertical, media hoja carta).
   * `carta` — Diseño vertical tipo comprobante moderno.
   * `preimpreso` — Texto sobre `/recibo-colegio.png` si existe en public.
   */
  layout?: ReciboPrintLayout;
  autoPrint?: boolean;
};

const DEFAULT_INSTITUCION = "ASOCIACIÓN ESCUELA PADRE BRUNO MARTÍNEZ";
const DEFAULT_SLOGAN = '"UN PEQUEÑO GIGANTE"';
const DEFAULT_DIR = "Dirección: Villa San Jacinto, Frente al Parqueo Principal.";
const DEFAULT_TEL = "2248-7102";
const DEFAULT_CIUDAD = "Managua, Nicaragua";
const DEFAULT_PIE =
  "250-50: (2) 73,751 - 81,000 08-2022 * Quimice * Copia: M. Amarillo.";

const INSTITUCION_CARTA = "Colegio Padre Bruno";

function LogoSelloEscuela({ size = 92 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle cx="100" cy="100" r="96" fill="none" stroke={INK_BLUE} strokeWidth="3.5" />
      <circle cx="100" cy="100" r="82" fill="none" stroke={INK_BLUE} strokeWidth="1.2" />
      <text
        x="100"
        y="24"
        textAnchor="middle"
        fill={INK_BLUE}
        fontSize="7.2"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
      >
        COLEGIO PADRE BRUNO
      </text>
      <text
        x="100"
        y="35"
        textAnchor="middle"
        fill={INK_BLUE}
        fontSize="7.2"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
      >
        MARTÍNEZ
      </text>
      <text
        x="100"
        y="182"
        textAnchor="middle"
        fill={INK_BLUE}
        fontSize="9"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
      >
        MANAGUA
      </text>
      <circle cx="100" cy="100" r="38" fill="#e8f0fa" stroke={INK_BLUE} strokeWidth="1.5" />
      <text
        x="100"
        y="96"
        textAnchor="middle"
        fill={INK_BLUE}
        fontSize="22"
        fontFamily="Georgia, serif"
        fontWeight="700"
      >
        PBM
      </text>
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fill={INK_BLUE}
        fontSize="5.5"
        fontFamily="Arial, sans-serif"
        fontWeight="600"
      >
        LETRA · DIOS · PIEDAD
      </text>
    </svg>
  );
}

function MarcaAguaCentral() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div style={{ opacity: 0.07, transform: "scale(2.2)" }}>
        <LogoSelloEscuela size={200} />
      </div>
    </div>
  );
}

function LineaCampo({
  label,
  value,
  anchoLinea,
}: {
  label: string;
  value: string;
  anchoLinea?: CSSProperties["flex"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "6px",
        flex: anchoLinea ?? 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: "'Source Sans 3', Arial, sans-serif",
          fontWeight: 700,
          fontSize: "10.5pt",
          color: INK_BLUE,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          borderBottom: `2px solid ${INK_BLUE}`,
          minHeight: "1.35em",
          fontFamily: "'Source Sans 3', Arial, sans-serif",
          fontSize: "11pt",
          color: INK_BLUE,
          paddingLeft: "4px",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Réplica del recibo físico (vertical, media hoja carta, doble marco, tipografías y campos).
 */
function ReciboOficialBrunoTemplate({
  numero = "00000",
  fecha,
  estudiante,
  grado = "",
  anio,
  nivel = "",
  montoCordobas = "",
  montoDolares = "",
  sumaDe = "",
  concepto,
  institucion = DEFAULT_INSTITUCION,
  slogan = DEFAULT_SLOGAN,
  direccion = DEFAULT_DIR,
  telefono = DEFAULT_TEL,
  ciudad = DEFAULT_CIUDAD,
  pieImpresion = DEFAULT_PIE,
}: ReciboOficialData) {
  return (
    <div
      className="recibo-oficial-sheet"
      style={{
        width: "5.5in",
        height: "8.5in",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "0.12in 0.18in 0.1in",
        background: "#fff",
        color: INK_BLUE,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Cabecera (fuera del doble marco) */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "0.78in 1fr minmax(0.9in, auto)",
          alignItems: "start",
          gap: "0.12in",
          marginBottom: "0.06in",
        }}
      >
        <LogoSelloEscuela size={88} />
        <div style={{ textAlign: "center", paddingTop: "2px" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
              fontWeight: 900,
              fontSize: "12.5pt",
              letterSpacing: "0.04em",
              lineHeight: 1.15,
              color: INK_BLUE,
              textTransform: "uppercase",
            }}
          >
            {institucion}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "'Source Sans 3', Arial, sans-serif",
              fontWeight: 700,
              fontSize: "11pt",
              fontStyle: "italic",
              color: INK_BLUE,
            }}
          >
            {slogan}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontFamily: "'Source Sans 3', Arial, sans-serif",
              fontSize: "9pt",
              lineHeight: 1.35,
              color: INK_BLUE,
            }}
          >
            {direccion}
            <br />
            Teléfono: {telefono} · {ciudad}
          </p>
          <div
            style={{
              marginTop: "8px",
              display: "inline-block",
              background: INK_BLUE,
              color: "#fff",
              fontFamily: "'Source Sans 3', Arial, sans-serif",
              fontWeight: 700,
              fontSize: "11pt",
              letterSpacing: "0.12em",
              padding: "5px 26px",
              borderRadius: "8px",
            }}
          >
            RECIBO
          </div>
        </div>
        <div style={{ textAlign: "right", paddingTop: "4px" }}>
          <span
            style={{
              fontFamily: "'Merriweather', Georgia, serif",
              fontWeight: 700,
              fontSize: "15pt",
              color: INK_RED,
            }}
          >
            Nº {numero}
          </span>
        </div>
      </header>

      {/* Cuerpo con doble borde redondeado */}
      <section
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          border: `3px double ${INK_BLUE}`,
          borderRadius: "14px",
          padding: "0.26in 0.32in 0.2in",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <MarcaAguaCentral />

        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Fila GRADO / AÑO / NIVEL */}
          <div style={{ display: "flex", gap: "0.14in", marginBottom: "0.16in" }}>
            <LineaCampo label="GRADO:" value={grado} anchoLinea={1.15} />
            <LineaCampo label="AÑO:" value={anio} anchoLinea={0.85} />
            <LineaCampo label="NIVEL:" value={nivel} anchoLinea={1.25} />
          </div>

          {/* FECHA + RECIBO POR C$ */}
          <div style={{ display: "flex", gap: "0.2in", marginBottom: "0.06in", alignItems: "flex-end" }}>
            <div style={{ flex: 1.35 }}>
              <LineaCampo label="FECHA:" value={fecha} anchoLinea={1} />
            </div>
            <div style={{ width: "28%", minWidth: "120px" }}>
              <LineaCampo label="RECIBO POR C$:" value={montoCordobas} anchoLinea={1} />
            </div>
          </div>

          {/* U$ alineado bajo columna C$ */}
          <div style={{ display: "flex", marginBottom: "0.18in" }}>
            <div style={{ flex: 1.35 }} />
            <div style={{ width: "28%", minWidth: "120px" }}>
              <LineaCampo label="U$:" value={montoDolares} anchoLinea={1} />
            </div>
          </div>

          <div style={{ marginBottom: "0.16in" }}>
            <LineaCampo label="RECIBIMOS DE:" value={estudiante} />
          </div>
          <div style={{ marginBottom: "0.16in" }}>
            <LineaCampo label="LA SUMA DE:" value={sumaDe} />
          </div>
          <div style={{ marginBottom: "0.14in" }}>
            <LineaCampo label="EN CONCEPTO DE:" value={concepto} />
          </div>

          {/* Líneas adicionales (como en el formulario impreso) */}
          <div style={{ marginBottom: "0.12in" }}>
            <div style={{ borderBottom: `2px solid ${INK_BLUE}`, minHeight: "1.35em" }} />
          </div>
          <div style={{ marginBottom: "auto", minHeight: "0.12in" }}>
            <div style={{ borderBottom: `2px solid ${INK_BLUE}`, minHeight: "1.35em" }} />
          </div>

          {/* Firma */}
          <div style={{ marginTop: "0.18in", textAlign: "center" }}>
            <div
              style={{
                maxWidth: "3.2in",
                margin: "0 auto",
                borderBottom: `2px solid ${INK_BLUE}`,
                minHeight: "1.1em",
              }}
            />
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: "'Source Sans 3', Arial, sans-serif",
                fontSize: "9pt",
                fontWeight: 600,
                color: INK_BLUE,
              }}
            >
              ADMINISTRACIÓN
            </p>
          </div>

          <p
            style={{
              margin: "0.12in 0 0",
              textAlign: "right",
              fontFamily: "'Source Sans 3', Arial, sans-serif",
              fontSize: "6.5pt",
              color: INK_BLUE,
              lineHeight: 1.25,
              opacity: 0.92,
            }}
          >
            {pieImpresion}
          </p>
        </div>
      </section>

      <p
        className="recibo-oficial-ayuda"
        style={{
          margin: "6px 0 0",
          fontSize: "7pt",
          color: "#64748b",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Impresión: papel <strong>Carta</strong>, orientación <strong>vertical</strong>, escala <strong>100%</strong>.
      </p>
    </div>
  );
}

/** Plantilla antigua: campos sobre PNG. */
function ReciboPreimpresoTemplate({
  numero = "00001",
  fecha,
  estudiante,
  grado = "",
  anio,
  nivel = "",
  montoCordobas = "",
  montoDolares = "",
  sumaDe = "",
  concepto,
}: ReciboOficialData) {
  const posBase = {
    numero: { top: "9.5%", left: "86.2%" },
    // Ajuste fino con base en vista previa real del navegador:
    // se desplazaron ~6-7% hacia arriba para alinear con los renglones impresos.
    grado: { top: "41.8%", left: "8.5%" },
    anio: { top: "41.8%", left: "38.5%" },
    nivel: { top: "41.8%", left: "62.5%" },
    fecha: { top: "48.9%", left: "8.5%" },
    cordobas: { top: "48.9%", left: "75.5%" },
    dolares: { top: "55.8%", left: "75.5%" },
    recibimosDe: { top: "55.8%", left: "18%" },
    sumaDe: { top: "62.7%", left: "14.5%" },
    concepto: { top: "69.6%", left: "18.8%" },
  } as const;

  const withShift = (v: { top: string; left: string }) => ({
    top: `${Number.parseFloat(v.top) + PREIMPRESO_SHIFT_Y}%`,
    left: `${Number.parseFloat(v.left) + PREIMPRESO_SHIFT_X}%`,
  });

  const pos = {
    numero: withShift(posBase.numero),
    grado: withShift(posBase.grado),
    anio: withShift(posBase.anio),
    nivel: withShift(posBase.nivel),
    fecha: withShift(posBase.fecha),
    cordobas: withShift(posBase.cordobas),
    dolares: withShift(posBase.dolares),
    recibimosDe: withShift(posBase.recibimosDe),
    sumaDe: withShift(posBase.sumaDe),
    concepto: withShift(posBase.concepto),
  } as const;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundImage: `url('${PREIMPRESO_BG_URL}')`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "Arial, sans-serif",
        color: "#0f3f78",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: pos.numero.top,
          left: pos.numero.left,
          fontSize: 22,
          fontWeight: "bold",
          color: "#c44",
          letterSpacing: "1px",
        }}
      >
        {numero}
      </div>
      <div style={{ position: "absolute", top: pos.grado.top, left: pos.grado.left, width: "24%", fontSize: PREIMPRESO_FONT_SIZE }}>{grado}</div>
      <div
        style={{
          position: "absolute",
          top: pos.anio.top,
          left: pos.anio.left,
          width: "18%",
          fontSize: PREIMPRESO_FONT_SIZE,
          textAlign: "center",
        }}
      >
        {anio}
      </div>
      <div style={{ position: "absolute", top: pos.nivel.top, left: pos.nivel.left, width: "30%", fontSize: PREIMPRESO_FONT_SIZE }}>{nivel}</div>
      <div style={{ position: "absolute", top: pos.fecha.top, left: pos.fecha.left, width: "42%", fontSize: PREIMPRESO_FONT_SIZE }}>{fecha}</div>
      <div style={{ position: "absolute", top: pos.cordobas.top, left: pos.cordobas.left, width: "18%", fontSize: PREIMPRESO_FONT_SIZE }}>{montoCordobas}</div>
      <div style={{ position: "absolute", top: pos.dolares.top, left: pos.dolares.left, width: "18%", fontSize: PREIMPRESO_FONT_SIZE }}>{montoDolares}</div>
      <div style={{ position: "absolute", top: pos.recibimosDe.top, left: pos.recibimosDe.left, width: "73%", fontSize: PREIMPRESO_FONT_SIZE }}>{estudiante}</div>
      <div style={{ position: "absolute", top: pos.sumaDe.top, left: pos.sumaDe.left, width: "76%", fontSize: PREIMPRESO_FONT_SIZE }}>{sumaDe}</div>
      <div style={{ position: "absolute", top: pos.concepto.top, left: pos.concepto.left, width: "70%", fontSize: PREIMPRESO_FONT_SIZE }}>{concepto}</div>
    </div>
  );
}

function ReciboCartaTemplate({
  numero = "—",
  fecha,
  estudiante,
  grado = "—",
  anio,
  nivel = "—",
  montoCordobas = "",
  montoDolares = "",
  sumaDe = "",
  concepto,
  institucion = INSTITUCION_CARTA,
}: ReciboOficialData) {
  const brand = "#0f3f78";
  const accent = "#c2410c";

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 32%) 1fr",
    gap: "6px 16px",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "13pt",
    lineHeight: 1.35,
  };

  const labelStyle: CSSProperties = {
    fontWeight: 700,
    color: brand,
    textTransform: "uppercase",
    fontSize: "10pt",
    letterSpacing: "0.04em",
  };

  return (
    <div
      className="recibo-carta-sheet"
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        background: "#fff",
        padding: "0.45in 0.55in",
        minHeight: "10in",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          textAlign: "center",
          paddingBottom: "0.35in",
          borderBottom: `3px solid ${brand}`,
          marginBottom: "0.35in",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "20pt",
            fontWeight: 800,
            color: brand,
            letterSpacing: "-0.02em",
          }}
        >
          {institucion}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "11pt", color: "#64748b" }}>Comprobante de pago / recibo de caja</p>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.3in",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span style={labelStyle}>No. recibo</span>
          <div style={{ fontSize: "18pt", fontWeight: 800, color: accent }}>{numero}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={labelStyle}>Fecha y hora</span>
          <div style={{ fontSize: "13pt", fontWeight: 600 }}>{fecha}</div>
        </div>
      </div>

      <section style={{ marginBottom: "0.35in" }}>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "11pt",
            color: brand,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Datos del estudiante
        </h2>
        <div style={rowStyle}>
          <span style={labelStyle}>Estudiante</span>
          <span style={{ fontWeight: 600 }}>{estudiante}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Grado</span>
          <span>{grado}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Sección / nivel</span>
          <span>{nivel}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={labelStyle}>Año académico</span>
          <span>{anio}</span>
        </div>
      </section>

      <section
        style={{
          background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
          borderRadius: "10px",
          padding: "0.28in",
          marginBottom: "0.35in",
          border: "1px solid #cbd5e1",
        }}
      >
        <h2
          style={{
            margin: "0 0 14px",
            fontSize: "11pt",
            color: brand,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Concepto y montos
        </h2>
        <div style={{ ...rowStyle, borderBottom: "1px solid #cbd5e1", background: "transparent" }}>
          <span style={labelStyle}>Concepto</span>
          <span style={{ fontWeight: 600 }}>{concepto}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "1px solid #cbd5e1", background: "transparent" }}>
          <span style={labelStyle}>La suma de</span>
          <span style={{ fontWeight: 700, fontSize: "14pt", color: brand }}>{sumaDe || "—"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "14px" }}>
          <div>
            <span style={labelStyle}>Monto en córdobas (C$)</span>
            <div style={{ fontSize: "13pt", fontWeight: 600 }}>{montoCordobas || "—"}</div>
          </div>
          <div>
            <span style={labelStyle}>Monto en dólares ($)</span>
            <div style={{ fontSize: "13pt", fontWeight: 600 }}>{montoDolares || "—"}</div>
          </div>
        </div>
      </section>

      <footer
        style={{
          marginTop: "auto",
          paddingTop: "0.35in",
          fontSize: "9pt",
          color: "#64748b",
          lineHeight: 1.5,
          borderTop: "1px dashed #cbd5e1",
        }}
      >
        <p style={{ margin: 0 }}>Documento generado electrónicamente. Conserve este recibo como comprobante de pago.</p>
      </footer>
    </div>
  );
}

function getShellHtml(layout: ReciboPrintLayout, title: string): string {
  const fonts =
    '<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,700&display=swap" rel="stylesheet"/>';

  if (layout === "preimpreso") {
    return `
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        ${fonts}
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #cbd5e1; }
          @page { size: letter portrait; margin: 0; }
          #wrap { min-height: 100vh; padding: 12px; display: flex; flex-direction: column; align-items: center; }
          #sheet { width: 8.5in; height: 11in; background: #fff; display: flex; flex-direction: column; align-items: center; }
          #print-root { width: 8.5in; height: 5.5in; margin: 0; }
          .cut-line { width: 8.5in; border-top: 1px dashed #94a3b8; margin: 0; }
          .no-print { padding: 10px; text-align: center; font-family: system-ui, sans-serif; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; width: 100%; box-sizing: border-box; border-radius: 8px; margin-bottom: 8px; max-width: 8.9in; }
          .no-print button { margin: 0 6px; padding: 8px 16px; cursor: pointer; font-size: 14px; border-radius: 6px; border: 1px solid #94a3b8; background: #fff; }
          .no-print p { margin: 8px 0 0; font-size: 12px; color: #475569; }
          @media print {
            html, body { background: #fff !important; }
            #wrap { padding: 0; min-height: auto; }
            #sheet { width: 8.5in; height: 11in; min-height: auto; }
            .no-print { display: none !important; }
            .cut-line { border-top: 1px dashed transparent; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div id="wrap">
          <div class="no-print">
            <button type="button" onclick="window.print()">Imprimir (media hoja)</button>
            <button type="button" onclick="window.close()">Cerrar</button>
            <p>Plantilla real: media hoja exacta (8.5 x 5.5). En impresión usa escala 100% y sin márgenes.</p>
          </div>
          <div id="sheet">
            <div id="print-root"></div>
            <div class="cut-line"></div>
          </div>
        </div>
      </body>
    </html>`;
  }

  if (layout === "oficial") {
    return `
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        ${fonts}
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #cbd5e1; }
          #wrap { min-height: 100vh; padding: 12px; display: flex; flex-direction: column; align-items: center; }
          #print-root { flex: 0 0 auto; }
          @page { size: letter portrait; margin: 0.28in; }
          @media print {
            html, body { background: #fff !important; }
            #wrap { padding: 0; }
            .no-print { display: none !important; }
            .recibo-oficial-ayuda { display: none !important; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { width: 100%; max-width: 6.1in; padding: 10px; text-align: center; font-family: system-ui, sans-serif; background: #f1f5f9; border-radius: 8px; margin-bottom: 10px; }
          .no-print button { margin: 0 6px; padding: 10px 18px; cursor: pointer; font-size: 14px; border-radius: 8px; border: none; font-weight: 600; }
          .no-print .btn-print { background: #1a5490; color: #fff; }
          .no-print .btn-close { background: #e2e8f0; color: #334155; }
          .no-print p { margin: 8px 0 0; font-size: 12px; color: #475569; max-width: 40rem; margin-left: auto; margin-right: auto; }
        </style>
      </head>
      <body>
        <div id="wrap">
          <div class="no-print">
            <button type="button" class="btn-print" onclick="window.print()">Imprimir recibo (Vertical media hoja)</button>
            <button type="button" class="btn-close" onclick="window.close()">Cerrar</button>
            <p>Réplica del recibo institucional. Use papel <strong>Letter</strong>, orientación <strong>vertical</strong>, escala <strong>100%</strong>. El formato ocupa media hoja.</p>
          </div>
          <div id="print-root"></div>
        </div>
      </body>
    </html>`;
  }

  return `
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        ${fonts}
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #e2e8f0; }
          #wrap { min-height: 100vh; padding: 16px; }
          #print-root { max-width: 8.5in; margin: 0 auto; background: #fff; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.12); border-radius: 4px; overflow: hidden; }
          @page { size: letter portrait; margin: 0.45in; }
          @media print {
            html, body { background: #fff !important; }
            #wrap { padding: 0; min-height: 0; }
            #print-root { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .recibo-carta-sheet { padding: 0 !important; min-height: 0 !important; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { padding: 12px; text-align: center; font-family: system-ui, sans-serif; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .no-print button { margin: 0 6px; padding: 10px 18px; cursor: pointer; font-size: 14px; border-radius: 8px; border: none; font-weight: 600; }
          .no-print .btn-print { background: #0f3f78; color: #fff; }
          .no-print .btn-close { background: #e2e8f0; color: #334155; }
          .no-print p { margin: 10px 0 0; font-size: 12px; color: #64748b; max-width: 42rem; margin-left: auto; margin-right: auto; line-height: 1.45; }
        </style>
      </head>
      <body>
        <div id="wrap">
          <div class="no-print">
            <button type="button" class="btn-print" onclick="window.print()">Imprimir (Carta vertical)</button>
            <button type="button" class="btn-close" onclick="window.close()">Cerrar ventana</button>
            <p>Vista previa <strong>Carta vertical</strong>. Escala <strong>100%</strong>, sin ajustar a página.</p>
          </div>
          <div id="print-root"></div>
        </div>
      </body>
    </html>`;
}

/**
 * Abre ventana de impresión. Por defecto: diseño <strong>preimpreso</strong>
 * (carta vertical completa con recibo horizontal en la mitad superior).
 */
export function imprimirReciboOficial(data: ReciboOficialData, options?: ImprimirReciboOptions) {
  const layout = options?.layout ?? "preimpreso";
  const autoPrint = options?.autoPrint !== false;

  const w = layout === "oficial" ? 840 : 900;
  const h = layout === "oficial" ? 1240 : 1100;
  const win = window.open("", "_blank", `width=${w},height=${h}`);
  if (!win) {
    toast.error("No se pudo abrir el recibo. Habilita los pop-ups del navegador.");
    return;
  }

  const titles: Record<ReciboPrintLayout, string> = {
    oficial: "Recibo — Oficial",
    carta: "Recibo — Carta",
    preimpreso: "Recibo — Preimpreso",
  };
  win.document.write(getShellHtml(layout, titles[layout]));
  win.document.close();

  const rootElement = win.document.getElementById("print-root");
  if (!rootElement) return;

  const root = createRoot(rootElement);
  if (layout === "preimpreso") {
    root.render(<ReciboPreimpresoTemplate {...data} />);
  } else if (layout === "carta") {
    root.render(<ReciboCartaTemplate {...data} />);
  } else {
    root.render(<ReciboOficialBrunoTemplate {...data} />);
  }

  const delay = layout === "preimpreso" ? 700 : 500;
  setTimeout(() => {
    win.focus();
    if (autoPrint) win.print();
  }, delay);
}

export function imprimirReciboMatricula(data: ReciboOficialData, options?: ImprimirReciboOptions) {
  imprimirReciboOficial(data, options);
}
