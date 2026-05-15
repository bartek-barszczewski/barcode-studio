export interface DocxLinePreview {
  index: number;
  html: string;
  text: string;
  isEmpty: boolean;
}

export interface DocxPreview {
  lines: DocxLinePreview[];
}
