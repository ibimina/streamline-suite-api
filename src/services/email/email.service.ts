import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>("EMAIL_USER"),
        pass: this.configService.get<string>("EMAIL_PASS"),
      },
      // Force IPv4 to avoid ENETUNREACH errors with IPv6
      family: 4,
    } as nodemailer.TransportOptions);
    this.logger.log("Email provider: Gmail SMTP initialized");
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!options.to || !options.subject) {
        this.logger.error("Missing required email fields: to or subject");
        return false;
      }

      const emailFrom = this.configService.get<string>("EMAIL_FROM");
      if (!emailFrom) {
        this.logger.error("EMAIL_FROM environment variable is not configured");
        return false;
      }

      const result = await this.transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email sent successfully to ${options.to}: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  // OTP Email Template
  async sendOtpEmail(
    email: string,
    otp: string,
    firstName: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #3B82F6; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Streamline Suite</h1>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Hello ${firstName}!</h2>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">You requested a One-Time Password (OTP) for your account verification.</p>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 15px;">Your OTP code is:</p>
                
                <!-- OTP Code Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
                  <tr>
                    <td style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; text-align: center;">
                      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3B82F6;">${otp}</span>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0;">This code will expire in <strong style="color: #1f2937;">10 minutes</strong>.</p>
                <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin: 15px 0 0;">If you didn't request this code, please ignore this email.</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Your OTP Code - Streamline Suite",
      html,
    });
  }

  // Welcome Email Template
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    companyName?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
          :root { color-scheme: light; }
          body { margin: 0; padding: 0; background-color: #f4f7fa !important; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">Welcome to Streamline Suite!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px; color: white;">Your journey to streamlined business operations starts now</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="font-size: 20px; color: #1f2937; margin: 0 0 20px;">Hi ${firstName},</p>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                  Thank you for joining <strong>Streamline Suite</strong>! We're thrilled to have you on board.
                  ${companyName ? `<br><br>We're excited to help <strong>${companyName}</strong> streamline its operations and grow efficiently.` : ""}
                </p>
                
                <!-- Feature Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 0 8px 8px 0;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #1e40af; font-size: 18px;">What you can do with Streamline Suite:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">📋</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">Create professional invoices & quotations</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">📦</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">Manage inventory & track products</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">💰</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">Track expenses & monitor cash flow</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">👥</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">Manage staff & handle payroll</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">📊</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">View analytics & business insights</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 12px 8px 0; vertical-align: middle; font-size: 20px; width: 35px;">🎨</td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; vertical-align: middle;">Customize with branded PDF templates</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Steps Section -->
                <h3 style="color: #1f2937; margin: 30px 0 20px;">Get started in 3 simple steps:</h3>
                
                <!-- Step 1 -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
                  <tr>
                    <td style="padding: 15px; width: 50px; vertical-align: top;">
                      <table cellpadding="0" cellspacing="0" border="0" width="28" height="28" style="background-color: #3B82F6; border-radius: 50%;">
                        <tr>
                          <td align="center" valign="middle" style="color: white; font-weight: 600; font-size: 14px; line-height: 28px;">1</td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding: 15px 15px 15px 0; color: #4b5563; font-size: 14px; line-height: 1.5; vertical-align: middle;">
                      <strong style="color: #1f2937;">Complete your company profile</strong><br>
                      Add your business details, logo, and contact information.
                    </td>
                  </tr>
                </table>
                
                <!-- Step 2 -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
                  <tr>
                    <td style="padding: 15px; width: 50px; vertical-align: top;">
                      <table cellpadding="0" cellspacing="0" border="0" width="28" height="28" style="background-color: #3B82F6; border-radius: 50%;">
                        <tr>
                          <td align="center" valign="middle" style="color: white; font-weight: 600; font-size: 14px; line-height: 28px;">2</td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding: 15px 15px 15px 0; color: #4b5563; font-size: 14px; line-height: 1.5; vertical-align: middle;">
                      <strong style="color: #1f2937;">Add your products & customers</strong><br>
                      Build your catalog and customer database.
                    </td>
                  </tr>
                </table>
                
                <!-- Step 3 -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
                  <tr>
                    <td style="padding: 15px; width: 50px; vertical-align: top;">
                      <table cellpadding="0" cellspacing="0" border="0" width="28" height="28" style="background-color: #3B82F6; border-radius: 50%;">
                        <tr>
                          <td align="center" valign="middle" style="color: white; font-weight: 600; font-size: 14px; line-height: 28px;">3</td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding: 15px 15px 15px 0; color: #4b5563; font-size: 14px; line-height: 1.5; vertical-align: middle;">
                      <strong style="color: #1f2937;">Create your first invoice</strong><br>
                      Start sending professional invoices in minutes.
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">Go to Dashboard</a>
                    </td>
                  </tr>
                </table>

                <!-- Help Section -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-top: 25px;">
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">Have questions? We're here to help!<br>
                      Contact us at <a href="mailto:support@streamlinesuite.com" style="color: #3B82F6; text-decoration: none; font-weight: 500;">support@streamlinesuite.com</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
                <p style="margin: 5px 0 0;">You're receiving this email because you created an account at Streamline Suite.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Welcome to Streamline Suite! 🚀",
      html,
    });
  }

  // Password Reset Email Template
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get("FRONTEND_URL")}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #DC2626; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Password Reset Request</h1>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Hello ${firstName}!</h2>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">We received a request to reset your password for your Streamline Suite account.</p>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">Click the button below to reset your password:</p>
                
                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${resetUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
                    </td>
                  </tr>
                </table>
                
                <!-- Warning Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #FEF3C7; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="margin: 0 0 10px; color: #92400E; font-weight: 600;">⚠️ Important:</p>
                      <ul style="margin: 0; padding-left: 20px; color: #92400E;">
                        <li style="margin-bottom: 5px;">This link will expire in <strong>1 hour</strong></li>
                        <li style="margin-bottom: 5px;">If you didn't request this reset, please ignore this email</li>
                        <li>For security, this link can only be used once</li>
                      </ul>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin: 20px 0 10px;">If the button doesn't work, copy and paste this link:</p>
                <p style="word-break: break-all; color: #3B82F6; font-size: 14px; margin: 0;">${resetUrl}</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Reset Your Password - Streamline Suite",
      html,
    });
  }

  // Invoice Email Template
  async sendInvoiceEmail(
    email: string,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    downloadUrl?: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #059669; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Invoice ${invoiceNumber}</h1>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Hello ${clientName}!</h2>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">We hope this email finds you well. Please find your invoice details below:</p>
                
                <!-- Invoice Details Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #f3f4f6; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Invoice Details:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px; width: 150px;"><strong style="color: #1f2937;">Invoice Number:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Amount Due:</strong></td>
                          <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 600;">$${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Due Date:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${dueDate.toLocaleDateString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${
                  downloadUrl
                    ? `
                <!-- Download Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${downloadUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">📄 Download Invoice PDF</a>
                    </td>
                  </tr>
                </table>`
                    : ""
                }
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0;">Thank you for your business! If you have any questions about this invoice, please don't hesitate to contact us.</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invoice ${invoiceNumber} - Payment Due`,
      html,
    });
  }

  // Quotation Email Template
  async sendQuotationEmail(
    email: string,
    clientName: string,
    uniqueId: string,
    amount: number,
    expiryDate: Date,
    downloadUrl?: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #7C3AED; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Quotation ${uniqueId}</h1>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Hello ${clientName}!</h2>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">Thank you for your interest in our services. Please find your quotation details below:</p>
                
                <!-- Quotation Details Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #f3f4f6; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Quotation Details:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px; width: 150px;"><strong style="color: #1f2937;">Quotation Number:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${uniqueId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Total Amount:</strong></td>
                          <td style="padding: 8px 0; color: #7C3AED; font-size: 16px; font-weight: 600;">$${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Valid Until:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${expiryDate.toLocaleDateString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${
                  downloadUrl
                    ? `
                <!-- Download Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${downloadUrl}" style="display: inline-block; background-color: #7C3AED; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">📄 Download Quotation PDF</a>
                    </td>
                  </tr>
                </table>`
                    : ""
                }
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0;">This quotation is valid until the date mentioned above. We look forward to working with you!</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Quotation ${uniqueId} - ${clientName}`,
      html,
    });
  }

  // Account Created By Admin Email Template
  async sendAccountCreatedEmail(
    email: string,
    firstName: string,
    companyName: string,
    role: string,
    temporaryPassword: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">Your Account Has Been Created!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px; color: white;">Welcome to ${companyName}</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="font-size: 20px; color: #1f2937; margin: 0 0 20px;">Hi ${firstName},</p>
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">
                  An account has been created for you at <strong>${companyName}</strong> on Streamline Suite. You can now access the platform to manage business operations.
                </p>
                
                <!-- Credentials Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #166534; font-size: 18px;">Your Login Details:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Email:</strong></td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${email}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Temporary Password:</strong></td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace; background-color: #DCFCE7; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Role:</strong></td>
                          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${role}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Warning Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0;">
                  <tr>
                    <td style="padding: 15px;">
                      <p style="margin: 0; color: #92400E; font-size: 14px;">
                        <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <a href="${frontendUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Login to Your Account</a>
                    </td>
                  </tr>
                </table>

                <!-- Help Section -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-top: 25px;">
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        If you did not expect this email or have questions, please contact your administrator.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
                <p style="margin: 5px 0 0;">This email was sent because an account was created for you at ${companyName}.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Your Account Has Been Created - ${companyName}`,
      html,
    });
  }

  // Invoice Overdue Notification Email (sent to account owner)
  async sendInvoiceOverdueEmail(
    accountEmail: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    daysOverdue: number,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #DC2626; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">⚠️ Invoice Overdue Alert</h1>
                <p style="margin: 10px 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">Action Required</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">
                  An invoice for <strong style="color: #1f2937;">${customerName}</strong> is now <strong style="color: #DC2626;">${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue</strong>.
                </p>
                
                <!-- Invoice Details Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #991B1B; font-size: 18px;">Invoice Details:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px; width: 150px;"><strong style="color: #1f2937;">Invoice Number:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Customer:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Amount Due:</strong></td>
                          <td style="padding: 8px 0; color: #DC2626; font-size: 18px; font-weight: 700;">$${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Due Date:</strong></td>
                          <td style="padding: 8px 0; color: #DC2626; font-size: 14px;">${dueDate.toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Days Overdue:</strong></td>
                          <td style="padding: 8px 0; color: #DC2626; font-size: 14px; font-weight: 600;">${daysOverdue} day${daysOverdue > 1 ? "s" : ""}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${frontendUrl}/dashboard/invoices" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Invoice</a>
                    </td>
                  </tr>
                </table>

                <!-- Suggestion Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: #f9fafb; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong style="color: #374151;">💡 Suggested actions:</strong><br>
                        • Follow up with the customer via phone or email<br>
                        • Send a payment reminder<br>
                        • Review payment terms for future invoices
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
                <p style="margin: 5px 0 0;">This is an automated notification from your Streamline Suite account.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: accountEmail,
      subject: `⚠️ Overdue Invoice Alert - ${invoiceNumber} (${customerName})`,
      html,
    });
  }

  // Quotation Expired Notification Email (sent to account owner)
  async sendQuotationExpiredEmail(
    accountEmail: string,
    customerName: string,
    quotationNumber: string,
    amount: number,
    expiredDate: Date,
    daysSinceExpiry: number,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <div style="background-color: #f4f7fa; padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background-color: #F59E0B; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">⏰ Quotation Expired</h1>
                <p style="margin: 10px 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">Follow-up Opportunity</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px;">
                  A quotation for <strong style="color: #1f2937;">${customerName}</strong> has expired${daysSinceExpiry > 0 ? ` <strong style="color: #F59E0B;">${daysSinceExpiry} day${daysSinceExpiry > 1 ? "s" : ""} ago</strong>` : " today"}.
                </p>
                
                <!-- Quotation Details Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #92400E; font-size: 18px;">Quotation Details:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px; width: 150px;"><strong style="color: #1f2937;">Quotation Number:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${quotationNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Customer:</strong></td>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">${customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Quoted Amount:</strong></td>
                          <td style="padding: 8px 0; color: #7C3AED; font-size: 18px; font-weight: 700;">$${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong style="color: #1f2937;">Expired On:</strong></td>
                          <td style="padding: 8px 0; color: #F59E0B; font-size: 14px;">${expiredDate.toLocaleDateString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${frontendUrl}/dashboard/quotations" style="display: inline-block; background-color: #7C3AED; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Quotation</a>
                    </td>
                  </tr>
                </table>

                <!-- Suggestion Box -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: #f9fafb; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong style="color: #374151;">💡 Suggested actions:</strong><br>
                        • Contact the customer to check their interest<br>
                        • Create a new quotation with updated pricing<br>
                        • Review if the customer's needs have changed
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px; line-height: 1.6;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Streamline Suite. All rights reserved.</p>
                <p style="margin: 5px 0 0;">This is an automated notification from your Streamline Suite account.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: accountEmail,
      subject: `⏰ Quotation Expired - ${quotationNumber} (${customerName})`,
      html,
    });
  }
}
