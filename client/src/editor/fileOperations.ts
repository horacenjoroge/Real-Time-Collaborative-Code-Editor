import { FileData, getLanguageFromExtension } from './types';

const STORAGE_KEY = 'collab-editor-files';
const CURRENT_FILE_KEY = 'collab-editor-current-file';

export function saveFileToStorage(file: FileData): void {
  const files = getFilesFromStorage();
  const existingIndex = files.findIndex((f) => f.id === file.id);
  
  if (existingIndex >= 0) {
    files[existingIndex] = { ...file, lastModified: Date.now() };
  } else {
    files.push({ ...file, lastModified: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function getFilesFromStorage(): FileData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getFileFromStorage(id: string): FileData | null {
  const files = getFilesFromStorage();
  return files.find((f) => f.id === id) || null;
}

export function deleteFileFromStorage(id: string): void {
  const files = getFilesFromStorage();
  const filtered = files.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function createNewFile(name: string = 'untitled'): FileData {
  const extension = name.includes('.') ? name.split('.').pop() || '' : '';
  const language = extension ? getLanguageFromExtension(name) : 'plaintext';
  
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    content: '',
    language,
    lastModified: Date.now(),
  };
}

export function saveCurrentFileId(id: string): void {
  localStorage.setItem(CURRENT_FILE_KEY, id);
}

export function getCurrentFileId(): string | null {
  return localStorage.getItem(CURRENT_FILE_KEY);
}

export function downloadFile(file: FileData): void {
  const blob = new Blob([file.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadFileFromInput(
  file: File,
  callback: (fileData: FileData) => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    const language = getLanguageFromExtension(file.name);
    const fileData: FileData = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      content,
      language,
      lastModified: Date.now(),
    };
    callback(fileData);
  };
  reader.readAsText(file);
}
