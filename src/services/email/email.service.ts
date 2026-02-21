import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: any;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const emailProvider = this.configService.get<string>(
      "EMAIL_PROVIDER",
      "smtp",
    );

    switch (emailProvider) {
      case "brevo":
        this.transporter = nodemailer.createTransport({
          host: "smtp-relay.brevo.com",
          port: 587,
          secure: false,
          auth: {
            user: this.configService.get<string>("EMAIL_USER"),
            pass: this.configService.get<string>("EMAIL_PASS"),
          },
        });
        break;

      case "sendgrid":
        this.transporter = nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          secure: false,
          auth: {
            user: "apikey",
            pass: this.configService.get<string>("SENDGRID_API_KEY"),
          },
        });
        break;

      case "mailgun":
        this.transporter = nodemailer.createTransport({
          host: "smtp.mailgun.org",
          port: 587,
          secure: false,
          auth: {
            user: this.configService.get<string>("MAILGUN_USERNAME"),
            pass: this.configService.get<string>("MAILGUN_PASSWORD"),
          },
        });
        break;

      case "gmail":
      case "smtp":
      default:
        this.transporter = nodemailer.createTransport({
          host: this.configService.get<string>("EMAIL_HOST", "smtp.gmail.com"),
          port: this.configService.get<number>("EMAIL_PORT", 587),
          secure: false,
          auth: {
            user: this.configService.get<string>("EMAIL_USER"),
            pass: this.configService.get<string>("EMAIL_PASS"),
          },
        });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Validate email options to prevent infinite loops or errors
      if (!options.to || !options.subject) {
        this.logger.error("Missing required email fields: to or subject");
        return false;
      }

      const emailFrom = this.configService.get<string>("EMAIL_FROM");
      if (!emailFrom) {
        this.logger.error("EMAIL_FROM environment variable is not configured");
        return false;
      }

      const mailOptions = {
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
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
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            text-align: center; 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px;
            letter-spacing: 5px;
            color: #3B82F6;
          }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Streamline Suite</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>You requested a One-Time Password (OTP) for your account verification.</p>
            <p>Your OTP code is:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2025 Streamline Suite. All rights reserved.</p>
          </div>
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
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .cta-button { 
            display: inline-block; 
            background-color: #3B82F6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .features { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Streamline Suite! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Welcome to <strong>Streamline Suite</strong> - your comprehensive business management solution!</p>
            ${companyName ? `<p>We're excited to help <strong>${companyName}</strong> streamline its operations.</p>` : ""}
            
            <div class="features">
              <h3>What you can do with Streamline Suite:</h3>
              <ul>
                <li>📋 Manage Invoices & Quotations</li>
                <li>📦 Track Inventory & Products</li>
                <li>💰 Monitor Expenses & Analytics</li>
                <li>👥 Manage Staff & Payroll</li>
                <li>🎨 Custom PDF Templates</li>
              </ul>
            </div>

            <p>Ready to get started?</p>
            <a href="${this.configService.get("FRONTEND_URL")}" class="cta-button">Login to Dashboard</a>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 Streamline Suite. All rights reserved.</p>
            <p>You're receiving this because you created an account with us.</p>
          </div>
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
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .reset-button { 
            display: inline-block; 
            background-color: #DC2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .warning { background-color: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>We received a request to reset your password for your Streamline Suite account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="reset-button">Reset Password</a>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>For security, this link can only be used once</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break: break-all; color: #3B82F6;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© 2025 Streamline Suite. All rights reserved.</p>
          </div>
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
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .invoice-details { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .download-button { 
            display: inline-block; 
            background-color: #059669; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice ${invoiceNumber}</h1>
          </div>
          <div class="content">
            <h2>Hello ${clientName}!</h2>
            <p>We hope this email finds you well. Please find your invoice details below:</p>
            
            <div class="invoice-details">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
            </div>

            ${downloadUrl ? `<a href="${downloadUrl}" class="download-button">📄 Download Invoice PDF</a>` : ""}
            
            <p>Thank you for your business! If you have any questions about this invoice, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p>© 2025 Streamline Suite. All rights reserved.</p>
          </div>
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
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #7C3AED; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .quotation-details { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .download-button { 
            display: inline-block; 
            background-color: #7C3AED; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Quotation ${uniqueId}</h1>
          </div>
          <div class="content">
            <h2>Hello ${clientName}!</h2>
            <p>Thank you for your interest in our services. Please find your quotation details below:</p>
            
            <div class="quotation-details">
              <h3>Quotation Details:</h3>
              <p><strong>Quotation Number:</strong> ${uniqueId}</p>
              <p><strong>Total Amount:</strong> $${amount.toFixed(2)}</p>
              <p><strong>Valid Until:</strong> ${expiryDate.toLocaleDateString()}</p>
            </div>

            ${downloadUrl ? `<a href="${downloadUrl}" class="download-button">📄 Download Quotation PDF</a>` : ""}
            
            <p>This quotation is valid until the date mentioned above. We look forward to working with you!</p>
          </div>
          <div class="footer">
            <p>© 2025 Streamline Suite. All rights reserved.</p>
          </div>
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
}
