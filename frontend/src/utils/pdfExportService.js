import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    throw new Error("Conteneur introuvable pour l'exportation.");
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
    windowWidth: 1280, // Largeur desktop standard pour le layout
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

/**
 * Exporte une recommandation pédagogique individuelle sous forme de Fiche d'Action officielle LBS (PDF).
 * Téléchargement immédiat du document A4 Portrait haute résolution.
 *
 * @param {Object} rec - Objet recommandation complet
 * @param {string} filterSummary - Résumé des filtres actifs (Année, Niveau, etc.)
 */
export async function exportSingleRecommendationToPdf(rec, filterSummary = '') {
  if (!rec) {
    throw new Error('Aucune recommandation sélectionnée pour l\'exportation.');
  }

  // Création d'un conteneur temporaire dédié au format A4 Portrait (794px à 96 DPI = 210mm)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#0B1220';
  container.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Formatage de la date et de l'heure
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Définition visuelle selon la priorité
  let priorityBg = '#FFF8E6';
  let priorityBorder = '#FEEBC8';
  let priorityColor = '#9A6700';
  let priorityLabel = rec.priority_label || 'Point de vigilance';

  if (rec.is_positive) {
    priorityBg = '#DCFCE7';
    priorityBorder = '#BBF7D0';
    priorityColor = '#166534';
    priorityLabel = rec.priority_label || 'Succès & Progrès';
  } else if (rec.priority === 'elevee') {
    priorityBg = '#FBEBEC';
    priorityBorder = '#F8D7DA';
    priorityColor = '#8B2323';
    priorityLabel = rec.priority_label || 'Priorité critique';
  }

  // Échantillon d'étudiants concernés
  const students = rec.etudiants_sample || rec.students_sample || [];
  let studentsHtml = '';

  if (students.length > 0) {
    const rowsHtml = students.map((st, idx) => {
      let detailCol = '';
      if (rec.rule_number === 6) {
        detailCol = `
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #8B2323;">${st.nb_non_valides || '—'}</td>
          <td style="padding: 7px 10px; color: #374151;">${escapeHtml(st.matieres?.join(', ') || 'N/A')}</td>
        `;
      } else if (rec.rule_number === 7) {
        detailCol = `
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #9A6700;">${st.moyenne ? `${st.moyenne}/20` : '—'}</td>
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #8B2323;">${st.points_manquants ? `-${st.points_manquants} pt(s)` : '—'}</td>
        `;
      } else {
        detailCol = `
          <td style="padding: 7px 10px; color: #374151;">${escapeHtml(st.module || rec.matiere || '—')}</td>
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #1E3A8A;">${st.moyenne !== undefined && st.moyenne !== null ? `${st.moyenne}/20` : '—'}</td>
        `;
      }

      const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      return `
        <tr style="background-color: ${bgRow}; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 7px 10px; font-weight: 600; color: #111827;">${escapeHtml(st.etudiant || 'Étudiant')}</td>
          <td style="padding: 7px 10px; font-family: monospace; font-size: 11px; color: #4B5563;">${escapeHtml(st.matricule || '—')}</td>
          ${detailCol}
        </tr>
      `;
    }).join('');

    let headerCols = '';
    if (rec.rule_number === 6) {
      headerCols = `
        <th style="padding: 8px 10px; text-align: center; width: 140px;">Matières non validées</th>
        <th style="padding: 8px 10px; text-align: left;">Détail des modules</th>
      `;
    } else if (rec.rule_number === 7) {
      headerCols = `
        <th style="padding: 8px 10px; text-align: center; width: 110px;">Moyenne actuelle</th>
        <th style="padding: 8px 10px; text-align: center; width: 120px;">Points manquants</th>
      `;
    } else {
      headerCols = `
        <th style="padding: 8px 10px; text-align: left;">Module</th>
        <th style="padding: 8px 10px; text-align: center; width: 110px;">Note / Statut</th>
      `;
    }

    studentsHtml = `
      <div style="margin-top: 22px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1E3A8A; margin-bottom: 8px;">
          Étudiants identifiés nécessitant un accompagnement (${students.length} sur ${rec.etudiants_count || students.length})
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #F3F4F6; color: #4B5563; font-weight: 700; border-bottom: 2px solid #E5E7EB; text-align: left;">
              <th style="padding: 8px 10px;">Étudiant</th>
              <th style="padding: 8px 10px; width: 100px;">Matricule</th>
              ${headerCols}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // Liste des étapes d'actions concrètes
  const actionsList = rec.actions || [];
  const actionsHtml = actionsList.map((action, idx) => `
    <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; font-size: 12px; color: #1F2937;">
      <div style="width: 13px; height: 13px; border: 1.5px solid #4B5563; border-radius: 3px; margin-top: 2px; flex-shrink: 0;"></div>
      <div style="line-height: 1.45;"><strong>Étape ${idx + 1} :</strong> ${escapeHtml(action)}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <!-- En-tête officiel Lomé Business School -->
    <div style="border-bottom: 2px solid #0F172A; padding-bottom: 14px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; background-color: #0F172A; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 800; font-size: 16px; letter-spacing: 1px;">
            LBS
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 800; font-family: serif; color: #0F172A; line-height: 1.15;">
              Lomé Business School
            </div>
            <div style="font-size: 10.5px; font-weight: 700; color: #8B2323; letter-spacing: 0.04em; margin-top: 2px;">
              DIRECTION DES ÉTUDES & COMMISSION PÉDAGOGIQUE
            </div>
          </div>
        </div>
        <div style="text-align: right; font-size: 10.5px; color: #4B5563; line-height: 1.4;">
          <div>Exporté le <strong>${dateStr}</strong> à ${timeStr}</div>
          <div style="font-size: 10px; color: #1E3A8A; font-weight: 600; margin-top: 2px;">
            ${escapeHtml(filterSummary || (rec.annee_academique ? `Année : ${rec.annee_academique}` : 'Toutes les années'))}
          </div>
        </div>
      </div>
    </div>

    <!-- Titre de la Fiche -->
    <div style="text-align: center; margin-bottom: 18px;">
      <div style="display: inline-block; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; color: #64748B; text-transform: uppercase; background-color: #F1F5F9; padding: 2px 10px; border-radius: 9999px; margin-bottom: 5px;">
        Fiche d'Action Pédagogique Décisionnelle
      </div>
      <h1 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.3;">
        ${escapeHtml(rec.title || 'Recommandation Pédagogique')}
      </h1>
    </div>

    <!-- Bandeau de statut et indicateur -->
    <div style="background-color: ${priorityBg}; border: 1px solid ${priorityBorder}; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; background-color: ${priorityColor}; color: #FFFFFF; font-size: 10.5px; font-weight: 700; padding: 2.5px 9px; border-radius: 9999px;">
          ${escapeHtml(priorityLabel)}
        </span>
        ${rec.indicator_label ? `
          <span style="font-size: 10.5px; font-weight: 600; color: #1E3A8A; background-color: #EFF6FF; padding: 2px 8px; border-radius: 6px; border: 1px solid #DBEAFE;">
            ${escapeHtml(rec.indicator_label)}
          </span>
        ` : ''}
      </div>
      ${rec.threshold ? `
        <div style="font-size: 10.5px; font-family: monospace; color: #4B5563;">
          Seuil déclencheur : <strong>${escapeHtml(rec.threshold)}</strong>
        </div>
      ` : ''}
    </div>

    <!-- Constat & Diagnostic chiffré -->
    <div style="background-color: #F8FAFC; border-left: 4px solid #1E3A8A; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 16px;">
      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1E3A8A; margin-bottom: 3px;">
        Constat & Diagnostic Chiffré
      </div>
      <div style="font-size: 12px; color: #1F2937; line-height: 1.5;">
        ${escapeHtml(rec.description || '')}
      </div>
    </div>

    <!-- Périmètre d'application -->
    <div style="margin-bottom: 16px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 6px;">
        Périmètre d'Application
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11.5px;">
        <div>
          <span style="color: #64748B; display: block; font-size: 9.5px;">Matière / Module</span>
          <strong style="color: #0F172A;">${escapeHtml(rec.matiere || 'Transversal')}</strong>
        </div>
        <div>
          <span style="color: #64748B; display: block; font-size: 9.5px;">Niveau</span>
          <strong style="color: #0F172A;">${escapeHtml(rec.niveau || 'Tous')}</strong>
        </div>
        <div>
          <span style="color: #64748B; display: block; font-size: 9.5px;">Semestre</span>
          <strong style="color: #0F172A;">${escapeHtml(rec.semestre ? `Semestre ${rec.semestre}` : 'Annuel')}</strong>
        </div>
        <div>
          <span style="color: #64748B; display: block; font-size: 9.5px;">Effectif concerné</span>
          <strong style="color: #8B2323;">${rec.etudiants_count || students.length} étudiant(s)</strong>
        </div>
      </div>
    </div>

    <!-- Action Pédagogique Recommandée -->
    <div style="background-color: ${rec.is_positive ? '#F0FDF4' : '#FEF2F2'}; border: 1px solid ${rec.is_positive ? '#BBF7D0' : '#FECACA'}; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
      <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${rec.is_positive ? '#166534' : '#991B1B'}; margin-bottom: 3px;">
        Action Recommandée Principale
      </div>
      <div style="font-size: 12.5px; font-weight: 700; color: ${rec.is_positive ? '#14532D' : '#7F1D1D'}; line-height: 1.45;">
        ${escapeHtml(rec.action_recommandee || '')}
      </div>
    </div>

    <!-- Plan d'Action Décisionnel -->
    <div style="margin-bottom: 18px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0F172A; margin-bottom: 8px;">
        Plan d'Action Décisionnel & Calendrier d'Exécution
      </div>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
        ${actionsHtml || '<div style="font-size: 11.5px; color: #64748B;">Aucune action détaillée spécifique.</div>'}
      </div>
    </div>

    <!-- Tableau des étudiants -->
    ${studentsHtml}

    <!-- Zone de visa & signature -->
    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10.5px; color: #475569;">
      <div>
        <div>Fiche générée par la plateforme d'intelligence académique EduPulse LBS</div>
        <div style="font-size: 9px; color: #94A3B8;">Document officiel pour commission pédagogique et conseil de classe</div>
      </div>
      <div style="text-align: right; min-width: 200px;">
        <div style="font-weight: 600; color: #0F172A; margin-bottom: 22px;">Visa de la Direction Pédagogique :</div>
        <div style="border-bottom: 1px solid #94A3B8; width: 100%;"></div>
      </div>
    </div>

    <!-- Pied de page officiel -->
    <div style="margin-top: 20px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 9.5px; color: #94A3B8;">
      <span>Lomé Business School • Plateforme de Pilotage & Gouvernance Académique</span>
      <span>Usage interne exclusif • Confidentiel</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 800,
      imageTimeout: 15000,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 190 mm
    const printableHeightPerPage = pageHeight - margin * 2; // 277 mm

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const totalPdfHeight = (canvasHeight * contentWidth) / canvasWidth;

    if (totalPdfHeight <= printableHeightPerPage) {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalPdfHeight);
    } else {
      let remainingHeight = canvasHeight;
      let currentSourceY = 0;
      const pageCanvasHeight = (printableHeightPerPage * canvasWidth) / contentWidth;

      let pageIndex = 0;
      while (remainingHeight > 0) {
        if (pageIndex > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const chunkHeight = Math.min(remainingHeight, pageCanvasHeight);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = chunkHeight;
        const ctx = pageCanvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
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

    const cleanName = (rec.title || rec.id || 'recommandation')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 45)
      .replace(/^_|_$/g, '');

    pdf.save(`fiche_recommandation_${cleanName}.pdf`);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Exporte la liste des étudiants d'une recommandation au format CSV (compatible Excel en UTF-8 avec BOM).
 *
 * @param {Object} rec - Objet recommandation avec liste d'étudiants
 */
export function exportRecommendationStudentsCsv(rec) {
  const students = rec?.etudiants_sample || rec?.students_sample || [];
  if (students.length === 0) {
    alert('Aucun étudiant rattaché à cette recommandation.');
    return;
  }

  const rows = [];
  if (rec.rule_number === 6) {
    rows.push(['Étudiant', 'Matricule', 'Niveau', 'Semestre', 'Nombre de matières non validées', 'Matières non validées']);
    students.forEach((st) => {
      rows.push([
        st.etudiant || '',
        st.matricule || '',
        rec.niveau || '',
        rec.semestre || '',
        st.nb_non_valides || '',
        (st.matieres || []).join('; '),
      ]);
    });
  } else if (rec.rule_number === 7) {
    rows.push(['Étudiant', 'Matricule', 'Niveau', 'Semestre', 'Moyenne actuelle', 'Points manquants pour valider']);
    students.forEach((st) => {
      rows.push([
        st.etudiant || '',
        st.matricule || '',
        rec.niveau || '',
        rec.semestre || '',
        st.moyenne || '',
        st.points_manquants || '',
      ]);
    });
  } else {
    rows.push(['Étudiant', 'Matricule', 'Niveau', 'Semestre', 'Module', 'Note / Moyenne']);
    students.forEach((st) => {
      rows.push([
        st.etudiant || '',
        st.matricule || '',
        rec.niveau || '',
        rec.semestre || '',
        st.module || rec.matiere || '',
        st.moyenne || '',
      ]);
    });
  }

  // Formatage CSV avec encodage UTF-8 BOM pour compatibilité native Excel
  const csvContent = '\uFEFF' + rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const cleanName = (rec.title || rec.id || 'etudiants')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 45)
    .replace(/^_|_$/g, '');

  link.setAttribute('download', `etudiants_recommandation_${cleanName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
