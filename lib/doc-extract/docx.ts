import mammoth from 'mammoth';

export interface DocxContent {
  text: string;
  html: string;
}

export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<DocxContent> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      text: textResult.value,
      html: result.value,
    };
  } catch (error) {
    console.error('Error extracting DOCX:', error);
    throw new Error('Erreur lors de l\'extraction du document DOCX');
  }
}

// Client-side preview using docx-preview
export async function renderDocxPreview(
  arrayBuffer: ArrayBuffer,
  container: HTMLElement
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Dynamic import for client-side only
    const { renderAsync } = await import('docx-preview');
    await renderAsync(arrayBuffer, container, undefined, {
      className: 'docx-preview',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
    });
  } catch (error) {
    console.error('Error rendering DOCX preview:', error);
    throw new Error('Erreur lors du rendu du document DOCX');
  }
}


