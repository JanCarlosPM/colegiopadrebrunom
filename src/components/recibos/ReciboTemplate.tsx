type ReciboData = {
  numero: string;
  fecha: string;
  estudiante: string;
  grado: string;
  anio: string;
  nivel: string;
  concepto: string;
  montoCordobas?: string;
  montoDolares?: string;
  sumaEnLetras: string;
};

export default function ReciboTemplate({
  numero,
  fecha,
  estudiante,
  grado,
  anio,
  nivel,
  concepto,
  montoCordobas = "",
  montoDolares = "",
  sumaEnLetras,
}: ReciboData) {
  return (
    <div
      style={{
        position: "relative",
        width: "1200px",
        height: "780px",
        backgroundImage: "url('/recibo-colegio.png')",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ position: "absolute", top: 145, left: 1010, fontSize: 28, color: "#c33", fontWeight: "bold" }}>
        {numero}
      </div>

      <div style={{ position: "absolute", top: 255, left: 170, fontSize: 24 }}>{grado}</div>
      <div style={{ position: "absolute", top: 255, left: 560, fontSize: 24 }}>{anio}</div>
      <div style={{ position: "absolute", top: 255, left: 865, fontSize: 24 }}>{nivel}</div>

      <div style={{ position: "absolute", top: 325, left: 180, fontSize: 24 }}>{fecha}</div>

      <div style={{ position: "absolute", top: 326, left: 925, fontSize: 24 }}>{montoCordobas}</div>
      <div style={{ position: "absolute", top: 380, left: 925, fontSize: 24 }}>{montoDolares}</div>

      <div style={{ position: "absolute", top: 435, left: 275, fontSize: 24, width: 760 }}>
        {estudiante}
      </div>

      <div style={{ position: "absolute", top: 495, left: 260, fontSize: 24, width: 820 }}>
        {sumaEnLetras}
      </div>

      <div style={{ position: "absolute", top: 555, left: 340, fontSize: 24, width: 780 }}>
        {concepto}
      </div>
    </div>
  );
}