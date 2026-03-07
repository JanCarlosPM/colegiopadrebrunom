import { createRoot } from "react-dom/client";

type ReciboMatriculaData = {
  numero?: string;
  fecha: string;
  estudiante: string;
  grado?: string;
  anio: string;
  nivel?: string;
  montoCordobas?: string;
  montoDolares?: string;
  concepto: string;
};

function ReciboMatriculaTemplate({
  numero = "00001",
  fecha,
  estudiante,
  grado = "",
  anio,
  nivel = "",
  montoCordobas = "",
  montoDolares = "",
  concepto,
}: ReciboMatriculaData) {
  return (
    <div
      style={{
        position: "relative",
        width: "1365px",
        height: "1024px",
        backgroundImage: "url('/recibo-colegio.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        fontFamily: "Arial, sans-serif",
        color: "#1f4f8a",
      }}
    >
      {/* Número */}
      <div
        style={{
          position: "absolute",
          top: 210,
          left: 1110,
          fontSize: 34,
          fontWeight: "bold",
          color: "#c44",
          letterSpacing: "2px",
        }}
      >
        {numero}
      </div>

      {/* Grado */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 217,
          width: 300,
          fontSize: 26,
        }}
      >
        {grado}
      </div>

      {/* Año */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 611,
          width: 220,
          fontSize: 26,
          textAlign: "center",
        }}
      >
        {anio}
      </div>
      {/* Nivel / sección */}
      <div
        style={{
          position: "absolute",
          top: 378,
          left: 990,
          width: 360,
          fontSize: 26,
        }}
      >
        {nivel}
      </div>
      {/* Fecha */}
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 250,
          width: 520,
          fontSize: 26,
        }}
      >
        {fecha}
      </div>
      {/* Monto C$ */}
      <div
        style={{
          position: "absolute",
          top: 418,
          left: 1039,
          width: 250,
          fontSize: 26,
          textAlign: "left",
        }}
      >
        {montoCordobas}
      </div>
      {/* Monto $ */}
      <div
        style={{
          position: "absolute",
          top: 515,
          left: 1040,
          width: 250,
          fontSize: 26,
          textAlign: "left",
        }}
      >
        {montoDolares}
      </div>

      {/* Recibimos de */}
      <div
        style={{
          position: "absolute",
          top: 528,
          left: 373,
          width: 920,
          fontSize: 28,
        }}
      >
        {estudiante}
      </div>

      {/* Concepto */}
      <div
        style={{
          position: "absolute",
          top: 676,
          left: 345,
          width: 900,
          fontSize: 26,
        }}
      >
        {concepto}
      </div>
    </div>
  );
}

export function imprimirReciboMatricula(data: ReciboMatriculaData) {
  const win = window.open("", "_blank", "width=1400,height=1100");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Recibo Matrícula</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: white;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          @page {
            size: landscape;
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
  root.render(<ReciboMatriculaTemplate {...data} />);

  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 700);
}