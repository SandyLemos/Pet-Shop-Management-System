import { useState } from "react";

const CLOUD_NAME = "dbbeleuwr";
const UPLOAD_PRESET = "pet-shop";

// ✅ Limites de foto
export const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB (depois de reduzir)
const LADO_MAXIMO = 1600; // px: suficiente para ver o pet, bem mais leve
const REDUZIR_ACIMA_DE = 1024 * 1024; // só reduz fotos acima de 1 MB

/** Reduz a foto para no máximo 1600 px em JPEG. Se não conseguir, devolve a original. */
async function reduzirFoto(file) {
  if (file.size <= REDUZIR_ACIMA_DE || typeof createImageBitmap !== "function") return file;
  try {
    const img = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close?.();
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // formato que o navegador não abre: segue a original (se couber no limite)
  }
}

export const MSG_NAO_E_FOTO = "Escolha um arquivo de imagem (foto).";
export const MSG_FOTO_GRANDE = "Foto muito grande (máximo 5 MB). Tire outra foto ou escolha uma menor.";

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = async (file) => {
    setUploading(true);
    setError(null);

    try {
      if (!String(file?.type || "").startsWith("image/")) throw new Error(MSG_NAO_E_FOTO);
      const foto = await reduzirFoto(file);
      if (foto.size > TAMANHO_MAXIMO) throw new Error(MSG_FOTO_GRANDE);

      const formData = new FormData();
      formData.append("file", foto, file.name || "foto.jpg");
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Erro ao fazer upload");
      }

      return data.secure_url; // ✅ Retorna a URL da imagem
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, error };
}
