import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exporte un élément HTML directement en fichier PDF haute résolution téléchargeable.
 * Garantit l'affichage complet des graphiques Recharts (SVG), des axes et des graduations.
 *
 * @param {HTMLElement|string} targetElement - Élément DOM ou ID de l'élément à exporter
 * @param {string} filename - Nom du fichier PDF téléchargé
 */
export async function exportDashboardToPdf(targetElement, filename = 'rapport_dashboard_lbs.pdf') {
  const element = typeof targetElement === 'string'
    ? document.getElementById(targetElement)
    : targetElement;

  if (!element) {
    throw new Error("Conteneur du tableau de bord introuvable pour l'exportation.");
  }

  // 1. Lire et mémoriser les dimensions réelles de chaque conteneur et SVG Recharts avant capture
  const rechartsContainers = element.querySelectorAll('.recharts-responsive-container, .recharts-wrapper');
  rechartsContainers.forEach((container) => {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      container.setAttribute('data-export-w', Math.round(rect.width).toString());
      container.setAttribute('data-export-h', Math.round(rect.height).toString());
    }
  });

  const svgs = element.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const w = Math.round(rect.width).toString();
      const h = Math.round(rect.height).toString();
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('data-export-w', w);
      svg.setAttribute('data-export-h', h);
    }
  });

  // 2. Capture du DOM avec html2canvas en haute définition (Retina 2x)
  const canvas = await html2canvas(element, {
    scale: 2, // Résolution Retina 2x pour une netteté cristalline
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#FAF8F4',
    windowWidth: 1280, // Largeur desktop standard pour le layout 3 colonnes
    imageTimeout: 15000,
    onclone: (clonedDoc) => {
      // Masquer les boutons et éléments interactifs dans le clone
      const hiddenEls = clonedDoc.querySelectorAll(
        '.print\\:hidden, button, [role="button"], a[href^="/"]'
      );
      hiddenEls.forEach((el) => {
        el.style.display = 'none';
      });

      // Rendre visible l'en-tête et le pied de page institutionnels d'export
      const printBlockEls = clonedDoc.querySelectorAll('.print\\:block');
      printBlockEls.forEach((el) => {
        el.style.display = 'block';
      });
      const printFlexEls = clonedDoc.querySelectorAll('.print\\:flex');
      printFlexEls.forEach((el) => {
        el.style.display = 'flex';
      });

      // Appliquer les dimensions exactes mémorisées sur les conteneurs et SVGs Recharts
      clonedDoc.querySelectorAll('[data-export-w]').forEach((el) => {
        const w = el.getAttribute('data-export-w');
        const h = el.getAttribute('data-export-h');
        if (w && h) {
          el.style.width = `${w}px`;
          el.style.height = `${h}px`;
          el.style.minWidth = `${w}px`;
          el.style.minHeight = `${h}px`;
          if (el.tagName.toLowerCase() === 'svg') {
            el.setAttribute('width', w);
            el.setAttribute('height', h);
            el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            el.style.overflow = 'visible';
          }
        }
      });

      // Fallback namespace XML pour tous les SVG du document cloné
      clonedDoc.querySelectorAll('svg').forEach((svg) => {
        if (!svg.getAttribute('xmlns')) {
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        svg.style.overflow = 'visible';
      });
    },
  });

  // 3. Dimensions A4 Paysage : 297mm x 210mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8; // 8 mm de marge
  const contentWidth = pageWidth - margin * 2; // 281 mm
  const printableHeightPerPage = pageHeight - margin * 2; // 194 mm

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const totalPdfHeight = (canvasHeight * contentWidth) / canvasWidth;

  // Si le contenu tient sur une seule page
  if (totalPdfHeight <= printableHeightPerPage) {
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalPdfHeight);
  } else {
    // Si le contenu s'étend sur plusieurs pages (découpage fluide sans distorsion)
    let remainingHeight = canvasHeight;
    let currentSourceY = 0;
    const pageCanvasHeight = (printableHeightPerPage * canvasWidth) / contentWidth;

    let pageIndex = 0;
    while (remainingHeight > 0) {
      if (pageIndex > 0) {
        pdf.addPage('a4', 'landscape');
      }

      const chunkHeight = Math.min(remainingHeight, pageCanvasHeight);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasWidth;
      pageCanvas.height = chunkHeight;
      const ctx = pageCanvas.getContext('2d');

      ctx.fillStyle = '#FAF8F4';
      ctx.fillRect(0, 0, canvasWidth, chunkHeight);

      ctx.drawImage(
        canvas,
        0, currentSourceY, canvasWidth, chunkHeight,
        0, 0, canvasWidth, chunkHeight
      );

      const chunkPdfHeight = (chunkHeight * contentWidth) / canvasWidth;
      const chunkData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(chunkData, 'JPEG', margin, margin, contentWidth, chunkPdfHeight);

      currentSourceY += chunkHeight;
      remainingHeight -= chunkHeight;
      pageIndex += 1;
    }
  }

  // 4. Téléchargement immédiat du PDF dans le navigateur !
  pdf.save(filename);
}
