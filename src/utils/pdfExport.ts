import { jsPDF } from 'jspdf';
import { Employee, CompetencyScore, COMPETENCY_DEFINITIONS } from '../types';

const KNOWN_ACRONYMS = new Set([
  'IQ', 'TIKI', 'IDP', 'HR', 'HRD', 'OD', 'HC', 'HCM', 'NIP', 'IT', 'PM', 'SDM', 'UI', 'UX',
  'KPI', 'OKR', 'CEO', 'CTO', 'CFO', 'COO', 'SVP', 'VP', 'GM', 'AVP', 'SPV', 'AM', 'B2B', 'B2C',
  'SAAS', 'F&A', 'FNK', 'RDC', 'QA', 'QC', 'GA', 'HSE', 'K3', 'SOP', 'PT', 'CV', 'TBK',
  'DISC', 'PAPI', 'MBTI', 'MSDT', 'KRA', 'FGD', 'BEI', 'CBI', 'PDF', 'AI'
]);

const LOWERCASE_TITLE_WORDS = new Set([
  'dan', 'atau', 'yang', 'untuk', 'pada', 'ke', 'di', 'dari', 'dengan', 'terhadap', 'dalam', 'atas', 'oleh', 'per', 'serta', 'yg', 'dgn'
]);

const ACADEMIC_TITLES = [
  { match: /\bS\.?\s*Kom\.?\b/gi, replacement: 'S.Kom.' },
  { match: /\bS\.?\s*T\.?\b/gi, replacement: 'S.T.' },
  { match: /\bS\.?\s*E\.?\b/gi, replacement: 'S.E.' },
  { match: /\bS\.?\s*H\.?\b/gi, replacement: 'S.H.' },
  { match: /\bS\.?\s*Sos\.?\b/gi, replacement: 'S.Sos.' },
  { match: /\bS\.?\s*Psi\.?\b/gi, replacement: 'S.Psi.' },
  { match: /\bS\.?\s*Ked\.?\b/gi, replacement: 'S.Ked.' },
  { match: /\bS\.?\s*Si\.?\b/gi, replacement: 'S.Si.' },
  { match: /\bS\.?\s*Pd\.?\b/gi, replacement: 'S.Pd.' },
  { match: /\bS\.?\s*Stat\.?\b/gi, replacement: 'S.Stat.' },
  { match: /\bM\.?\s*M\.?\b/gi, replacement: 'M.M.' },
  { match: /\bM\.?\s*T\.?\b/gi, replacement: 'M.T.' },
  { match: /\bM\.?\s*Kom\.?\b/gi, replacement: 'M.Kom.' },
  { match: /\bM\.?\s*B\.?\s*A\.?\b/gi, replacement: 'M.B.A.' },
  { match: /\bM\.?\s*Si\.?\b/gi, replacement: 'M.Si.' },
  { match: /\bM\.?\s*Psi\.?\b/gi, replacement: 'M.Psi.' },
  { match: /\bM\.?\s*H\.?\b/gi, replacement: 'M.H.' },
  { match: /\bM\.?\s*Sc\.?\b/gi, replacement: 'M.Sc.' },
  { match: /\bPh\.?\s*D\.?\b/gi, replacement: 'Ph.D.' },
  { match: /\bPsi\.?\b/gi, replacement: 'Psi.' },
  { match: /\bDr\.?\b/gi, replacement: 'Dr.' },
  { match: /\bDrs\.?\b/gi, replacement: 'Drs.' },
  { match: /\bDra\.?\b/gi, replacement: 'Dra.' },
  { match: /\bIr\.?\b/gi, replacement: 'Ir.' },
];

/**
 * Checks if a string has extensive CapsLock / ALL-CAPS words
 */
function isMostlyAllCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) return false;
  const uppercaseLetters = letters.replace(/[^A-Z]/g, '');
  return uppercaseLetters.length / letters.length > 0.65;
}

/**
 * Clean and sanitize text to ensure 100% compatibility with standard jsPDF Helvetica fonts,
 * removing problematic unicode glyphs that cause character spacing glitches.
 */
export function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[≠]/g, '!=')
    .replace(/[±]/g, '+/-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/…/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Transforms ALL CAPS or messy capitalized titles, employee names, positions,
 * and departments into crisp, professional Title Case, preserving genuine acronyms.
 */
export function normalizeTitleCase(rawText: string | null | undefined): string {
  if (!rawText) return '';
  let clean = sanitizePdfText(rawText);
  if (!clean || clean === '-' || clean === 'N/A') return clean;

  const needsFix = isMostlyAllCaps(clean) || clean === clean.toUpperCase();

  if (needsFix) {
    const words = clean.split(/(\s+|[-/(),&])/);
    clean = words.map((w, idx) => {
      if (!w || !/[a-zA-Z]/.test(w)) return w;
      
      const cleanUpper = w.toUpperCase().replace(/[^A-Z]/g, '');
      if (KNOWN_ACRONYMS.has(cleanUpper)) {
        return w.toUpperCase();
      }

      const lower = w.toLowerCase();
      if (idx > 0 && LOWERCASE_TITLE_WORDS.has(lower)) {
        return lower;
      }

      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join('');
  }

  // Apply academic titles regexes
  ACADEMIC_TITLES.forEach(({ match, replacement }) => {
    clean = clean.replace(match, replacement);
  });

  return clean;
}

/**
 * Transforms ALL CAPS or messy capitalized sentences, paragraphs, strengths,
 * weaknesses, readings, and notes into clean Sentence Case.
 */
export function normalizeSentenceCase(rawText: string | null | undefined): string {
  if (!rawText) return '';
  let clean = sanitizePdfText(rawText);
  if (!clean || clean === '-' || clean === 'N/A') return clean;

  const needsFix = isMostlyAllCaps(clean) || clean === clean.toUpperCase();

  if (needsFix) {
    const segments = clean.split(/([.\n;!?]+\s*)/);
    clean = segments.map((seg) => {
      if (!seg || !/[a-zA-Z]/.test(seg)) return seg;

      const words = seg.split(/(\s+|[-/(),&])/);
      let isFirstWord = true;

      return words.map((w) => {
        if (!w || !/[a-zA-Z]/.test(w)) return w;

        const cleanUpper = w.toUpperCase().replace(/[^A-Z]/g, '');
        if (KNOWN_ACRONYMS.has(cleanUpper)) {
          return w.toUpperCase();
        }

        if (isFirstWord) {
          isFirstWord = false;
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }

        return w.toLowerCase();
      }).join('');
    }).join('');
  }

  // Apply academic titles regexes
  ACADEMIC_TITLES.forEach(({ match, replacement }) => {
    clean = clean.replace(match, replacement);
  });

  return clean;
}

export const getIqCategoryLabel = (iqOrEmp?: number | { iqScore?: number; thinkingCapacity?: string }): string => {
  if (typeof iqOrEmp === 'object' && iqOrEmp !== null) {
    const rawCap = iqOrEmp.thinkingCapacity || '';
    if (/<80|< 80/i.test(rawCap) || (typeof iqOrEmp.iqScore === 'number' && iqOrEmp.iqScore < 80)) {
      return 'Di Bawah Rata-rata (<80)';
    }
    if (/>130|> 130/i.test(rawCap) || (typeof iqOrEmp.iqScore === 'number' && iqOrEmp.iqScore >= 130)) {
      return 'Very Superior (>130)';
    }
    const iq = iqOrEmp.iqScore;
    if (!iq) return 'Rata-rata / Average';
    if (iq >= 130) return 'Very Superior / Sangat Istimewa';
    if (iq >= 120) return 'Superior / Cerdas';
    if (iq >= 110) return 'High Average / Di Atas Rata-rata';
    if (iq >= 90) return 'Average / Rata-rata';
    if (iq >= 80) return 'Low Average / Di Bawah Rata-rata';
    return 'Di Bawah Rata-rata (<80)';
  }

  if (typeof iqOrEmp !== 'number') return 'Sesuai Berkas Asesmen';
  const iq = iqOrEmp;
  if (iq >= 130) return 'Very Superior / Sangat Istimewa';
  if (iq >= 120) return 'Superior / Cerdas';
  if (iq >= 110) return 'High Average / Di Atas Rata-rata';
  if (iq >= 90) return 'Average / Rata-rata';
  if (iq >= 80) return 'Low Average / Di Bawah Rata-rata';
  return 'Di Bawah Rata-rata (<80)';
};

/**
 * Returns formatted IQ score string for UI badges, tables, and metric cards.
 * If employee has IQ < 80 (or thinkingCapacity indicates IQ<80), returns '< 80' or 'IQ < 80'.
 * If employee has IQ > 130 (or thinkingCapacity indicates IQ>130), returns '> 130' or 'IQ > 130'.
 * Otherwise returns exact number like '124' or 'IQ 124'.
 */
export const formatIqScoreDisplay = (
  empOrIq: { iqScore?: number; thinkingCapacity?: string } | number | string | undefined | null,
  options?: { prefix?: boolean }
): string => {
  const pfx = options?.prefix ? 'IQ ' : '';
  if (empOrIq == null) return `${pfx}-`;

  if (typeof empOrIq === 'object') {
    const rawCap = empOrIq.thinkingCapacity || '';
    if (/<80|< 80/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore < 80)) {
      return options?.prefix ? 'IQ < 80' : '< 80';
    }
    if (/>130|> 130/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore > 130)) {
      return options?.prefix ? 'IQ > 130' : '> 130';
    }
    if (typeof empOrIq.iqScore === 'number' && !isNaN(empOrIq.iqScore)) {
      return `${pfx}${empOrIq.iqScore}`;
    }
    const match = rawCap.match(/iq\s*[=:]?\s*(\d{2,3})/i) || rawCap.match(/\b(\d{2,3})\b/);
    if (match && match[1]) {
      const num = Number(match[1]);
      if (num < 80) return options?.prefix ? 'IQ < 80' : '< 80';
      if (num > 130) return options?.prefix ? 'IQ > 130' : '> 130';
      return `${pfx}${num}`;
    }
    return `${pfx}100`;
  }

  if (typeof empOrIq === 'number') {
    if (empOrIq < 80) return options?.prefix ? 'IQ < 80' : '< 80';
    if (empOrIq > 130) return options?.prefix ? 'IQ > 130' : '> 130';
    return `${pfx}${empOrIq}`;
  }

  if (typeof empOrIq === 'string') {
    if (/<80|< 80/i.test(empOrIq)) return options?.prefix ? 'IQ < 80' : '< 80';
    if (/>130|> 130/i.test(empOrIq)) return options?.prefix ? 'IQ > 130' : '> 130';
    return `${pfx}${empOrIq}`;
  }

  return `${pfx}-`;
};

/**
 * Returns clean, standardized Indonesian assessment format for Thinking Capacity and IQ Score.
 * Examples: 'Superior (IQ=124)', 'Di atas rata-rata (IQ=110)', 'Rata-rata (IQ=108)', 'Di bawah rata-rata (IQ<80)', 'Superior (IQ>130)'
 */
export const formatThinkingCapacity = (emp: { thinkingCapacity?: string; iqScore?: number } | null | undefined): string => {
  if (!emp) return 'Rata-rata (IQ=100)';
  const raw = emp.thinkingCapacity?.trim();
  const iq = typeof emp.iqScore === 'number' && !isNaN(emp.iqScore) && emp.iqScore >= 50 && emp.iqScore <= 170
    ? emp.iqScore
    : undefined;

  // Check explicit < 80 or > 130 cases FIRST
  if (raw && (/<80|< 80/i.test(raw))) {
    return 'Di bawah rata-rata (IQ<80)';
  }
  if (raw && (/>130|> 130/i.test(raw))) {
    return 'Superior (IQ>130)';
  }
  if (typeof iq === 'number' && iq < 80) {
    return 'Di bawah rata-rata (IQ<80)';
  }
  if (typeof iq === 'number' && iq > 130) {
    return 'Superior (IQ>130)';
  }

  // 1. If thinkingCapacity already has standard Indonesian format with IQ like "Superior (IQ=124)" or "Di atas rata-rata (IQ=110)"
  if (raw && /^(Superior|Di atas rata-rata|Rata-rata|Di bawah rata-rata|Sangat Unggul)\s*\([^\)]+\)$/i.test(raw)) {
    return raw;
  }

  // 2. If valid numeric IQ score is available, format standard Indonesian label
  if (typeof iq === 'number') {
    if (iq >= 130) return `Superior (IQ>130)`;
    if (iq >= 120) return `Superior (IQ=${iq})`;
    if (iq >= 110) return `Di atas rata-rata (IQ=${iq})`;
    if (iq >= 90) return `Rata-rata (IQ=${iq})`;
    if (iq < 80) return `Di bawah rata-rata (IQ<80)`;
    return `Di bawah rata-rata (IQ=${iq})`;
  }

  // 3. If raw string contains category or text
  if (raw) {
    // Try to extract IQ number from raw string if present (e.g. "IQ 115", "IQ=120", "118")
    const match = raw.match(/iq\s*[=:]?\s*(\d{2,3})/i) || raw.match(/\b(\d{2,3})\b/);
    const parsedIq = match && match[1] ? Number(match[1]) : undefined;
    if (parsedIq && parsedIq >= 50 && parsedIq <= 170) {
      if (parsedIq >= 130) return `Superior (IQ>130)`;
      if (parsedIq >= 120) return `Superior (IQ=${parsedIq})`;
      if (parsedIq >= 110) return `Di atas rata-rata (IQ=${parsedIq})`;
      if (parsedIq >= 90) return `Rata-rata (IQ=${parsedIq})`;
      if (parsedIq < 80) return `Di bawah rata-rata (IQ<80)`;
      return `Di bawah rata-rata (IQ=${parsedIq})`;
    }

    const low = raw.toLowerCase();
    if (low.includes('very superior') || low.includes('sangat istimewa') || low.includes('sangat unggul') || low.includes('>130') || low.includes('> 130')) {
      return 'Superior (IQ>130)';
    }
    if (low.includes('superior') || low.includes('unggul') || low.includes('cerdas')) {
      return 'Superior (IQ=124)';
    }
    if (low.includes('high average') || low.includes('di atas') || low.includes('diatas')) {
      return 'Di atas rata-rata (IQ=112)';
    }
    if (low.includes('<80') || low.includes('< 80') || low.includes('borderline') || low.includes('kurang')) {
      return 'Di bawah rata-rata (IQ<80)';
    }
    if (low.includes('low average') || low.includes('di bawah') || low.includes('dibawah')) {
      return 'Di bawah rata-rata (IQ=84)';
    }
    if (low.includes('average') || low.includes('rata-rata') || low.includes('normal') || low.includes('sedang')) {
      return 'Rata-rata (IQ=102)';
    }
    return raw;
  }

  return 'Rata-rata (IQ=100)';
};

export const exportEmployeeAssessmentPdf = (employee: Employee): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const empCleanName = normalizeTitleCase(employee.name);

  const drawHeaderFooter = (isFirstPage: boolean) => {
    // Top subtle brand line
    doc.setFillColor(13, 148, 136); // Teal 600
    doc.rect(margin, 8, contentWidth, 1.5, 'F');

    // Page numbering at bottom
    const totalPages = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Laporan Asesmen & Pemetaan Kompetensi - ${empCleanName}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Hal ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
      drawHeaderFooter(false);
    }
  };

  // ================= PAGE 1: HEADER & PROFILE =================
  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('Laporan Hasil Asesmen & Pemetaan Kompetensi', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    `TalentPulse Assessment System  |  Tanggal Asesmen: ${employee.assessmentDate || '-'}  |  Dokumen Resmi`,
    margin + 6,
    y + 17
  );

  y += 28;

  // Profile Card Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  // Avatar block
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.roundedRect(margin + 4, y + 4, 24, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const initials = empCleanName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  doc.text(initials || 'EMP', margin + 16, y + 18, { align: 'center' });

  // Employee details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(empCleanName, margin + 32, y + 11);

  // Talent Box Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241); // Indigo
  doc.text(`Matriks 9-Box: ${normalizeTitleCase(employee.talentBox || 'Pemain Utama')}`, margin + 32, y + 18);

  // Dept
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (employee.department) {
    doc.text(`Departemen: ${normalizeTitleCase(employee.department)}`, margin + 32, y + 24);
  }
  if (employee.targetDepartment && employee.targetDepartment !== employee.department) {
    doc.setTextColor(13, 148, 136);
    doc.text(`Target Karir: ${normalizeTitleCase(employee.targetDepartment)}`, margin + 115, y + 24);
  }

  y += 36;

  // ================= SCORE METRIC CARDS (4 Columns) =================
  const colWidth = (contentWidth - 6) / 4;

  // Card 1: Nilai IQ
  const iqDisplayStr = formatIqScoreDisplay(employee);
  const iqCatText = getIqCategoryLabel(employee).split('/')[0].trim();

  doc.setFillColor(30, 27, 75); // Indigo 950
  doc.roundedRect(margin, y, colWidth, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text('Nilai IQ Psikotes', margin + 3, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(iqDisplayStr, margin + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(224, 231, 255);
  doc.text(iqCatText, margin + 3, y + 19);

  // Card 2: Skor Asesmen Keseluruhan
  doc.setFillColor(6, 78, 59); // Teal 900
  doc.roundedRect(margin + colWidth + 2, y, colWidth, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(167, 243, 208);
  doc.text('Skor Asesmen', margin + colWidth + 5, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`${employee.overallScore || 0}`, margin + colWidth + 5, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(209, 250, 229);
  doc.text('Skala 0 - 100 Poin', margin + colWidth + 5, y + 19);

  // Card 3: Skor Kinerja
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + (colWidth + 2) * 2, y, colWidth, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Skor Kinerja', margin + (colWidth + 2) * 2 + 3, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${employee.performanceScore || 0} / 5.0`, margin + (colWidth + 2) * 2 + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Evaluasi Target Kerja', margin + (colWidth + 2) * 2 + 3, y + 19);

  // Card 4: Skor Potensi
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + (colWidth + 2) * 3, y, colWidth, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Skor Potensi', margin + (colWidth + 2) * 3 + 3, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${employee.potentialScore || 0} / 5.0`, margin + (colWidth + 2) * 3 + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Kapasitas Pertumbuhan', margin + (colWidth + 2) * 3 + 3, y + 19);

  y += 26;

  // ================= 8 CORE COMPETENCY PILLARS =================
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Evaluasi 8 Pilar Kompetensi Utama (Skala 1.0 - 5.0)', margin, y + 4);
  y += 7;

  const halfWidth = (contentWidth - 4) / 2;
  const comps = COMPETENCY_DEFINITIONS;

  comps.forEach((comp, idx) => {
    const isLeft = idx % 2 === 0;
    const itemX = isLeft ? margin : margin + halfWidth + 4;
    const itemY = y + Math.floor(idx / 2) * 11.5;

    const score = Number(employee.competencies?.[comp.key]) || 3.5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(itemX, itemY, halfWidth, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    const shortLabel = comp.label.length > 28 ? comp.label.substring(0, 28) + '...' : comp.label;
    doc.text(normalizeTitleCase(shortLabel), itemX + 3, itemY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136);
    doc.text(`${score.toFixed(1)}`, itemX + halfWidth - 12, itemY + 6.5);

    // Mini progress bar
    const barWidth = 24;
    const barX = itemX + halfWidth - barWidth - 16;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, itemY + 4, barWidth, 3.2, 1, 1, 'F');
    const fillW = Math.min(barWidth, (score / 5) * barWidth);
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(barX, itemY + 4, fillW, 3.2, 1, 1, 'F');
  });

  y += Math.ceil(comps.length / 2) * 11.5 + 4;

  // ================= CUSTOM COMPETENCIES EXTRACTED FROM PDF =================
  if (employee.customCompetencies && employee.customCompetencies.length > 0) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. Rincian ${employee.customCompetencies.length} Kompetensi Spesifik Berkas Asesmen PDF`, margin, y + 4);
    y += 7;

    const customCols = 2;
    const custColWidth = (contentWidth - 4) / customCols;

    employee.customCompetencies.forEach((cc, cIdx) => {
      const isLeft = cIdx % 2 === 0;
      const cX = isLeft ? margin : margin + custColWidth + 4;
      const rowIdx = Math.floor(cIdx / 2);
      const cY = y + rowIdx * 10.5;

      checkPageBreak(12);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cX, cY, custColWidth, 9, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      const cleanTitle = normalizeTitleCase(cc.name);
      const cleanName = cleanTitle.length > 30 ? cleanTitle.substring(0, 30) + '...' : cleanTitle;
      doc.text(cleanName, cX + 3, cY + 5.8);

      const sc = Number(cc.score) || 3.0;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`${sc.toFixed(1)}`, cX + custColWidth - 10, cY + 5.8);
    });

    y += Math.ceil(employee.customCompetencies.length / 2) * 10.5 + 4;
  }

  // ================= STRENGTHS & WEAKNESSES =================
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Analisis Kekuatan & Area Pengembangan (Psikometri)', margin, y + 4);
  y += 7;

  const colBoxWidth = (contentWidth - 4) / 2;

  // Kekuatan Box
  const strengthLines: string[] = [];
  (employee.strengths || []).forEach(s => {
    const cleanS = normalizeSentenceCase(s);
    const wrapped = doc.splitTextToSize(`- ${cleanS}`, colBoxWidth - 8);
    strengthLines.push(...wrapped);
  });

  // Kelemahan Box
  const weaknessLines: string[] = [];
  (employee.weaknesses || []).forEach(w => {
    const cleanW = normalizeSentenceCase(w);
    const wrapped = doc.splitTextToSize(`- ${cleanW}`, colBoxWidth - 8);
    weaknessLines.push(...wrapped);
  });

  const maxLines = Math.max(strengthLines.length, weaknessLines.length, 3);
  const swBoxHeight = Math.max(32, maxLines * 4.8 + 12);

  // Draw Strengths Box
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(margin, y, colBoxWidth, swBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // Green 800
  doc.text('Kekuatan Utama (Strengths)', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  let sy = y + 12;
  strengthLines.slice(0, 7).forEach(line => {
    doc.text(line, margin + 4, sy);
    sy += 4.5;
  });

  // Draw Weaknesses Box
  doc.setFillColor(254, 242, 242); // Rose 50
  doc.setDrawColor(254, 202, 202); // Rose 200
  doc.roundedRect(margin + colBoxWidth + 4, y, colBoxWidth, swBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(159, 18, 57); // Rose 800
  doc.text('Area Pengembangan (Areas to Improve)', margin + colBoxWidth + 8, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  let wy = y + 12;
  weaknessLines.slice(0, 7).forEach(line => {
    doc.text(line, margin + colBoxWidth + 8, wy);
    wy += 4.5;
  });

  y += swBoxHeight + 6;

  // ================= EXECUTIVE SUMMARY / KEY INSIGHTS =================
  if (employee.keyInsights) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Ringkasan Evaluasi & Catatan Asesor', margin, y + 4);
    y += 7;

    const cleanInsights = normalizeSentenceCase(employee.keyInsights);
    const insightLines = doc.splitTextToSize(cleanInsights, contentWidth - 8);
    const boxH = Math.max(22, insightLines.length * 4.5 + 9);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(insightLines, margin + 4, y + 6.5);

    y += boxH + 6;
  }

  // ================= INDIVIDUAL DEVELOPMENT PLAN (IDP) =================
  if (employee.idp && employee.idp.goals && employee.idp.goals.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. Rencana Pengembangan Individu (Individual Development Plan - IDP)', margin, y + 4);
    y += 7;

    employee.idp.goals.forEach((g, gIdx) => {
      checkPageBreak(28);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      // Title & Priority
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${gIdx + 1}. ${normalizeTitleCase(g.title)}`, margin + 4, y + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136);
      doc.text(`[${normalizeTitleCase(g.category)}]`, margin + contentWidth - 36, y + 6.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Target Kompetensi: ${normalizeTitleCase(g.competencyTarget || '-')}  |  Target Waktu: ${g.targetDate || '-'}  |  Prioritas: ${normalizeTitleCase(g.priority || 'Sedang')}`, margin + 4, y + 12);

      // Action items summary
      if (g.actionItems && g.actionItems.length > 0) {
        const actionStr = g.actionItems.map(a => `- ${normalizeSentenceCase(a.task)}`).slice(0, 2).join('   ');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const wrappedAction = doc.splitTextToSize(actionStr, contentWidth - 8);
        doc.text(wrappedAction, margin + 4, y + 18);
      }

      y += 27;
    });
  }

  // ================= SIGNATURE & LEGAL FOOTER =================
  checkPageBreak(28);
  y += 2;
  const sigColW = (contentWidth - 10) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  // Sig 1
  doc.text('Karyawan yang Dinilai,', margin + 4, y + 4.5);
  doc.line(margin + 4, y + 18, margin + sigColW - 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(empCleanName, margin + 4, y + 22);

  // Sig 2
  doc.setFont('helvetica', 'normal');
  doc.text('Atasan Langsung / Manajer,', margin + sigColW + 8, y + 4.5);
  doc.line(margin + sigColW + 8, y + 18, margin + sigColW * 2, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('( .................................... )', margin + sigColW + 8, y + 22);

  // Sig 3
  doc.setFont('helvetica', 'normal');
  doc.text('Human Capital / Lead Assessor,', margin + sigColW * 2 + 12, y + 4.5);
  doc.line(margin + sigColW * 2 + 12, y + 18, margin + contentWidth - 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Talent Management Team', margin + sigColW * 2 + 12, y + 22);

  // Finalize all headers and footers across all created pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeaderFooter(i === 1);
  }

  // Save the PDF
  const safeName = (empCleanName || 'Karyawan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_Asesmen_${safeName}_${employee.nip || 'NIP'}.pdf`;
  doc.save(fileName);
};

/**
 * Helper function to cleanly wrap text into lines with exact font size, weight, and safety margin
 */
function parseTextToLines(
  rawText: string,
  maxWidth: number,
  doc: jsPDF,
  fontSize: number,
  fontStyle: 'normal' | 'bold' = 'normal',
  casing: 'sentence' | 'title' | 'none' = 'sentence'
): string[] {
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);

  const clean = casing === 'title'
    ? normalizeTitleCase(rawText)
    : casing === 'sentence'
    ? normalizeSentenceCase(rawText)
    : sanitizePdfText(rawText);

  if (!clean || clean === '' || clean === '-') {
    return ['-'];
  }

  // Check if text has multiple bullet items separated by semicolon or newline
  const rawItems = clean
    .split(/\r?\n|;(?=\s*[A-Z0-9\-])|;\s*(?=[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean);

  if (rawItems.length <= 1) {
    return doc.splitTextToSize(clean, maxWidth);
  }

  const allLines: string[] = [];
  rawItems.forEach((item) => {
    const cleanItem = item.replace(/^[•\-\*\s]+/, '').trim();
    if (!cleanItem) return;
    const formattedItem = casing === 'sentence' ? normalizeSentenceCase(cleanItem) : cleanItem;
    const bulletText = `- ${formattedItem}`;
    const wrapped = doc.splitTextToSize(bulletText, maxWidth);
    allLines.push(...wrapped);
  });

  return allLines.length > 0 ? allLines : ['-'];
}

interface ColumnHeaderDef {
  text: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Universal table header drawer that guarantees zero text collision,
 * automatic line wrapping per column width, and vertical divider grid lines.
 */
function renderCustomTableHeader(
  doc: jsPDF,
  startX: number,
  startY: number,
  columns: ColumnHeaderDef[],
  fontSize: number = 10.5
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);

  // Wrap all header titles based on column width with safe padding (width - 4)
  const wrappedHeaders = columns.map(col => {
    const safeW = col.width - 4;
    return doc.splitTextToSize(col.text, safeW) as string[];
  });

  const maxLines = Math.max(...wrappedHeaders.map(lines => lines.length), 1);
  const lineSpacing = 4.6;
  const headerHeight = Math.max(9.5, maxLines * lineSpacing + 4.5);
  const totalWidth = columns.reduce((acc, c) => acc + c.width, 0);

  // Draw background box
  doc.setFillColor(233, 242, 248); // #e9f2f8 soft blue
  doc.setDrawColor(180, 205, 225); // border
  doc.rect(startX, startY, totalWidth, headerHeight, 'FD');

  // Text color
  doc.setTextColor(26, 75, 119); // dark blue #1a4b77

  let curX = startX;
  columns.forEach((col, idx) => {
    const lines = wrappedHeaders[idx];
    const textBlockHeight = (lines.length - 1) * lineSpacing;
    // Calculate centered starting Y for this column's lines
    const startTextY = startY + (headerHeight - textBlockHeight) / 2 + 1.4;

    let textY = startTextY;
    lines.forEach(line => {
      if (col.align === 'center') {
        doc.text(line, curX + col.width / 2, textY, { align: 'center' });
      } else if (col.align === 'right') {
        doc.text(line, curX + col.width - 2.5, textY, { align: 'right' });
      } else {
        doc.text(line, curX + 2.5, textY);
      }
      textY += lineSpacing;
    });

    // Draw vertical divider between columns
    if (idx > 0) {
      doc.setDrawColor(180, 205, 225);
      doc.line(curX, startY, curX, startY + headerHeight);
    }

    curX += col.width;
  });

  return headerHeight;
}

export interface CompetencyMatrixItem {
  name: string;
  aliasMatchers: string[];
  defaultScoreField?: keyof CompetencyScore | 'performanceScore' | 'potentialScore' | 'overallScore';
  baseDefaultScore: number;
}

export interface CompetencyMatrixCategory {
  number: number;
  categoryName: string;
  items: CompetencyMatrixItem[];
}

export const COMPETENCY_SCORE_MATRIX: CompetencyMatrixCategory[] = [
  {
    number: 1,
    categoryName: 'Kemampuan Berpikir',
    items: [
      {
        name: 'Kemampuan Analisa',
        aliasMatchers: ['kemampuan analisa', 'analisa', 'analytical', 'analisis data', 'analisis', 'analisa masalah'],
        defaultScoreField: 'problemSolving',
        baseDefaultScore: 2
      }
    ]
  },
  {
    number: 2,
    categoryName: 'Karakteristik Pribadi',
    items: [
      {
        name: 'Mampu Mengatasi Tekanan Kerja',
        aliasMatchers: ['mampu mengatasi tekanan kerja', 'mengatasi tekanan', 'tekanan kerja', 'stres', 'stress', 'resilience', 'ketahanan kerja'],
        defaultScoreField: 'adaptability',
        baseDefaultScore: 3
      }
    ]
  },
  {
    number: 3,
    categoryName: 'Pengelolaan Tugas',
    items: [
      {
        name: 'Kemauan Untuk Belajar',
        aliasMatchers: ['kemauan untuk belajar', 'kemauan belajar', 'learning agility', 'continuous learning', 'belajar'],
        defaultScoreField: 'innovation',
        baseDefaultScore: 2
      },
      {
        name: 'Bekerja Mandiri',
        aliasMatchers: ['bekerja mandiri', 'mandiri', 'inisiatif mandiri', 'kemandirian eksekusi', 'autonomous'],
        defaultScoreField: 'technicalExcellence',
        baseDefaultScore: 2
      },
      {
        name: 'Orientasi Kualitas',
        aliasMatchers: ['orientasi kualitas', 'orientas kualitas', 'kualitas', 'quality', 'ketelitian', 'detail', 'quality control', 'standar kualitas'],
        defaultScoreField: 'technicalExcellence',
        baseDefaultScore: 3
      },
      {
        name: 'Disiplin',
        aliasMatchers: ['disiplin', 'ketertiban', 'compliance', 'kepatuhan', 'disiplin kerja'],
        defaultScoreField: 'performanceScore',
        baseDefaultScore: 3
      }
    ]
  },
  {
    number: 4,
    categoryName: 'Pengelolaan SDM',
    items: [
      {
        name: 'Helicopter View',
        aliasMatchers: ['helicopter view', 'helicopter', 'visi menyeluruh', 'pandangan menyeluruh', 'strategic view'],
        defaultScoreField: 'strategicThinking',
        baseDefaultScore: 3
      },
      {
        name: 'Pendelegasian Tugas',
        aliasMatchers: ['pendelegasian tugas', 'delegasi', 'delegation', 'distribusi tugas', 'pembagian tugas', 'workload distribution'],
        defaultScoreField: 'leadership',
        baseDefaultScore: 3
      },
      {
        name: 'Berkoordinasi Antar Tim',
        aliasMatchers: ['berkoordinasi antar tim', 'koordinasi antar tim', 'koordinasi', 'kolaborasi', 'lintas divisi', 'cross-functional', 'bonding tim'],
        defaultScoreField: 'collaboration',
        baseDefaultScore: 3
      },
      {
        name: 'Membimbing dan Mengembangkan Bawahan',
        aliasMatchers: ['membimbing dan mengembangkan bawahan', 'membimbing & mengembangkan bawahan', 'coaching', 'mentoring', 'pengembangan bawahan', 'bimbingan bawahan', 'people development', 'pembinaan bawahan'],
        defaultScoreField: 'leadership',
        baseDefaultScore: 3
      }
    ]
  },
  {
    number: 5,
    categoryName: 'Kepemimpinan',
    items: [
      {
        name: 'Menerima dan Melakukan Perubahan',
        aliasMatchers: ['menerima dan melakukan perubahan', 'menerima & melakukan perubahan', 'perubahan', 'change', 'adaptasi perubahan', 'change leadership', 'inisiatif perubahan'],
        defaultScoreField: 'adaptability',
        baseDefaultScore: 4
      },
      {
        name: 'Berorientasi Pada Strategi',
        aliasMatchers: ['berorientasi pada strategi', 'berorientasi strategi', 'strategi', 'strategic thinking', 'strategic', 'strategi jangka panjang'],
        defaultScoreField: 'strategicThinking',
        baseDefaultScore: 4
      },
      {
        name: 'Penyelesaian Masalah',
        aliasMatchers: ['penyelesaian masalah', 'problem solving', 'solusi masalah', 'penyelesaian masalah terstruktur', 'root cause analysis'],
        defaultScoreField: 'problemSolving',
        baseDefaultScore: 4
      },
      {
        name: 'Pengambilan Keputusan',
        aliasMatchers: ['pengambilan keputusan', 'decision making', 'keputusan', 'pengambilan keputusan strategis', 'decisive', 'penentuan keputusan', 'ketegasan keputusan'],
        defaultScoreField: 'leadership',
        baseDefaultScore: 4
      }
    ]
  }
];

export const resolveEmployeeCompetencyScore = (
  emp: Employee,
  itemDef: CompetencyMatrixItem
): number => {
  // 1. Direct match in competencyMatrixScores (highest priority - exact authentic PDF extraction or user manual calibration)
  if (emp.competencyMatrixScores && typeof emp.competencyMatrixScores === 'object') {
    // Check exact name match
    const exactVal = emp.competencyMatrixScores[itemDef.name];
    if (typeof exactVal === 'number' && !isNaN(exactVal) && exactVal >= 1 && exactVal <= 5) {
      return Math.round(exactVal);
    }

    // Check case-insensitive and alias matches in competencyMatrixScores
    for (const [key, val] of Object.entries(emp.competencyMatrixScores)) {
      if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 5) {
        const keyLow = key.toLowerCase().trim();
        const itemLow = itemDef.name.toLowerCase().trim();
        if (
          keyLow === itemLow ||
          itemDef.aliasMatchers.some(m => keyLow === m.toLowerCase().trim() || keyLow.includes(m.toLowerCase().trim()) || m.toLowerCase().trim().includes(keyLow))
        ) {
          return Math.round(val);
        }
      }
    }
  }

  // 2. Direct match in customCompetencies array (from PDF extracted items)
  if (emp.customCompetencies && Array.isArray(emp.customCompetencies) && emp.customCompetencies.length > 0) {
    for (const c of emp.customCompetencies) {
      const cLow = (c.name || '').toLowerCase().trim();
      if (itemDef.aliasMatchers.some(m => cLow === m.toLowerCase().trim() || cLow.includes(m.toLowerCase().trim()) || m.toLowerCase().trim().includes(cLow))) {
        if (typeof c.score === 'number' && !isNaN(c.score)) {
          const s = Number(c.score);
          if (s >= 4.5) return 5;
          if (s >= 3.5) return 4;
          if (s >= 2.5) return 3;
          if (s >= 1.5) return 2;
          return 1;
        }
      }
    }
  }

  // 3. Fallback to standard 8-competencies object if specific matrix score wasn't provided
  if (itemDef.defaultScoreField && emp.competencies) {
    const raw = (emp.competencies as any)[itemDef.defaultScoreField];
    if (typeof raw === 'number' && !isNaN(raw)) {
      if (raw >= 4.5) return 5;
      if (raw >= 3.5) return 4;
      if (raw >= 2.5) return 3;
      if (raw >= 1.5) return 2;
      return 1;
    }
  }

  return itemDef.baseDefaultScore || 3;
};

export interface CollectivePriorityItem {
  key?: string;
  name?: string;
  displayName?: string;
  count?: number;
  total?: number;
  frequencyText?: string;
  percentage?: number;
  impact: string;
  program?: string;
  recommendedProgram?: string;
  affectedEmployees?: Array<{ id: string; name: string; position?: string; department?: string }>;
}

export interface ExecutiveSummaryPdfOptions {
  customRemarks?: {
    recommended?: string;
    considered?: string;
    notRecommended?: string;
  };
  patternNote?: string;
  collectiveDevelopmentList?: CollectivePriorityItem[];
}

export const exportExecutiveSummaryPdf = (
  employees: Employee[],
  options?: ExecutiveSummaryPdfOptions
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273 mm
  let y = margin;

  // Categorize employees
  const recList = employees.filter(e => {
    const r = (e.recommendationCategory || '').toLowerCase();
    return r.includes('dapat disarankan') || (!e.recommendationCategory && e.overallScore >= 75);
  });
  const conList = employees.filter(e => {
    const r = (e.recommendationCategory || '').toLowerCase();
    return r.includes('dipertimbangkan') || (!e.recommendationCategory && e.overallScore >= 65 && e.overallScore < 75);
  });
  const notList = employees.filter(e => {
    const r = (e.recommendationCategory || '').toLowerCase();
    return r.includes('tidak disarankan') || (!e.recommendationCategory && e.overallScore < 65);
  });

  const drawHeaderFooter = (isFirstPage: boolean) => {
    // Subtle top line on pages
    doc.setFillColor(226, 232, 240); // Slate 200
    doc.rect(margin, 5, contentWidth, 0.5, 'F');

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Executive Summary Rekapitulasi Assessment & Pemetaan Kompetensi | Dokumen Resmi HR (Confidential)`,
      margin,
      pageHeight - 5.5
    );
    doc.text(
      `Hal ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - margin,
      pageHeight - 5.5,
      { align: 'right' }
    );
  };

  const checkPageBreak = (neededHeight: number, onNewPage?: () => void) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin + 2;
      if (onNewPage) {
        onNewPage();
      }
    }
  };

  // If 0 employees, output clean empty message and finish
  if (employees.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('Belum ada data peserta assessment yang diunggah ke dalam sistem.', margin + contentWidth / 2, y + 16, { align: 'center' });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawHeaderFooter(i === 1);
    }
    doc.save('Executive_Summary_Assessment_Kosong.pdf');
    return;
  }

  // =========================================================================
  // 1. EXECUTIVE SUMMARY
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(27, 77, 121);
  doc.text('1. Executive Summary', margin, y + 4);
  y += 7.0;

  // Scope paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const s1ScopeLines = doc.splitTextToSize(
    `Scope: Ringkasan eksekutif ini merangkum hasil asesmen terhadap ${employees.length} orang karyawan. Laporan menyajikan gambaran utuh mencakup rekomendasi kelayakan, tingkat pemenuhan kompetensi, kapasitas berpikir (IQ Skala TIKI), kekuatan utama, area yang perlu dikembangkan, serta tindak lanjut pengembangan (IDP).`,
    contentWidth
  );
  doc.text(s1ScopeLines, margin, y + 2);
  y += s1ScopeLines.length * 4.4 + 4.0;

  // Table 1: Summary Table
  const t1Cols: ColumnHeaderDef[] = [
    { text: 'Kategori Assessment', width: 50, align: 'left' },
    { text: 'Jumlah', width: 26, align: 'center' },
    { text: 'Nama Karyawan', width: 75, align: 'left' },
    { text: 'Keterangan HR', width: 122, align: 'left' },
  ];
  const t1Widths = [50, 26, 75, 122]; // Total = 273 mm

  const drawTable1Header = () => {
    const headerH = renderCustomTableHeader(doc, margin, y, t1Cols, 10);
    y += headerH;
  };

  drawTable1Header();

  // Rows data
  const t1Rows = [
    {
      category: 'Dapat Disarankan',
      count: recList.length,
      colorBg: [223, 240, 216] as [number, number, number],
      colorText: [43, 84, 44] as [number, number, number],
      names: recList.map(e => normalizeTitleCase(e.name)).join(', ') || '-',
      desc: normalizeSentenceCase(options?.customRemarks?.recommended) || 
        'Kandidat menunjukkan penguasaan kompetensi yang solid (skor >= 75%) didukung daya pikir yang prima. Dinilai siap untuk promosi atau mengemban tanggung jawab lebih tinggi dengan pendampingan program akselerasi IDP.'
    },
    {
      category: 'Dipertimbangkan',
      count: conList.length,
      colorBg: [252, 248, 227] as [number, number, number],
      colorText: [138, 109, 59] as [number, number, number],
      names: conList.map(e => normalizeTitleCase(e.name)).join(', ') || '-',
      desc: normalizeSentenceCase(options?.customRemarks?.considered) || 
        'Kandidat memiliki potensi berkembang yang baik (65% - 74%), namun masih memerlukan bimbingan terarah (coaching & mentoring) khususnya pada aspek kepemimpinan dan manajerial tim sebelum siap dipromosikan.'
    },
    {
      category: 'Tidak Disarankan',
      count: notList.length,
      colorBg: [242, 222, 222] as [number, number, number],
      colorText: [169, 68, 66] as [number, number, number],
      names: notList.map(e => normalizeTitleCase(e.name)).join(', ') || '-',
      desc: normalizeSentenceCase(options?.customRemarks?.notRecommended) || 
        'Kandidat saat ini masih memiliki kesenjangan kompetensi yang cukup besar (< 65%). Disarankan tetap fokus pada peran saat ini dengan penguatan kompetensi mendasar serta evaluasi berkala.'
    }
  ];

  t1Rows.forEach((row) => {
    // Calculate heights for names and desc with 10pt font
    const namesLines = parseTextToLines(row.names, t1Widths[2] - 8, doc, 10, 'normal', 'title');
    const descLines = parseTextToLines(row.desc, t1Widths[3] - 8, doc, 10, 'normal', 'sentence');
    const maxLines = Math.max(namesLines.length, descLines.length, 2);
    const rowH = Math.max(15, maxLines * 4.4 + 5.5);

    checkPageBreak(rowH, drawTable1Header);

    // Border & cell
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, rowH, 'FD');

    // Category badge/text
    doc.setFillColor(...row.colorBg);
    doc.roundedRect(margin + 2.5, y + 3.2, t1Widths[0] - 5, 8.0, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...row.colorText);
    doc.text(row.category, margin + 4.5, y + 8.6);

    // Count
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${row.count} orang`, margin + t1Widths[0] + t1Widths[1] / 2, y + 8.6, { align: 'center' });

    // Names
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    let ny = y + 5.5;
    namesLines.forEach((line: string) => {
      doc.text(line, margin + t1Widths[0] + t1Widths[1] + 3, ny);
      ny += 4.4;
    });

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    let dy = y + 5.5;
    descLines.forEach((line: string) => {
      doc.text(line, margin + t1Widths[0] + t1Widths[1] + t1Widths[2] + 3, dy);
      dy += 4.4;
    });

    // Column dividers
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + t1Widths[0], y, margin + t1Widths[0], y + rowH);
    doc.line(margin + t1Widths[0] + t1Widths[1], y, margin + t1Widths[0] + t1Widths[1], y + rowH);
    doc.line(margin + t1Widths[0] + t1Widths[1] + t1Widths[2], y, margin + t1Widths[0] + t1Widths[1] + t1Widths[2], y + rowH);

    y += rowH;
  });

  y += 5;

  // Catatan pola utama
  if (options?.patternNote || employees.length > 0) {
    const rawPatternText = options?.patternNote || 
      `Secara umum, para kandidat memiliki dedikasi dan komitmen kerja operasional yang kuat. Namun, area yang paling membutuhkan bimbingan bersama adalah kemampuan membimbing tim (coaching), kesiapan memimpin perubahan (change leadership), dan keberanian mengambil keputusan strategis. Oleh karena itu, fokus pengembangan ke depan perlu diarahkan pada penguatan kapasitas kepemimpinan manajerial, bukan hanya eksekusi teknis di lapangan.`;

    const patternText = normalizeSentenceCase(rawPatternText);
    const patternLines = parseTextToLines(patternText, contentWidth - 55, doc, 10, 'normal', 'sentence');
    const boxH = Math.max(16, patternLines.length * 4.4 + 7.5);

    checkPageBreak(boxH + 2);

    doc.setFillColor(254, 252, 232); // Amber/yellow 50
    doc.setDrawColor(254, 240, 138); // Yellow 200
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(133, 77, 14); // Amber 800
    doc.text('Catatan pola utama:', margin + 4, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    let py = y + 6.5;
    patternLines.forEach((l: string) => {
      doc.text(l, margin + 48, py);
      py += 4.4;
    });

    y += boxH + 8;
  }

  // =========================================================================
  // 2. SKOR KOMPETENSI
  // =========================================================================
  checkPageBreak(65);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(27, 77, 121);
  doc.text('2. Skor Kompetensi', margin, y + 4);
  y += 7.0;

  // Scope paragraph for Section 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const sScoreScopeLines = doc.splitTextToSize(
    `Scope: Matriks ini memetakan nilai kompetensi riil setiap peserta (${employees.length} orang) ke dalam 5 aspek utama: Kemampuan Berpikir, Karakteristik Pribadi, Pengelolaan Tugas, Pengelolaan SDM, dan Kepemimpinan.`,
    contentWidth
  );
  doc.text(sScoreScopeLines, margin, y + 2);
  y += sScoreScopeLines.length * 4.4 + 4.0;

  // Skor Kompetensi Table Layout Calculations
  const scoreNoWidth = 8;
  const scoreCompWidth = 74;
  const fixedNonEmpWidth = scoreNoWidth + scoreCompWidth; // 82 mm
  const availableEmpWidth = contentWidth - fixedNonEmpWidth; // 191 mm
  const empColCount = Math.max(employees.length, 1);
  const empScoreWidth = employees.length > 0 ? (availableEmpWidth / empColCount) : availableEmpWidth;

  const drawScoreMatrixHeader = () => {
    const headerTopH = 6.5;
    const headerBotH = 7.5;
    const totalHeaderH = headerTopH + headerBotH; // 14 mm

    // Fill backgrounds
    doc.setFillColor(233, 242, 248); // #e9f2f8 soft blue
    doc.setDrawColor(180, 205, 225);

    // Left block (No & Kompetensi) spanning 14 mm
    doc.rect(margin, y, scoreNoWidth, totalHeaderH, 'FD');
    doc.rect(margin + scoreNoWidth, y, scoreCompWidth, totalHeaderH, 'FD');

    // Right block top superheader "Nilai"
    doc.rect(margin + fixedNonEmpWidth, y, availableEmpWidth, headerTopH, 'FD');

    // Superheader Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(26, 75, 119);

    // Centered 'No'
    doc.text('No', margin + scoreNoWidth / 2, y + totalHeaderH / 2 + 1.4, { align: 'center' });
    // Left 'Kompetensi'
    doc.text('Kompetensi', margin + scoreNoWidth + 3, y + totalHeaderH / 2 + 1.4);
    // Centered 'Nilai'
    doc.text('Nilai', margin + fixedNonEmpWidth + availableEmpWidth / 2, y + headerTopH / 2 + 1.4, { align: 'center' });

    // Right block bottom employee subheaders
    if (employees.length === 0) {
      doc.rect(margin + fixedNonEmpWidth, y + headerTopH, availableEmpWidth, headerBotH, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.0);
      doc.setTextColor(100, 116, 139);
      doc.text('(Belum ada data peserta)', margin + fixedNonEmpWidth + availableEmpWidth / 2, y + headerTopH + 5.0, { align: 'center' });
    } else {
      employees.forEach((emp, eIdx) => {
        const empX = margin + fixedNonEmpWidth + eIdx * empScoreWidth;
        doc.setFillColor(233, 242, 248);
        doc.setDrawColor(180, 205, 225);
        doc.rect(empX, y + headerTopH, empScoreWidth, headerBotH, 'FD');

        doc.setFont('helvetica', 'bold');
        const cleanEmpName = normalizeTitleCase(emp.name);
        const nameFontSize = empScoreWidth < 18 ? 7.0 : 8.0;
        doc.setFontSize(nameFontSize);
        doc.setTextColor(26, 75, 119);

        // Smart wrap employee name if long
        const nameLines = doc.splitTextToSize(cleanEmpName, empScoreWidth - 2.5) as string[];
        if (nameLines.length === 1) {
          doc.text(nameLines[0], empX + empScoreWidth / 2, y + headerTopH + 5.0, { align: 'center' });
        } else {
          doc.text(nameLines[0], empX + empScoreWidth / 2, y + headerTopH + 3.6, { align: 'center' });
          if (nameLines[1]) {
            doc.text(nameLines[1], empX + empScoreWidth / 2, y + headerTopH + 6.8, { align: 'center' });
          }
        }
      });
    }

    y += totalHeaderH;
  };

  drawScoreMatrixHeader();

  // Render Category Groups & Sub-items for Skor Kompetensi
  COMPETENCY_SCORE_MATRIX.forEach((group) => {
    // 1. Group Category Row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    const catNameLines = doc.splitTextToSize(normalizeTitleCase(group.categoryName), scoreCompWidth - 6) as string[];
    const catRowH = Math.max(6.6, catNameLines.length * 3.8 + 2.6);

    checkPageBreak(catRowH + 2, drawScoreMatrixHeader);

    doc.setFillColor(219, 234, 254); // Blue 100 / soft blue highlight
    doc.setDrawColor(180, 205, 225);
    doc.rect(margin, y, contentWidth, catRowH, 'FD');

    // Category Number in Col 0
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(27, 77, 121);
    doc.text(`${group.number}`, margin + scoreNoWidth / 2, y + catRowH / 2 + 1.2, { align: 'center' });

    // Category Name in Col 1
    let catLineY = y + (catRowH - catNameLines.length * 3.8) / 2 + 2.8;
    catNameLines.forEach((l) => {
      doc.text(l, margin + scoreNoWidth + 3, catLineY);
      catLineY += 3.8;
    });

    // Dividers for category row
    doc.setDrawColor(180, 205, 225);
    doc.line(margin + scoreNoWidth, y, margin + scoreNoWidth, y + catRowH);
    doc.line(margin + fixedNonEmpWidth, y, margin + fixedNonEmpWidth, y + catRowH);
    
    if (employees.length > 0) {
      employees.forEach((_, eIdx) => {
        const empX = margin + fixedNonEmpWidth + (eIdx + 1) * empScoreWidth;
        if (eIdx < employees.length - 1) {
          doc.line(empX, y, empX, y + catRowH);
        }
      });
    }

    y += catRowH;

    // 2. Sub-Item Rows
    group.items.forEach((item) => {
      // Calculate item name text wrapping to prevent any overlap with score column
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const maxItemTextW = scoreCompWidth - 8;
      const cleanItemName = normalizeTitleCase(item.name);
      const itemLines = doc.splitTextToSize(cleanItemName, maxItemTextW) as string[];
      const itemRowH = Math.max(6.2, itemLines.length * 3.6 + 2.6);

      checkPageBreak(itemRowH + 2, drawScoreMatrixHeader);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, itemRowH, 'FD');

      // Competency name (indented, wrapped cleanly within column bounds)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      let itemLineY = y + (itemRowH - itemLines.length * 3.6) / 2 + 2.8;
      itemLines.forEach((l) => {
        doc.text(l, margin + scoreNoWidth + 4, itemLineY);
        itemLineY += 3.6;
      });

      // Score per employee (centered vertically in row)
      if (employees.length > 0) {
        employees.forEach((emp, eIdx) => {
          const score = resolveEmployeeCompetencyScore(emp, item);
          const empX = margin + fixedNonEmpWidth + eIdx * empScoreWidth;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.0);
          doc.setTextColor(15, 23, 42);
          doc.text(String(score), empX + empScoreWidth / 2, y + itemRowH / 2 + 1.2, { align: 'center' });
        });
      }

      // Vertical Dividers
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + scoreNoWidth, y, margin + scoreNoWidth, y + itemRowH);
      doc.line(margin + fixedNonEmpWidth, y, margin + fixedNonEmpWidth, y + itemRowH);
      if (employees.length > 0) {
        employees.forEach((_, eIdx) => {
          const empX = margin + fixedNonEmpWidth + (eIdx + 1) * empScoreWidth;
          if (eIdx < employees.length - 1) {
            doc.line(empX, y, empX, y + itemRowH);
          }
        });
      }

      y += itemRowH;
    });
  });

  // Bottom Legend for Section 2
  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('* Skala penilaian kompetensi: 1 (Sangat Kurang), 2 (Kurang / Di Bawah Standar), 3 (Memenuhi Standar), 4 (Baik / Di Atas Standar), 5 (Sangat Baik / Istimewa).', margin + 2, y + 4);
  y += 9;

  // =========================================================================
  // 3. TABEL RINGKASAN HASIL ASSESSMENT
  // =========================================================================
  checkPageBreak(68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(27, 77, 121);
  doc.text('3. Tabel Ringkasan Hasil Assessment', margin, y + 4);
  y += 7.0;

  // Scope paragraph for Section 3
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const s2ScopeLines = doc.splitTextToSize(
    `Scope: Rekapitulasi profil menyeluruh dari ${employees.length} orang peserta asesmen, memuat posisi target evaluasi, rekomendasi kelayakan, capaian pemenuhan kompetensi, kapasitas berpikir, kompetensi yang perlu ditingkatkan, serta ulasan ringkas profil kandidat.`,
    contentWidth
  );
  doc.text(s2ScopeLines, margin, y + 2);
  y += s2ScopeLines.length * 4.4 + 4.0;

  // 7 Column Widths (Total = 273 mm)
  const t2Cols: ColumnHeaderDef[] = [
    { text: 'Nama Karyawan', width: 36, align: 'left' },
    { text: 'Posisi yang Dinilai', width: 34, align: 'left' },
    { text: 'Rekomendasi', width: 28, align: 'center' },
    { text: '% Pemenuhan', width: 24, align: 'center' },
    { text: 'Kapasitas IQ', width: 26, align: 'left' },
    { text: 'Kompetensi Perlu Dikembangkan', width: 52, align: 'left' },
    { text: 'Reading Singkat', width: 73, align: 'left' },
  ];
  const t2Widths = [36, 34, 28, 24, 26, 52, 73];

  const drawTable2Header = () => {
    const headerH = renderCustomTableHeader(doc, margin, y, t2Cols, 9.5);
    y += headerH;
  };

  drawTable2Header();

  // Table 2 Rows with smart pagination and multi-page chunking
  employees.forEach((emp) => {
    // Formatted Recommendation
    const rawRec = emp.recommendationCategory || (
      emp.overallScore >= 75 ? 'Dapat Disarankan' :
      emp.overallScore >= 65 ? 'Dipertimbangkan' : 'Tidak Disarankan'
    );
    const rec = normalizeTitleCase(rawRec);
    const recStyle = 
      rec.toLowerCase().includes('dapat disarankan') ? { bg: [220, 252, 231] as [number, number, number], txt: [21, 128, 61] as [number, number, number] } :
      rec.toLowerCase().includes('dipertimbangkan') ? { bg: [254, 243, 199] as [number, number, number], txt: [180, 83, 9] as [number, number, number] } :
      { bg: [254, 226, 226] as [number, number, number], txt: [185, 28, 28] as [number, number, number] };

    // Formatted Position
    const pos = normalizeTitleCase(emp.evaluatedPosition || emp.position || '-');

    // Formatted %
    const fulfillment = emp.overallScore.toFixed(1).replace('.', ',') + '%';

    // Thinking Capacity
    const formattedCap = formatThinkingCapacity(emp);
    const thinkingCap = formattedCap.replace(/\s*\(/, '\n(');

    // Comp to develop (Clean bullet points)
    let compDevText = '';
    if (emp.competenciesToDevelop && emp.competenciesToDevelop.length > 0) {
      compDevText = emp.competenciesToDevelop.join('\n');
    } else if (emp.developmentAreas && emp.developmentAreas.trim()) {
      compDevText = emp.developmentAreas;
    } else if (emp.weaknesses && emp.weaknesses.length > 0) {
      compDevText = emp.weaknesses.join('\n');
    } else {
      compDevText = 'Penguatan sudut pandang strategis jangka panjang; Pembiasaan coaching dialogis ke anggota tim; Peningkatan inisiatif inovasi kerja.';
    }

    // Reading text
    const readingText = emp.briefReading || emp.keyInsights || 
      'Memiliki potensi kerja yang baik dan siap berkembang optimal melalui pendampingan dan bimbingan terarah.';

    // Prepare line data for column 0 (Only Employee Name)
    const empCleanName = normalizeTitleCase(emp.name);
    const nameLines = parseTextToLines(empCleanName, t2Widths[0] - 6, doc, 10, 'bold', 'title');

    const col0Items: Array<{ text: string; font: 'bold' | 'normal'; size: number; color: [number, number, number] }> = [];
    nameLines.forEach(l => col0Items.push({ text: l, font: 'bold', size: 10, color: [15, 23, 42] }));

    let col1Lines = parseTextToLines(pos, t2Widths[1] - 6, doc, 9.5, 'normal', 'title');
    let col4Lines = parseTextToLines(thinkingCap, t2Widths[4] - 6, doc, 9.5, 'normal', 'sentence');
    let col5Lines = parseTextToLines(compDevText, t2Widths[5] - 6, doc, 9.5, 'normal', 'sentence');
    let col6Lines = parseTextToLines(readingText, t2Widths[6] - 6, doc, 9.5, 'normal', 'sentence');

    const maxBottomY = pageHeight - 18; // 192 mm (Safe gap above footer)
    const lineStep = 4.4;
    let isContinuation = false;

    while (
      col0Items.length > 0 ||
      col1Lines.length > 0 ||
      col4Lines.length > 0 ||
      col5Lines.length > 0 ||
      col6Lines.length > 0
    ) {
      let availableSpace = maxBottomY - y;

      // If less than 24mm space on current page, move to next page
      if (availableSpace < 24) {
        doc.addPage();
        y = margin + 4;
        drawTable2Header();
        availableSpace = maxBottomY - y;
      }

      // Max lines that safely fit in the remaining page space
      const maxLinesForChunk = Math.max(3, Math.floor((availableSpace - 7) / lineStep));

      // Slice lines for this chunk
      const chunk0 = col0Items.splice(0, maxLinesForChunk);
      const chunk1 = col1Lines.splice(0, maxLinesForChunk);
      const chunk4 = col4Lines.splice(0, maxLinesForChunk);
      const chunk5 = col5Lines.splice(0, maxLinesForChunk);
      const chunk6 = col6Lines.splice(0, maxLinesForChunk);

      const chunkLineCount = Math.max(
        isContinuation ? 0 : chunk0.length,
        chunk1.length,
        chunk4.length,
        chunk5.length,
        chunk6.length,
        1
      );
      const chunkH = Math.max(12, chunkLineCount * lineStep + 5.5);

      // Draw Row Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(180, 205, 225);
      doc.rect(margin, y, contentWidth, chunkH, 'FD');

      let rx = margin;

      // 1. Nama Karyawan (Col 0) - Only render on the first page/chunk of this employee
      let cy0 = y + 5.0;
      if (!isContinuation) {
        chunk0.forEach(item => {
          doc.setFont('helvetica', item.font);
          doc.setFontSize(item.size);
          doc.setTextColor(...item.color);
          doc.text(item.text, rx + 2.5, cy0);
          cy0 += item.size === 10 ? lineStep : 3.8;
        });
      }
      rx += t2Widths[0];

      // 2. Posisi yang Dinilai (Col 1)
      let cy1 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      chunk1.forEach(l => {
        doc.text(l, rx + 2.5, cy1);
        cy1 += lineStep;
      });
      rx += t2Widths[1];

      // 3. Rekomendasi Badge (Col 2)
      if (!isContinuation) {
        const badgeW = t2Widths[2] - 4;
        const badgeH = 8.0;
        const badgeY = y + 4.0;
        doc.setFillColor(...recStyle.bg);
        doc.roundedRect(rx + 2, badgeY, badgeW, badgeH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...recStyle.txt);
        doc.text(rec, rx + t2Widths[2] / 2, badgeY + 5.4, { align: 'center' });
      }
      rx += t2Widths[2];

      // 4. % Pemenuhan (Col 3)
      if (!isContinuation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(fulfillment, rx + t2Widths[3] / 2, y + 9.5, { align: 'center' });
      }
      rx += t2Widths[3];

      // 5. Kapasitas IQ (Col 4)
      let cy4 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      chunk4.forEach(l => {
        doc.text(l, rx + 2.5, cy4);
        cy4 += lineStep;
      });
      rx += t2Widths[4];

      // 6. Kompetensi Perlu Dikembangkan (Col 5)
      let cy5 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      chunk5.forEach(l => {
        doc.text(l, rx + 2.5, cy5);
        cy5 += lineStep;
      });
      rx += t2Widths[5];

      // 7. Reading Singkat (Col 6)
      let cy6 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      chunk6.forEach(l => {
        doc.text(l, rx + 2.5, cy6);
        cy6 += lineStep;
      });

      // Vertical column divider grid lines
      let divX = margin;
      for (let c = 0; c < t2Widths.length - 1; c++) {
        divX += t2Widths[c];
        doc.setDrawColor(180, 205, 225);
        doc.line(divX, y, divX, y + chunkH);
      }

      y += chunkH;

      // If more content remains for this employee, create a new page & redraw header
      if (
        col0Items.length > 0 ||
        col1Lines.length > 0 ||
        col4Lines.length > 0 ||
        col5Lines.length > 0 ||
        col6Lines.length > 0
      ) {
        doc.addPage();
        y = margin + 4;
        drawTable2Header();
        isContinuation = true;
      }
    }
  });

  // Bottom Legend for Section 2
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Keterangan Rekomendasi:  [ Dapat Disarankan (>= 75%) ]   [ Dipertimbangkan (65% - 74%) ]   [ Tidak Disarankan (< 65%) ]', margin + 2, y + 4);
  y += 9;

  // =========================================================================
  // 4. TABEL KEKUATAN, AREA PENGEMBANGAN DAN KETERANGAN LAIN
  // =========================================================================
  checkPageBreak(68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(27, 77, 121);
  doc.text('4. Tabel Kekuatan, Area Pengembangan dan Keterangan Lain', margin, y + 4);
  y += 7.0;

  // Scope paragraph for Section 4
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const s3ScopeLines = doc.splitTextToSize(
    `Scope: Matriks perbandingan kualitatif mendalam bagi ${employees.length} orang peserta asesmen, memaparkan kekuatan utama, area yang perlu diasah, serta rekomendasi langkah konkret untuk tindak lanjut pengembangan (IDP).`,
    contentWidth
  );
  doc.text(s3ScopeLines, margin, y + 2);
  y += s3ScopeLines.length * 4.4 + 4.0;

  // 4 Column Widths (Total = 273 mm)
  const t3Cols: ColumnHeaderDef[] = [
    { text: 'Nama Karyawan', width: 50, align: 'left' },
    { text: 'Kekuatan Utama (Strengths)', width: 74, align: 'left' },
    { text: 'Area Pengembangan (Development Areas)', width: 74, align: 'left' },
    { text: 'Keterangan Lain / Fokus Follow-up', width: 75, align: 'left' },
  ];
  const t3Widths = [50, 74, 74, 75];

  const drawTable3Header = () => {
    const headerH = renderCustomTableHeader(doc, margin, y, t3Cols, 10);
    y += headerH;
  };

  drawTable3Header();

  // Rows Table 3 with multi-page chunk pagination to prevent footer collision
  employees.forEach((emp) => {
    const strengthsText = emp.mainStrengths || 
      (emp.strengths && emp.strengths.length > 0 ? emp.strengths.join('; ') : 'Memiliki komitmen kerja yang konsisten, tanggung jawab tinggi, dan eksekusi tugas yang handal.');

    const devText = emp.developmentAreas || 
      (emp.competenciesToDevelop && emp.competenciesToDevelop.length > 0 
        ? emp.competenciesToDevelop.join('; ') 
        : (emp.weaknesses && emp.weaknesses.length > 0 ? emp.weaknesses.join('; ') : 'Penguatan kemampuan kepemimpinan tim, manajemen delegasi, dan pemecahan masalah secara analitis.'));

    let followUpText = emp.followUpNotes;
    if (!followUpText) {
      const rec = emp.recommendationCategory || (emp.overallScore >= 75 ? 'Dapat Disarankan' : emp.overallScore >= 65 ? 'Dipertimbangkan' : 'Tidak Disarankan');
      if (rec.toLowerCase().includes('dapat disarankan')) {
        followUpText = 'Siap dipromosikan atau mengemban tanggung jawab lebih besar didukung program akselerasi IDP dan perluasan wawasan lintas fungsi.';
      } else if (rec.toLowerCase().includes('dipertimbangkan')) {
        followUpText = 'Dapat dipertimbangkan untuk promosi dengan pendampingan intensif (mentoring/coaching) serta evaluasi berkala per 3-6 bulan.';
      } else {
        followUpText = 'Fokus terlebih dahulu pada penguatan kinerja dan kompetensi di posisi saat ini melalui pelatihan terstruktur sebelum dievaluasi kembali.';
      }
    }

    // Wrap text for each column with 10pt font (Only Employee Name)
    const empCleanName = normalizeTitleCase(emp.name);
    const nameLines = parseTextToLines(empCleanName, t3Widths[0] - 6, doc, 10, 'bold', 'title');

    // Col 0 structured line items
    const col0Items: Array<{ text: string; font: 'bold' | 'normal'; size: number; color: [number, number, number] }> = [];
    nameLines.forEach(l => col0Items.push({ text: l, font: 'bold', size: 10, color: [15, 23, 42] }));

    let col1Lines = parseTextToLines(strengthsText, t3Widths[1] - 6, doc, 10, 'normal', 'sentence');
    let col2Lines = parseTextToLines(devText, t3Widths[2] - 6, doc, 10, 'normal', 'sentence');
    let col3Lines = parseTextToLines(followUpText, t3Widths[3] - 6, doc, 10, 'normal', 'sentence');

    const maxBottomY = pageHeight - 18; // 192 mm (Safe gap above footer at 204 mm)
    const lineStep = 4.4;
    let isContinuation = false;

    while (col1Lines.length > 0 || col2Lines.length > 0 || col3Lines.length > 0 || col0Items.length > 0) {
      let availableSpace = maxBottomY - y;

      // If less than 24mm space on current page, move to next page
      if (availableSpace < 24) {
        doc.addPage();
        y = margin + 4;
        drawTable3Header();
        availableSpace = maxBottomY - y;
      }

      // Max lines that safely fit in the remaining page space
      const maxLinesForChunk = Math.max(3, Math.floor((availableSpace - 7) / lineStep));

      // Slice lines for this chunk
      const chunk0 = col0Items.splice(0, maxLinesForChunk);
      const chunk1 = col1Lines.splice(0, maxLinesForChunk);
      const chunk2 = col2Lines.splice(0, maxLinesForChunk);
      const chunk3 = col3Lines.splice(0, maxLinesForChunk);

      const chunkLineCount = Math.max(
        isContinuation ? 0 : chunk0.length,
        chunk1.length,
        chunk2.length,
        chunk3.length,
        1
      );
      const chunkH = Math.max(12, chunkLineCount * lineStep + 5.5);

      // Draw Row Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, chunkH, 'FD');

      // 1. Render Col 0 (Name) - Only render on first page/chunk of this employee
      let cy0 = y + 5.0;
      if (!isContinuation) {
        chunk0.forEach(item => {
          doc.setFont('helvetica', item.font);
          doc.setFontSize(item.size);
          doc.setTextColor(...item.color);
          doc.text(item.text, margin + 3, cy0);
          cy0 += lineStep;
        });
      }

      // 2. Render Col 1 (Strengths)
      let cy1 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      chunk1.forEach(l => {
        doc.text(l, margin + t3Widths[0] + 3, cy1);
        cy1 += lineStep;
      });

      // 3. Render Col 2 (Development Areas)
      let cy2 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      chunk2.forEach(l => {
        doc.text(l, margin + t3Widths[0] + t3Widths[1] + 3, cy2);
        cy2 += lineStep;
      });

      // 4. Render Col 3 (Follow Up)
      let cy3 = y + 5.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      chunk3.forEach(l => {
        doc.text(l, margin + t3Widths[0] + t3Widths[1] + t3Widths[2] + 3, cy3);
        cy3 += lineStep;
      });

      // Vertical column dividers
      let divX = margin;
      for (let c = 0; c < t3Widths.length - 1; c++) {
        divX += t3Widths[c];
        doc.setDrawColor(226, 232, 240);
        doc.line(divX, y, divX, y + chunkH);
      }

      y += chunkH;

      // If more content remains for this employee, create a new page & redraw header
      if (col1Lines.length > 0 || col2Lines.length > 0 || col3Lines.length > 0 || col0Items.length > 0) {
        doc.addPage();
        y = margin + 4;
        drawTable3Header();
        isContinuation = true;
      }
    }
  });

  y += 6;

  // =========================================================================
  // 5. PRIORITAS DEVELOPMENT KOLEKTIF
  // =========================================================================
  const allMatrixItems = COMPETENCY_SCORE_MATRIX.flatMap(g => g.items);
  const fallbackCatalog = [
    {
      displayName: 'Membimbing & Mengembangkan Bawahan',
      matrixItemName: 'Membimbing dan Mengembangkan Bawahan',
      matchers: ['membimbing', 'mengembangkan bawahan', 'coaching', 'mentoring', 'people development', 'pembinaan bawahan', 'bimbingan'],
      impact: 'Kualitas kepemimpinan tim berisiko kurang merata; bimbingan ke bawahan masih cenderung reaktif atau sekadar memberi instruksi satu arah.',
      program: 'Pelatihan teknik coaching & mentoring dialogis, praktik penyusunan IDP tim, dan pembiasaan sesi feedback berkala.'
    },
    {
      displayName: 'Menerima & Melakukan Perubahan',
      matrixItemName: 'Menerima dan Melakukan Perubahan',
      matchers: ['menerima & melakukan perubahan', 'menerima dan melakukan perubahan', 'perubahan', 'change', 'adaptasi perubahan', 'change leadership', 'inisiatif perubahan', 'inovasi/change'],
      impact: 'Penerapan sistem atau kebijakan baru berpotensi berjalan lambat apabila leader belum aktif menjadi penggerak perubahan.',
      program: 'Lokakarya kepemimpinan perubahan (Change Leadership), strategi komunikasi efektif ke tim, dan evaluasi pasca-implementasi.'
    },
    {
      displayName: 'Delegasi / Workload Distribution',
      matrixItemName: 'Pendelegasian Tugas',
      matchers: ['pendelegasian tugas', 'delegasi', 'workload distribution', 'delegation', 'pembagian tugas', 'distribusi kerja'],
      impact: 'Leader cenderung mengerjakan sendiri atau membagi tugas berdasarkan kebiasaan, bukan atas dasar kapasitas dan rencana pengembangan anggota tim.',
      program: 'Pemetaan matriks delegasi (RACI), monitoring pembagian beban kerja, dan evaluasi capaian tim mingguan.'
    },
    {
      displayName: 'Berorientasi Strategi',
      matrixItemName: 'Berorientasi Pada Strategi',
      matchers: ['berorientasi pada strategi', 'berorientasi strategi', 'strategi', 'strategic thinking', 'strategic', 'helicopter view', 'jangka panjang'],
      impact: 'Perhatian leader masih tersita pada rutinitas harian sehingga perencanaan jangka panjang dan antisipasi pasar belum optimal.',
      program: 'Penyelarasan strategi bisnis & penjualan, penguasaan analisis prospek pasar, serta pelatihan perencanaan bisnis komprehensif.'
    },
    {
      displayName: 'Koordinasi Antar Tim',
      matrixItemName: 'Berkoordinasi Antar Tim',
      matchers: ['berkoordinasi antar tim', 'koordinasi', 'kolaborasi', 'cross-functional', 'lintas divisi', 'lintas fungsi', 'bonding tim', 'interpersonal'],
      impact: 'Kolaborasi lintas divisi dan kedekatan emosional tim belum terjalin secara konsisten.',
      program: 'Pemetaan pemangku kepentingan (stakeholder mapping), proyek lintas divisi, dan forum penyelarasan target rutin.'
    },
    {
      displayName: 'Pengambilan Keputusan',
      matrixItemName: 'Pengambilan Keputusan',
      matchers: ['pengambilan keputusan', 'decision making', 'keputusan', 'ketegasan keputusan', 'decisive leadership', 'decision-making'],
      impact: 'Penyelesaian masalah tim atau penentuan prioritas target berisiko tertunda atau kurang tegas saat menghadapi situasi krusial.',
      program: 'Pelatihan kerangka pengambilan keputusan berbasis risiko, diskusi studi kasus kepemimpinan riil, dan pembekalan manajemen konflik.'
    },
    {
      displayName: 'Kemauan Untuk Belajar',
      matrixItemName: 'Kemauan Untuk Belajar',
      matchers: ['kemauan untuk belajar', 'kemauan belajar', 'learning agility', 'continuous learning', 'self-development', 'proaktif belajar'],
      impact: 'Kemampuan adaptasi terhadap sistem kerja atau wawasan baru melambat bila inisiatif eksplorasi mandiri rendah.',
      program: 'Rencana pembelajaran individu terstruktur, sesi berbagi pengetahuan (knowledge sharing), dan penugasan eksplorasi mandiri.'
    },
    {
      displayName: 'Mampu Mengatasi Tekanan Kerja',
      matrixItemName: 'Mampu Mengatasi Tekanan Kerja',
      matchers: ['mampu mengatasi tekanan kerja', 'mengatasi tekanan', 'resilience', 'tekanan', 'stres', 'stress', 'workload management'],
      impact: 'Stabilitas performa, ketenangan, dan ketelitian rentan menurun saat menghadapi beban kerja puncak atau tenggat waktu ketat.',
      program: 'Lokakarya ketahanan kerja (work resilience), manajemen prioritas beban kerja, dan teknik menjaga fokus dalam situasi krisis.'
    },
    {
      displayName: 'Orientasi Kualitas',
      matrixItemName: 'Orientasi Kualitas',
      matchers: ['orientasi kualitas', 'kualitas', 'quality control', 'detail', 'ketelitian', 'konsistensi kualitas'],
      impact: 'Hasil kerja atau layanan berpotensi tidak konsisten sehingga dapat memicu komplain dari pelanggan atau pemangku kepentingan.',
      program: 'Penyusunan checklist kendali mutu mandiri, penegakan standar operasional prosedur (SOP), dan evaluasi pencegahan kesalahan kerja.'
    },
    {
      displayName: 'Kemampuan Analisa',
      matrixItemName: 'Kemampuan Analisa',
      matchers: ['kemampuan analisa', 'analisa', 'analytical', 'analisis data', 'analisis mendalam', 'root cause analysis', 'analytical thinking'],
      impact: 'Pemecahan masalah di lapangan berisiko bersifat reaktif dan belum selalu didasarkan pada akar masalah serta data yang akurat.',
      program: 'Pelatihan berpikir analitis dasar, metode penelusuran akar masalah (root cause analysis), dan membaca dashboard kerja.'
    },
    {
      displayName: 'Helicopter View',
      matrixItemName: 'Helicopter View',
      matchers: ['helicopter view', 'wawasan helikopter', 'gambaran menyeluruh', 'broad perspective'],
      impact: 'Kecenderungan terjebak dalam aspek mikro tanpa melihat gambaran besar dan implikasi jangka panjang.',
      program: 'Pelatihan pemikiran konseptual, simulasi bisnis makro, dan pembekalan strategic alignment.'
    },
    {
      displayName: 'Bekerja Mandiri',
      matrixItemName: 'Bekerja Mandiri',
      matchers: ['bekerja mandiri', 'kemandirian eksekusi', 'autonomous execution', 'inisiatif mandiri', 'mandiri'],
      impact: 'Ketergantungan terhadap arahan atasan masih tinggi sehingga memperlambat kecepatan eksekusi tugas di lapangan.',
      program: 'Pemberian ruang wewenang terukur, penetapan milestone mandiri, dan sesi evaluasi mandiri berkala.'
    },
    {
      displayName: 'Penyelesaian Masalah',
      matrixItemName: 'Penyelesaian Masalah',
      matchers: ['penyelesaian masalah', 'problem solving reaktif', 'problem solving aplikatif'],
      impact: 'Solusi yang diambil hanya mengatasi gejala permukaan tanpa menuntaskan akar persoalan yang sebenarnya.',
      program: 'Pelatihan pemecahan masalah terstruktur (metode 5-Whys / Fishbone), klinik studi kasus mingguan, dan evaluasi hasil tindakan.'
    },
    {
      displayName: 'Disiplin',
      matrixItemName: 'Disiplin',
      matchers: ['disiplin', 'discipline', 'kepatuhan prosedur'],
      impact: 'Kepatuhan terhadap standar prosedur operasional dan ketepatan waktu berisiko menurun.',
      program: 'Penguatan sistem monitoring kepatuhan SOP, review kedisiplinan kerja, dan evaluasi berkala.'
    }
  ];

  const defaultDerivedPriorityList = fallbackCatalog.map(cat => {
    const matrixItem = allMatrixItems.find(m => m.name.toLowerCase() === cat.matrixItemName.toLowerCase());
    const affected = employees.filter(e => {
      let isNeedDev = false;
      if (matrixItem) {
        const score = resolveEmployeeCompetencyScore(e, matrixItem);
        if (score <= 2) isNeedDev = true;
      }
      if (!isNeedDev && cat.matchers) {
        const hasInList = e.competenciesToDevelop && e.competenciesToDevelop.some(c => cat.matchers.some(m => c.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.toLowerCase())));
        const hasInDev = e.developmentAreas && cat.matchers.some(m => e.developmentAreas!.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(e.developmentAreas!.toLowerCase()));
        const hasInWeak = e.weaknesses && e.weaknesses.some(w => cat.matchers.some(m => w.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(w.toLowerCase())));
        const hasLowCustom = e.customCompetencies && e.customCompetencies.some(c => c.score < 3.0 && cat.matchers.some(m => c.name.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.name.toLowerCase())));
        if (hasInList || hasInDev || hasInWeak || hasLowCustom) isNeedDev = true;
      }
      return isNeedDev;
    });

    return {
      displayName: cat.displayName,
      name: cat.displayName,
      count: affected.length,
      frequencyText: `${affected.length} dari ${employees.length}`,
      percentage: employees.length > 0 ? Math.round((affected.length / employees.length) * 100) : 0,
      impact: cat.impact,
      program: cat.program,
      recommendedProgram: cat.program,
      affectedEmployees: affected
    };
  }).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

  const rawPriorityList = options?.collectiveDevelopmentList && options.collectiveDevelopmentList.length > 0
    ? options.collectiveDevelopmentList
    : defaultDerivedPriorityList;

  if (rawPriorityList.length > 0) {
    checkPageBreak(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(27, 77, 121);
    doc.text('5. Prioritas Development Kolektif', margin, y + 4);
    y += 7.0;

    // Scope paragraph for Section 5
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const s4ScopeLines = doc.splitTextToSize(
      `Scope: Rangkuman kebutuhan pengembangan bersama (kolektif) bagi seluruh peserta (${employees.length} orang), memetakan area kompetensi prioritas, potensi risiko bila tidak ditangani, serta rekomendasi program pelatihan yang tepat sasaran.`,
      contentWidth
    );
    doc.text(s4ScopeLines, margin, y + 2);
    y += s4ScopeLines.length * 4.4 + 4.0;

    // 4 Column Widths (Total = 273 mm)
    const t4Cols: ColumnHeaderDef[] = [
      { text: 'Area Development Kolektif', width: 65, align: 'left' },
      { text: 'Frekuensi', width: 28, align: 'center' },
      { text: 'Dampak Jika Tidak Dikembangkan', width: 90, align: 'left' },
      { text: 'Rekomendasi Program', width: 90, align: 'left' },
    ];
    const t4Widths = [65, 28, 90, 90];

    const drawTable4Header = () => {
      const headerH = renderCustomTableHeader(doc, margin, y, t4Cols, 10);
      y += headerH;
    };

    drawTable4Header();

    rawPriorityList.forEach((p, pIdx) => {
      const rawItemName = p.name || p.displayName || 'Area Pengembangan';
      const itemName = normalizeTitleCase(rawItemName);
      const itemProg = normalizeSentenceCase(p.recommendedProgram || p.program || '-');
      const itemImpact = normalizeSentenceCase(p.impact || '-');
      const itemFreq = p.frequencyText || (p.count !== undefined ? `${p.count} dari ${employees.length}` : '-');
      const affectedNames = (p.affectedEmployees || []).map(e => normalizeTitleCase(e.name)).filter(Boolean);

      const nameLines = parseTextToLines(`${pIdx + 1}. ${itemName}`, t4Widths[0] - 8, doc, 10, 'bold', 'title');
      const impactLines = parseTextToLines(itemImpact, t4Widths[2] - 8, doc, 10, 'normal', 'sentence');
      const progLines = parseTextToLines(itemProg, t4Widths[3] - 8, doc, 10, 'normal', 'sentence');

      const affectedSubtext = affectedNames.length > 0 ? `Peserta: ${affectedNames.join(', ')}` : '';
      const affectedLines = affectedSubtext ? parseTextToLines(affectedSubtext, t4Widths[0] - 8, doc, 8, 'normal', 'title') : [];

      const col1Count = nameLines.length + (affectedLines[0] !== '-' ? affectedLines.length : 0);
      const maxLineCount = Math.max(col1Count, impactLines.length, progLines.length, 2);
      const rowH = Math.max(15, maxLineCount * 4.4 + 5.5);

      checkPageBreak(rowH, drawTable4Header);

      // Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, rowH, 'FD');

      let rx = margin;

      // 1. Name & Affected List
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      let ny = y + 5.5;
      nameLines.forEach((l: string) => { doc.text(l, rx + 3, ny); ny += 4.4; });
      if (affectedLines.length > 0 && affectedLines[0] !== '-') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        affectedLines.forEach((l: string) => { doc.text(l, rx + 3, ny); ny += 3.8; });
      }
      rx += t4Widths[0];

      // 2. Frekuensi
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(itemFreq, rx + t4Widths[1] / 2, y + 8.6, { align: 'center' });
      rx += t4Widths[1];

      // 3. Impact
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      let iy = y + 5.5;
      impactLines.forEach((l: string) => { doc.text(l, rx + 3, iy); iy += 4.4; });
      rx += t4Widths[2];

      // 4. Program
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      let py = y + 5.5;
      progLines.forEach((l: string) => { doc.text(l, rx + 3, py); py += 4.4; });

      // Dividers
      let divX = margin;
      for (let c = 0; c < t4Widths.length - 1; c++) {
        divX += t4Widths[c];
        doc.setDrawColor(226, 232, 240);
        doc.line(divX, y, divX, y + rowH);
      }

      y += rowH;
    });

    y += 7;
  }

  // ================= DOCUMENT FOOTER NOTES & SIGNATURES =================
  checkPageBreak(50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared from uploaded assessment reports | Internal use only  -  Confidential HR Summary', margin + 2, y + 4);
  doc.setFont('helvetica', 'italic');
  doc.text('Catatan: Nilai IQ mengacu pada hasil psikotes/assessment dengan Skala TIKI sesuai dokumen masing-masing peserta.', margin + 2, y + 9.0);
  y += 14;

  // ================= SIGNATURE & LEGAL VERIFICATION =================
  const sigColW = (contentWidth - 10) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  // Sig 1
  doc.text('Dipersiapkan oleh,', margin + 4, y + 5);
  doc.line(margin + 4, y + 20, margin + sigColW - 4, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('OD Asst. Manager', margin + 4, y + 25);

  // Sig 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Direview oleh,', margin + sigColW + 8, y + 5);
  doc.line(margin + sigColW + 8, y + 20, margin + sigColW * 2, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('HR Manager', margin + sigColW + 8, y + 25);

  // Sig 3
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Disetujui oleh,', margin + sigColW * 2 + 12, y + 5);
  doc.line(margin + sigColW * 2 + 12, y + 20, margin + contentWidth - 4, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Head of Department', margin + sigColW * 2 + 12, y + 25);

  // Apply running header/footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeaderFooter(i === 1);
  }

  // Save the PDF
  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`Executive_Summary_Rekapitulasi_Assessment_${safeDate}.pdf`);
};

