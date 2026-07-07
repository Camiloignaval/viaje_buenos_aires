// Comprime una foto en el navegador antes de guardarla/subirla.
// Por qué: una foto de celular sin comprimir puede pesar 8-15MB. Eso:
//  1) llena el localStorage rapidísimo en modo local (tiene ~5-10MB de cupo total), y
//  2) supera el límite de tamaño de request de las funciones serverless de Vercel (~4.5MB).
// Bajando a máximo 1600px de lado y calidad JPEG 0.82, una foto normal
// termina pesando algunos cientos de KB sin notarse la diferencia a simple vista.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo procesar la imagen."));
    };

    img.src = objectUrl;
  });
}
