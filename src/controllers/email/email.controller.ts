import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EmailService } from "@/services/email/email.service";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { UserRole } from "@/common/types";
import { User } from "@/schemas/user.schema";
import { IsEmail, IsString } from "class-validator";

class TestEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;
}

@ApiTags("email")
@Controller("email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("test")
  @ApiOperation({ summary: "Send test email (Admin only)" })
  @Roles(UserRole.ADMIN)
  async sendTestEmail(
    @Body() testEmailDto: TestEmailDto,
    @GetUser() user: User
  ) {
    const success = await this.emailService.sendEmail({
      to: testEmailDto.to,
      subject: testEmailDto.subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email from Streamline Suite</h2>
          <p>${testEmailDto.message}</p>
          <p><strong>Sent by:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return {
      success,
      message: success
        ? "Test email sent successfully"
        : "Failed to send test email",
    };
  }

  @Post("test-otp")
  @ApiOperation({ summary: "Send test OTP email (Admin only)" })
  @Roles(UserRole.ADMIN)
  async sendTestOtp(@Body() { to }: { to: string }, @GetUser() user: User) {
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const success = await this.emailService.sendOtpEmail(
      to,
      testOtp,
      "Test User"
    );

    return {
      success,
      otp: testOtp, // Only for testing - never return OTP in production
      message: success
        ? "Test OTP email sent successfully"
        : "Failed to send test OTP email",
    };
  }

  @Post("test-welcome")
  @ApiOperation({ summary: "Send test welcome email (Admin only)" })
  @Roles(UserRole.ADMIN)
  async sendTestWelcome(@Body() { to }: { to: string }) {
    const success = await this.emailService.sendWelcomeEmail(
      to,
      "Test User",
      "Test Company"
    );

    return {
      success,
      message: success
        ? "Test welcome email sent successfully"
        : "Failed to send test welcome email",
    };
  }
}
