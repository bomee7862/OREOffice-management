import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Resend (프로덕션 - HTTP API, SMTP 차단 환경)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Gmail SMTP (로컬 개발)
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const gmailTransporter = (GMAIL_USER && GMAIL_APP_PASSWORD && !resend)
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

const FROM_NAME = '오레오피스';
const RESEND_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

interface ContractDetails {
  companyName: string;
  roomNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
}

async function sendEmail(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  // 1순위: Resend (프로덕션)
  if (resend) {
    const opts: any = {
      from: `${FROM_NAME} <${RESEND_FROM}>`,
      to,
      subject,
      html,
    };
    if (attachments?.length) {
      opts.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content,
      }));
    }
    const { data, error } = await resend.emails.send(opts);
    if (error) throw new Error(`Resend 발송 실패: ${error.message}`);
    console.log('Resend 메일 발송 완료:', data?.id);
    return { messageId: data?.id };
  }

  // 2순위: Gmail SMTP (로컬)
  if (gmailTransporter) {
    const opts: any = {
      from: `${FROM_NAME} <${GMAIL_USER}>`,
      to,
      subject,
      html,
    };
    if (attachments?.length) {
      opts.attachments = attachments;
    }
    const result = await gmailTransporter.sendMail(opts);
    console.log('Gmail 메일 발송 완료:', result.messageId);
    return result;
  }

  // 테스트 모드
  console.log('=== [테스트] 메일 발송 스킵 ===');
  console.log('수신자:', to);
  console.log('제목:', subject);
  return { messageId: 'test-' + Date.now() };
}

// 입주자에게 서명 요청 메일 발송
export async function sendSigningEmail(
  to: string,
  signingLink: string,
  details: ContractDetails
) {
  if (!resend && !gmailTransporter) {
    console.log('=== [테스트] 메일 발송 스킵 ===');
    console.log('수신자:', to);
    console.log('서명 링크:', signingLink);
    return { messageId: 'test-' + Date.now() };
  }

  return sendEmail(
    to,
    `[계약서] ${details.roomNumber}호 임대차 계약서 서명 요청`,
    `
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
    `
  );
}

// 양측에 최종 PDF 발송
export async function sendFinalPDF(
  toTenant: string,
  toAdmin: string,
  pdfBuffer: Buffer,
  details: ContractDetails
) {
  if (!resend && !gmailTransporter) {
    console.log('=== [테스트] PDF 메일 발송 스킵 ===');
    console.log('입주자:', toTenant, '관리자:', toAdmin);
    console.log('PDF 크기:', pdfBuffer.length, 'bytes');
    return { tenantResult: { messageId: 'test-tenant' }, adminResult: { messageId: 'test-admin' } };
  }

  const subject = `[계약서] ${details.roomNumber}호 임대차 계약서 (서명 완료)`;
  const html = `
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
  `;
  const attachments = [{
    filename: `계약서_${details.roomNumber}호_${details.companyName}.pdf`,
    content: pdfBuffer,
  }];

  const tenantResult = await sendEmail(toTenant, subject, html, attachments);
  const adminResult = await sendEmail(toAdmin, subject, html, attachments);

  return { tenantResult, adminResult };
}
