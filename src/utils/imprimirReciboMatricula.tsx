import { createRoot } from "react-dom/client";
import { toast } from "sonner";

type ReciboOficialData = {
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
};

function ReciboOficialTemplate({
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
  const pos = {
    numero: { top: "9.5%", left: "86.2%" },
    grado: { top: "49.5%", left: "8.5%" }, // 1
    anio: { top: "49.5%", left: "38.5%" }, // 2
    nivel: { top: "49.5%", left: "62.5%" }, // 3
    fecha: { top: "57.5%", left: "8.5%" }, // 4
    cordobas: { top: "57.5%", left: "75.5%" }, // 5
    dolares: { top: "64.5%", left: "75.5%" }, // 6
    recibimosDe: { top: "64.5%", left: "18%" }, // 7
    sumaDe: { top: "72.5%", left: "14.5%" }, // 8
    concepto: { top: "79.5%", left: "18.8%" }, // 9
  } as const;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundImage: "url('/recibo-colegio.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        fontFamily: "Arial, sans-serif",
        color: "#0f3f78",
      }}
    >
      {/* Número */}
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

      {/* Grado */}
      <div
        style={{
          position: "absolute",
          top: pos.grado.top,
          left: pos.grado.left,
          width: "24%",
          fontSize: 16,
        }}
      >
        {grado}
      </div>

      {/* Año */}
      <div
        style={{
          position: "absolute",
          top: pos.anio.top,
          left: pos.anio.left,
          width: "18%",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        {anio}
      </div>
      {/* Nivel / sección */}
      <div
        style={{
          position: "absolute",
          top: pos.nivel.top,
          left: pos.nivel.left,
          width: "30%",
          fontSize: 16,
        }}
      >
        {nivel}
      </div>
      {/* Fecha */}
      <div
        style={{
          position: "absolute",
          top: pos.fecha.top,
          left: pos.fecha.left,
          width: "42%",
          fontSize: 16,
        }}
      >
        {fecha}
      </div>
      {/* Monto C$ */}
      <div
        style={{
          position: "absolute",
          top: pos.cordobas.top,
          left: pos.cordobas.left,
          width: "18%",
          fontSize: 16,
          textAlign: "left",
        }}
      >
        {montoCordobas}
      </div>
      {/* Monto $ */}
      <div
        style={{
          position: "absolute",
          top: pos.dolares.top,
          left: pos.dolares.left,
          width: "18%",
          fontSize: 16,
          textAlign: "left",
        }}
      >
        {montoDolares}
      </div>

      {/* Recibimos de */}
      <div
        style={{
          position: "absolute",
          top: pos.recibimosDe.top,
          left: pos.recibimosDe.left,
          width: "73%",
          fontSize: 16,
        }}
      >
        {estudiante}
      </div>

      {/* La suma de */}
      <div
        style={{
          position: "absolute",
          top: pos.sumaDe.top,
          left: pos.sumaDe.left,
          width: "76%",
          fontSize: 16,
        }}
      >
        {sumaDe}
      </div>

      {/* Concepto */}
      <div
        style={{
          position: "absolute",
          top: pos.concepto.top,
          left: pos.concepto.left,
          width: "70%",
          fontSize: 16,
        }}
      >
        {concepto}
      </div>
    </div>
  );
}

export function imprimirReciboOficial(data: ReciboOficialData) {
  const win = window.open("", "_blank", "width=1400,height=1100");
  if (!win) {
    toast.error("No se pudo abrir el recibo. Habilita los pop-ups del navegador.");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>Recibo Matrícula</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            width: 8.5in;
            height: 5.5in;
          }
          body {
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
          }
          #print-root {
            width: 8.5in;
            height: 5.5in;
          }
          @page {
            size: 8.5in 5.5in;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `);

  win.document.close();

  const rootElement = win.document.getElementById("print-root");
  if (!rootElement) return;

  const root = createRoot(rootElement);
  root.render(<ReciboOficialTemplate {...data} />);

  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 700);
}

export function imprimirReciboMatricula(data: ReciboOficialData) {
  imprimirReciboOficial(data);
}