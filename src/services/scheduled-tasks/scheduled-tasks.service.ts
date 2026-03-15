import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InvoiceDocument } from "@/schemas/invoice.schema";
import { QuotationDocument } from "@/schemas/quotation.schema";
import { CustomerDocument } from "@/schemas/customer.schema";
import { AccountDocument } from "@/schemas/account.schema";
import { EmailService } from "../email/email.service";
import { ActivityService } from "../activity/activity.service";
import { InvoiceStatus, QuotationStatus } from "@/common/types";
import { ActivityType } from "@/models/enums/shared.enum";

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @InjectModel("Invoice") private invoiceModel: Model<InvoiceDocument>,
    @InjectModel("Quotation") private quotationModel: Model<QuotationDocument>,
    @InjectModel("Customer") private customerModel: Model<CustomerDocument>,
    @InjectModel("Account") private accountModel: Model<AccountDocument>,
    private emailService: EmailService,
    private activityService: ActivityService,
  ) {}

  /**
   * Check for overdue invoices every day at 8:00 AM
   * - Updates status from "Sent" to "Overdue" for past due invoices
   * - Sends reminder emails to customers
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleOverdueInvoices() {
    this.logger.log("Running overdue invoice check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Find invoices that are "Sent" and past due date
      const overdueInvoices = await this.invoiceModel
        .find({
          status: InvoiceStatus.SENT,
          dueDate: { $lt: today },
        })
        .populate("customer", "fullName companyName email")
        .populate("account", "name email");

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

      for (const invoice of overdueInvoices) {
        try {
          // Update status to Overdue
          invoice.status = InvoiceStatus.OVERDUE;
          await invoice.save();

          // Calculate days overdue
          const dueDate = new Date(invoice.dueDate);
          const daysOverdue = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Get customer and account details
          const customer = invoice.customer as unknown as CustomerDocument;
          const account = invoice.account as unknown as AccountDocument;
          const accountEmail = account?.email;
          const customerName =
            customer?.companyName || customer?.fullName || "Customer";

          // Log activity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.activityService.logInvoiceActivity(
            ActivityType.INVOICE_OVERDUE,
            invoice._id as any,
            invoice.account as any,
            invoice.createdBy as any,
            {
              invoiceNumber: invoice.uniqueId,
              customerId: customer?._id?.toString(),
              customerName,
              amount: invoice.balanceDue,
              daysOverdue,
            },
          );

          // Send overdue notification to account owner
          if (accountEmail) {
            await this.emailService.sendInvoiceOverdueEmail(
              accountEmail,
              customerName,
              invoice.uniqueId,
              invoice.balanceDue,
              invoice.dueDate,
              daysOverdue,
            );
            this.logger.log(
              `Sent overdue notification for invoice ${invoice.uniqueId} to account ${accountEmail}`,
            );
          } else {
            this.logger.warn(
              `No email for account on invoice ${invoice.uniqueId}, skipping notification`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to process overdue invoice ${invoice.uniqueId}:`,
            error,
          );
        }
      }

      this.logger.log("Overdue invoice check completed");
    } catch (error) {
      this.logger.error("Failed to run overdue invoice check:", error);
    }
  }

  /**
   * Send weekly reminder for invoices that have been overdue for more than 7 days
   * Runs every Monday at 9:00 AM
   */
  @Cron("0 9 * * 1") // Every Monday at 9 AM
  async handleWeeklyOverdueReminders() {
    this.logger.log("Running weekly overdue reminder check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      // Find invoices that are "Overdue" and have been overdue for more than 7 days
      const longOverdueInvoices = await this.invoiceModel
        .find({
          status: InvoiceStatus.OVERDUE,
          dueDate: { $lt: sevenDaysAgo },
        })
        .populate("customer", "fullName companyName email")
        .populate("account", "name email");

      this.logger.log(
        `Found ${longOverdueInvoices.length} invoices overdue for more than 7 days`,
      );

      for (const invoice of longOverdueInvoices) {
        try {
          const dueDate = new Date(invoice.dueDate);
          const daysOverdue = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          const customer = invoice.customer as unknown as CustomerDocument;
          const account = invoice.account as unknown as AccountDocument;
          const accountEmail = account?.email;
          const customerName =
            customer?.companyName || customer?.fullName || "Customer";

          if (accountEmail) {
            await this.emailService.sendInvoiceOverdueEmail(
              accountEmail,
              customerName,
              invoice.uniqueId,
              invoice.balanceDue,
              invoice.dueDate,
              daysOverdue,
            );
            this.logger.log(
              `Sent weekly reminder for invoice ${invoice.uniqueId} to account ${accountEmail}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send weekly reminder for invoice ${invoice.uniqueId}:`,
            error,
          );
        }
      }

      this.logger.log("Weekly overdue reminder check completed");
    } catch (error) {
      this.logger.error("Failed to run weekly overdue reminder check:", error);
    }
  }

  /**
   * Check for expired quotations every day at 8:30 AM
   * - Updates status from "Sent" to "Expired" for quotations past validUntil date
   * - Sends notification emails to account owners
   */
  @Cron("0 30 8 * * *") // Every day at 8:30 AM
  async handleExpiredQuotations() {
    this.logger.log("Running expired quotation check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Find quotations that are "Sent" and past validUntil date
      const expiredQuotations = await this.quotationModel
        .find({
          status: QuotationStatus.SENT,
          validUntil: { $lt: today },
        })
        .populate("customer", "fullName companyName email")
        .populate("account", "name email");

      this.logger.log(`Found ${expiredQuotations.length} expired quotations`);

      for (const quotation of expiredQuotations) {
        try {
          // Update status to Expired
          quotation.status = QuotationStatus.EXPIRED;
          await quotation.save();

          // Calculate days since expiry
          const validUntil = new Date(quotation.validUntil);
          const daysSinceExpiry = Math.floor(
            (today.getTime() - validUntil.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Get customer and account details
          const customer = quotation.customer as unknown as CustomerDocument;
          const account = quotation.account as unknown as AccountDocument;
          const accountEmail = account?.email;
          const customerName =
            customer?.companyName || customer?.fullName || "Customer";

          // Log activity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.activityService.logQuotationActivity(
            ActivityType.QUOTATION_EXPIRED,
            quotation._id as any,
            quotation.account as any,
            quotation.createdBy as any,
            {
              uniqueId: quotation.uniqueId,
              customerId: customer?._id?.toString(),
              customerName,
              amount: quotation.grandTotal,
              daysSinceExpiry,
            },
          );

          // Send expired notification to account owner
          if (accountEmail) {
            await this.emailService.sendQuotationExpiredEmail(
              accountEmail,
              customerName,
              quotation.uniqueId,
              quotation.grandTotal,
              quotation.validUntil,
              daysSinceExpiry,
            );
            this.logger.log(
              `Sent expired notification for quotation ${quotation.uniqueId} to account ${accountEmail}`,
            );
          } else {
            this.logger.warn(
              `No email for account on quotation ${quotation.uniqueId}, skipping notification`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to process expired quotation ${quotation.uniqueId}:`,
            error,
          );
        }
      }

      this.logger.log("Expired quotation check completed");
    } catch (error) {
      this.logger.error("Failed to run expired quotation check:", error);
    }
  }
}
