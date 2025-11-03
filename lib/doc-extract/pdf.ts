import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface PDFPageText {
  pageNumber: number;
  text: string;
  blocks: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export async function loadPDF(url: string | ArrayBuffer) {
  const loadingTask = pdfjsLib.getDocument(url);
  return await loadingTask.promise;
}

export async function extractPDFPageText(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<PDFPageText> {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  
  const blocks = textContent.items.map((item: any) => ({
    text: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width,
    height: item.height,
  }));

  // Combine text
  const text = textContent.items.map((item: any) => item.str).join(' ');

  return {
    pageNumber,
    text,
    blocks,
  };
}

export async function extractAllPDFText(
  pdf: pdfjsLib.PDFDocumentProxy
): Promise<PDFPageText[]> {
  const numPages = pdf.numPages;
  const pages: PDFPageText[] = [];

  for (let i = 1; i <= numPages; i++) {
    const pageText = await extractPDFPageText(pdf, i);
    pages.push(pageText);
  }

  return pages;
}

// Store active render tasks to allow cancellation
const activeRenderTasks = new WeakMap<HTMLCanvasElement, pdfjsLib.RenderTask>();

export async function renderPDFPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<void> {
  // Cancel any existing render task on this canvas
  const existingTask = activeRenderTasks.get(canvas);
  if (existingTask) {
    try {
      existingTask.cancel();
    } catch (e) {
      // Ignore cancellation errors
    }
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  activeRenderTasks.set(canvas, renderTask);

  try {
    await renderTask.promise;
  } finally {
    activeRenderTasks.delete(canvas);
  }
}

export function canvasToDataURL(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return canvas.toDataURL(type);
}

export async function capturePDFPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.5
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderPDFPageToCanvas(pdf, pageNumber, canvas, scale);
  return canvasToDataURL(canvas);
}

// Render and upload all PDF pages to Supabase storage and index rows in document_pages
export async function renderAndUploadAllPages(
  pdfUrl: string,
  opts: {
    documentId: string;
    projectId: string;
    userId: string;
    bucket?: string;
    scale?: number;
  }
): Promise<{ pageCount: number }>{
  const { documentId, projectId, userId, bucket = 'project-docs', scale = 1.5 } = opts;
  const supabase = (await import('@/lib/supabase/client')).createSupabaseBrowser();

  const pdf = await loadPDF(pdfUrl);
  const numPages = pdf.numPages;

  for (let page = 1; page <= numPages; page++) {
    const dataUrl = await capturePDFPage(pdf, page, scale);
    const [meta, base64] = dataUrl.split(',');
    const contentTypeMatch = /data:(.*?);base64/.exec(meta || '');
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png';
    const buffer = typeof window === 'undefined' ? Buffer.from(base64, 'base64') : Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const path = `users/${userId}/${projectId}/pages/${documentId}/page-${page}.png`;

    // Upload image
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer as any, { contentType, upsert: true as any });

    if (uploadError) {
      console.error('Upload page error', uploadError);
      continue;
    }

    // Index row
    const { error: indexError } = await supabase.from('document_pages').upsert({
      document_id: documentId,
      page_number: page,
      image_path: path,
    }, { onConflict: 'document_id,page_number' });
    if (indexError) {
      console.error(`Index page ${page} error:`, indexError);
    }
  }

  return { pageCount: numPages };
}

