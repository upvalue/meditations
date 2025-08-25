export interface DocumentMetadata {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface CompileResult {
  code: string;
  metadata: DocumentMetadata;
  filename: string;
}

export interface CompilerOptions {
  inputDir: string;
  outputDir: string;
  watch?: boolean;
}

export interface FileManifest {
  sourceFile: string;
  outputFile: string;
  metadata: DocumentMetadata;
  sourceHash: string;
  buildTimestamp: number;
  lastModified: number;
  size: number;
}

export interface BuildManifest {
  buildTimestamp: number;
  files: FileManifest[];
  totalFiles: number;
  buildDuration: number;
}