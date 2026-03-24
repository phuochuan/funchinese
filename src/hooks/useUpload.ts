// src/hooks/useUpload.ts
import { useState } from "react";

interface UploadResult {
  url: string;
  fileName: string;
  type: "image" | "audio";
  size: number;
  mimeType: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const upload = async (
    file: File,
    type: "image" | "audio"
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res  = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Lỗi upload");
        return null;
      }

      return data as UploadResult;
    } catch {
      setError("Lỗi kết nối");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, clearError: () => setError(null) };
}
