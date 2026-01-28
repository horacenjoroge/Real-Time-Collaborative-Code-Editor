export interface FileData {
  id: string;
  name: string;
  content: string;
  language: string;
  lastModified: number;
}

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
  sql: 'sql',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

export function getLanguageFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_EXTENSIONS[extension] || 'plaintext';
}
