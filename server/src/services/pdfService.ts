// @ts-ignore
import PdfPrinter from 'pdfmake/js/Printer';
import path from 'path';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// __dirname 기준으로 폰트 경로 탐색 (개발/프로덕션 모두 대응)
const getFontsDir = () => {
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, '../../fonts'),          // dev: server/src/services → server/fonts
    path.join(__dirname, '../../../server/fonts'), // dev cwd=root
    path.join(process.cwd(), 'server', 'fonts'),  // root에서 실행
    path.join(process.cwd(), 'fonts'),             // server에서 실행
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
};

const fonts = {
  NanumGothic: {
    normal: path.join(getFontsDir(), 'NanumGothic-Regular.ttf'),
    bold: path.join(getFontsDir(), 'NanumGothic-Bold.ttf'),
    italics: path.join(getFontsDir(), 'NanumGothic-Regular.ttf'),
    bolditalics: path.join(getFontsDir(), 'NanumGothic-Bold.ttf'),
  },
};

const printer = new PdfPrinter(fonts);

interface PdfOptions {
  content: string;
  tenantSignature?: string; // base64 data URL
  adminSignature?: string;  // base64 data URL
  tenantName: string;
  tenantSignedAt?: string;
  adminSignedAt?: string;
  contractDetails: {
    companyName: string;
    roomNumber: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    deposit: string;
  };
}

export async function generateContractPDF(options: PdfOptions): Promise<Buffer> {
  const { content, tenantSignature, adminSignature, tenantName, tenantSignedAt, adminSignedAt, contractDetails } = options;

  // 계약 내용을 줄 단위로 분리하여 pdfmake content로 변환
  const contentLines: Content[] = content.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { text: ' ', fontSize: 10, margin: [0, 2, 0, 2] as [number, number, number, number] };

    // 제목 (# 으로 시작)
    if (trimmed.startsWith('# ')) {
      return { text: trimmed.replace('# ', ''), fontSize: 18, bold: true, alignment: 'center' as const, margin: [0, 10, 0, 10] as [number, number, number, number] };
    }
    if (trimmed.startsWith('## ')) {
      return { text: trimmed.replace('## ', ''), fontSize: 14, bold: true, margin: [0, 8, 0, 6] as [number, number, number, number] };
    }
    if (trimmed.startsWith('### ')) {
      return { text: trimmed.replace('### ', ''), fontSize: 12, bold: true, margin: [0, 6, 0, 4] as [number, number, number, number] };
    }

    return { text: trimmed, fontSize: 10, lineHeight: 1.6, margin: [0, 1, 0, 1] as [number, number, number, number] };
  });

  // 서명 영역
  const signatureSection: Content[] = [
    { text: '', margin: [0, 30, 0, 0] as [number, number, number, number] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
    { text: '서명', fontSize: 14, bold: true, margin: [0, 20, 0, 10] as [number, number, number, number] },
  ];

  // 서명 이미지 또는 텍스트 생성 헬퍼
  const sigContent = (sig: string | undefined, label: string): Content => {
    if (!sig) {
      return { text: '(미서명)', fontSize: 10, color: '#94a3b8', margin: [0, 4, 0, 4] as [number, number, number, number] };
    }
    try {
      return { image: sig, width: 150, height: 60, margin: [0, 4, 0, 4] as [number, number, number, number] };
    } catch {
      return { text: `[${label} 서명 완료]`, fontSize: 10, color: '#334155', margin: [0, 4, 0, 4] as [number, number, number, number] };
    }
  };

  // 서명 테이블
  const signatureTable: Content = {
    columns: [
      {
        width: '*',
        stack: [
          { text: '입주사 (을)', fontSize: 11, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
          { text: tenantName, fontSize: 10, margin: [0, 0, 0, 4] as [number, number, number, number] },
          sigContent(tenantSignature, '입주사'),
          ...(tenantSignedAt ? [
            { text: `서명일: ${tenantSignedAt}`, fontSize: 8, color: '#64748b' } as Content,
          ] : []),
        ],
      },
      {
        width: '*',
        stack: [
          { text: '임대인 (갑)', fontSize: 11, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
          { text: '관리자', fontSize: 10, margin: [0, 0, 0, 4] as [number, number, number, number] },
          sigContent(adminSignature, '관리자'),
          ...(adminSignedAt ? [
            { text: `서명일: ${adminSignedAt}`, fontSize: 8, color: '#64748b' } as Content,
          ] : []),
        ],
      },
    ],
    columnGap: 40,
    margin: [0, 0, 0, 20] as [number, number, number, number],
  };

  const docDefinition: TDocumentDefinitions = {
    defaultStyle: {
      font: 'NanumGothic',
      fontSize: 10,
    },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      ...contentLines,
      ...signatureSection,
      signatureTable,
    ],
  };

  const pdfDoc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
