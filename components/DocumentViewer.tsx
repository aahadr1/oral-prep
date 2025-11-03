'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPDF, renderPDFPageToCanvas, extractPDFPageText, capturePDFPage } from '@/lib/doc-extract/pdf';
import { extractDocxText, renderDocxPreview } from '@/lib/doc-extract/docx';
import { extractPPTXText, renderPPTXSlide } from '@/lib/doc-extract/pptx';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  contentType: string;
  onPageChange?: (page: number) => void;
  onTextExtracted?: (text: string) => void;
}

type ViewMode = 'single-page' | 'continuous';

export default function DocumentViewer({
  documentUrl,
  documentName,
  contentType,
  onPageChange,
  onTextExtracted,
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(2.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single-page');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const continuousContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);

  const isPDF = contentType === 'application/pdf';
  const isImage = contentType.startsWith('image/');
  const isDocx = contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPPTX = contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  // Load document
  useEffect(() => {
    let mounted = true;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isPDF) {
          const pdf = await loadPDF(documentUrl);
          if (!mounted) return;
          
          pdfDocRef.current = pdf;
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          
          if (canvasRef.current) {
            await renderPDFPageToCanvas(pdf, 1, canvasRef.current, scale);
          }

          // Extract text for the first page
          const pageText = await extractPDFPageText(pdf, 1);
          onTextExtracted?.(pageText.text);
        } else if (isImage) {
          setTotalPages(1);
          setCurrentPage(1);
        } else if (isDocx || isPPTX) {
          // Fetch as ArrayBuffer
          const response = await fetch(documentUrl);
          const buffer = await response.arrayBuffer();
          arrayBufferRef.current = buffer;

          if (isDocx) {
            const content = await extractDocxText(buffer);
            onTextExtracted?.(content.text);
            setTotalPages(1); // Treat as single page
            
            if (containerRef.current) {
              await renderDocxPreview(buffer, containerRef.current);
            }
          } else if (isPPTX) {
            const slides = await extractPPTXText(buffer);
            setTotalPages(slides.length);
            setCurrentPage(1);
            
            if (slides.length > 0) {
              onTextExtracted?.(slides[0].text);
            }

            if (containerRef.current) {
              await renderPPTXSlide(buffer, 1, containerRef.current);
            }
          }
        }
      } catch (err) {
        console.error('Error loading document:', err);
        if (mounted) {
          setError('Erreur lors du chargement du document');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      mounted = false;
    };
  }, [documentUrl, contentType]);

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        if (cancelled) return;
        
        await renderPDFPageToCanvas(pdfDocRef.current!, currentPage, canvasRef.current!, scale);
        
        if (cancelled) return;
        
        // Extract text for current page
        const pageText = await extractPDFPageText(pdfDocRef.current!, currentPage);
        onTextExtracted?.(pageText.text);
        onPageChange?.(currentPage);
      } catch (err: any) {
        // Ignore cancellation errors
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [currentPage, scale]);

  // Handle PPTX slide change
  useEffect(() => {
    if (!isPPTX || !arrayBufferRef.current || !containerRef.current) return;

    const renderSlide = async () => {
      try {
        await renderPPTXSlide(arrayBufferRef.current!, currentPage, containerRef.current!);
        
        const slides = await extractPPTXText(arrayBufferRef.current!);
        const slide = slides[currentPage - 1];
        if (slide) {
          onTextExtracted?.(slide.text);
          onPageChange?.(currentPage);
        }
      } catch (err) {
        console.error('Error rendering slide:', err);
      }
    };

    renderSlide();
  }, [currentPage, isPPTX]);

  // Render all pages in continuous mode
  useEffect(() => {
    if (!isPDF || viewMode !== 'continuous' || !pdfDocRef.current || !continuousContainerRef.current) return;

    const renderAllPages = async () => {
      const container = continuousContainerRef.current!;
      container.innerHTML = ''; // Clear existing content

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const canvas = document.createElement('canvas');
        canvas.className = 'shadow-lg bg-white mb-4 mx-auto max-w-full h-auto';
        container.appendChild(canvas);

        try {
          await renderPDFPageToCanvas(pdfDocRef.current!, pageNum, canvas, scale);
        } catch (err) {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    };

    renderAllPages();
  }, [viewMode, isPDF, totalPages, scale]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Capture current page as image
  const captureCurrentPage = async (): Promise<string> => {
    if (isPDF && pdfDocRef.current) {
      return await capturePDFPage(pdfDocRef.current, currentPage, scale);
    } else if (isImage) {
      return documentUrl;
    } else if ((isDocx || isPPTX) && containerRef.current) {
      // Capture the rendered DOM element using dynamic import
      try {
        const { toPng } = await import('html-to-image');
        return await toPng(containerRef.current);
      } catch (error) {
        console.error('Error capturing page:', error);
        throw new Error('Unable to capture page - html-to-image not available');
      }
    }
    throw new Error('Unable to capture page');
  };

  // Expose capture method
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__captureCurrentPage = captureCurrentPage;
    }
  }, [currentPage, scale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight') nextPage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          {isPDF && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('single-page')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'single-page'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Page par page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'continuous'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Défilement continu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Page Navigation - only show in single-page mode */}
          {viewMode === 'single-page' && (
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Page précédente (←)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-sm text-gray-700">
                <span className="font-medium">{currentPage}</span>
                <span className="mx-1">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Page suivante (→)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {viewMode === 'continuous' && isPDF && (
            <div className="text-sm text-gray-600">
              {totalPages} page{totalPages > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        {isPDF && (
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Zoom arrière"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            
            <span className="text-sm text-gray-700 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Zoom avant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        {isPDF && viewMode === 'single-page' && (
          <div className="h-full flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              className="shadow-lg bg-white max-w-full h-auto"
            />
          </div>
        )}

        {isPDF && viewMode === 'continuous' && (
          <div 
            ref={continuousContainerRef}
            className="py-4 px-2"
          />
        )}
        
        {isImage && (
          <div className="h-full flex items-center justify-center p-4">
            <img
              src={documentUrl}
              alt={documentName}
              className="shadow-lg bg-white max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {(isDocx || isPPTX) && (
          <div className="h-full flex items-center justify-center p-8">
            <div
              ref={containerRef}
              className="bg-white shadow-lg rounded-lg w-full max-w-5xl min-h-[600px] p-8"
            />
          </div>
        )}
      </div>
    </div>
  );
}

