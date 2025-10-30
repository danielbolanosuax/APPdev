import React, { useRef, useEffect } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanningRef = useRef<boolean>(false); // Para asegurarnos de no procesar múltiples veces el mismo código

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    // Comenzar a escanear de la cámara (dispositivo por defecto)
    codeReader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
      if (result) {
        if (!scanningRef.current) {
          scanningRef.current = true; // Marcar que ya se escaneó un código
          const text = result.getText();
          onScan(text); // Devolver el código escaneado al componente padre
          codeReader.reset(); // Detener el escaneo tras obtener un resultado
        }
      }
      if (error && !(error instanceof NotFoundException)) {
        // Ignorar errores de "no encontrado" para evitar spam en consola, loguear otros errores
        console.error(error);
      }
    });
    return () => {
      // Al desmontar el componente, asegurarse de detener el escaneo y liberar la cámara
      codeReader.reset();
    };
  }, [onScan]);

  return (
    // El elemento de vídeo mostrará la vista de la cámara. Se estiliza vía CSS para cubrir la pantalla de escaneo.
    <video ref={videoRef} />
  );
};

export default BarcodeScanner;
