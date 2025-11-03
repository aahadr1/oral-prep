'use client';

// Simple PPTX text extraction using XML parsing
export interface PPTXSlide {
  slideNumber: number;
  text: string;
  notes?: string;
}

export async function extractPPTXText(arrayBuffer: ArrayBuffer): Promise<PPTXSlide[]> {
  try {
    // We'll use JSZip to extract PPTX (which is a ZIP file)
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const slides: PPTXSlide[] = [];
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    ).sort();

    for (let i = 0; i < slideFiles.length; i++) {
      const file = zip.files[slideFiles[i]];
      const content = await file.async('string');
      
      // Extract text from XML (simple regex approach)
      const textMatches = content.match(/<a:t>([^<]+)<\/a:t>/g) || [];
      const text = textMatches
        .map(match => match.replace(/<\/?a:t>/g, ''))
        .join(' ')
        .trim();

      slides.push({
        slideNumber: i + 1,
        text,
      });
    }

    return slides;
  } catch (error) {
    console.error('Error extracting PPTX:', error);
    throw new Error('Erreur lors de l\'extraction de la présentation PPTX');
  }
}

// For rendering PPTX, we'll convert to images
export async function renderPPTXSlide(
  arrayBuffer: ArrayBuffer,
  slideNumber: number,
  container: HTMLElement
): Promise<void> {
  // For now, we'll show a text-based representation
  // In production, you might want to use a library like pptxjs or convert to images
  const slides = await extractPPTXText(arrayBuffer);
  const slide = slides[slideNumber - 1];
  
  if (slide) {
    container.innerHTML = `
      <div class="pptx-slide-preview p-8 bg-white border rounded">
        <div class="text-sm text-gray-500 mb-4">Diapositive ${slide.slideNumber}</div>
        <div class="text-lg">${slide.text}</div>
      </div>
    `;
  }
}


