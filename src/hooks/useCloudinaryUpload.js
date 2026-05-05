import { useState } from "react";

const CLOUD_NAME = "dbbeleuwr";
const UPLOAD_PRESET = "pet-shop";

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = async (file) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
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
