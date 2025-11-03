'use server';

import { renderAndUploadAllPages } from '@/lib/doc-extract/pdf';

export async function processPDF(
  pdfUrl: string,
  documentId: string,
  projectId: string,
  userId: string
) {
  try {
    const result = await renderAndUploadAllPages(pdfUrl, {
      documentId,
      projectId,
      userId,
      scale: 2.0,
    });
    return { success: true, pageCount: result.pageCount };
  } catch (error: any) {
    console.error('PDF processing error:', error);
    return { success: false, error: error.message };
  }
}

