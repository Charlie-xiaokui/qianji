const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFiles(files: File[]) {
  const invalid = files.find((file) => !acceptedTypes.has(file.type));
  if (invalid) {
    throw new Error(`${invalid.name} 不是支持的图片格式`);
  }
}

export function filesToOcrFormData(files: File[]) {
  validateImageFiles(files);
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file, file.name));
  return formData;
}
