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
          top: "20.3%",
          left: "86.2%",
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
          top: "38.2%",
          left: "7.1%",
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
          top: "38.2%",
          left: "36.2%",
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
          top: "38.2%",
          left: "60.8%",
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
          top: "44.2%",
          left: "9.3%",
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
          top: "44.2%",
          left: "75.8%",
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
          top: "50.4%",
          left: "75.8%",
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
          top: "57.6%",
          left: "17.4%",
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
          top: "63.8%",
          left: "14.5%",
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
          top: "70.1%",
          left: "18.8%",
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