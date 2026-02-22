import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const FROM_EMAIL = GMAIL_USER;

const transporter = (GMAIL_USER && GMAIL_APP_PASSWORD)
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  : null;

interface ContractDetails {
  companyName: string;
  roomNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
}

// 입주자에게 서명 요청 메일 발송
export async function sendSigningEmail(
  to: string,
  signingLink: string,
  details: ContractDetails
) {
  if (!transporter) {
    console.log('=== [로컬 테스트] 메일 발송 스킵 (GMAIL 미설정) ===');
    console.log('수신자:', to);
    console.log('서명 링크:', signingLink);
    console.log('계약 정보:', details);
    return { messageId: 'local-test-' + Date.now() };
  }

  const result = await transporter.sendMail({
    from: `오레오피스 <${FROM_EMAIL}>`,
    to,
    subject: `[계약서] ${details.roomNumber}호 임대차 계약서 서명 요청`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #1e293b; margin: 0 0 8px;">계약서 전자 서명 요청</h2>
          <p style="color: #64748b; margin: 0;">아래 계약 내용을 확인하시고 서명해 주세요.</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 16px;">계약 정보</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 100px;">입주사</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${details.companyName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">호실</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${details.roomNumber}호</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">계약 기간</td><td style="padding: 8px 0; color: #1e293b;">${details.startDate} ~ ${details.endDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">월 사용료</td><td style="padding: 8px 0; color: #1e293b;">${details.monthlyRent}원</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">보증금</td><td style="padding: 8px 0; color: #1e293b;">${details.deposit}원</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${signingLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            계약서 확인 및 서명하기
          </a>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            ※ 본 링크는 30일간 유효합니다.<br>
            ※ 서명 완료 후 입금 확인 시 최종 계약서를 이메일로 발송해 드립니다.
          </p>
        </div>
      </div>
    `,
  });

  console.log('서명 요청 메일 발송 완료:', result.messageId);
  return result;
}

// 양측에 최종 PDF 발송
export async function sendFinalPDF(
  toTenant: string,
  toAdmin: string,
  pdfBuffer: Buffer,
  details: ContractDetails
) {
  const emailContent = {
    subject: `[계약서] ${details.roomNumber}호 임대차 계약서 (서명 완료)`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #166534; margin: 0 0 8px;">계약서 서명 완료</h2>
          <p style="color: #15803d; margin: 0;">양측 서명이 포함된 최종 계약서를 보내드립니다.</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 100px;">입주사</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${details.companyName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">호실</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${details.roomNumber}호</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">계약 기간</td><td style="padding: 8px 0; color: #1e293b;">${details.startDate} ~ ${details.endDate}</td></tr>
          </table>
        </div>

        <p style="color: #64748b; font-size: 14px;">첨부된 PDF 파일을 안전하게 보관해 주시기 바랍니다.</p>
      </div>
    `,
    attachments: [
      {
        filename: `계약서_${details.roomNumber}호_${details.companyName}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  if (!transporter) {
    console.log('=== [로컬 테스트] PDF 메일 발송 스킵 (GMAIL 미설정) ===');
    console.log('입주자:', toTenant);
    console.log('관리자:', toAdmin);
    console.log('PDF 크기:', pdfBuffer.length, 'bytes');
    console.log('계약 정보:', details);
    return { tenantResult: { messageId: 'local-test-tenant' }, adminResult: { messageId: 'local-test-admin' } };
  }

  // 입주자에게 발송
  const tenantResult = await transporter.sendMail({
    from: `오레오피스 <${FROM_EMAIL}>`,
    to: toTenant,
    ...emailContent,
  });
  console.log('입주자 PDF 발송 완료:', tenantResult.messageId);

  // 관리자에게 발송
  const adminResult = await transporter.sendMail({
    from: `오레오피스 <${FROM_EMAIL}>`,
    to: toAdmin,
    ...emailContent,
  });
  console.log('관리자 PDF 발송 완료:', adminResult.messageId);

  return { tenantResult, adminResult };
}
