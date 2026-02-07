import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getLogger } from 'src/logger/global-app-logger';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

@Injectable()
export class EmailService {
    private readonly LOGGER = getLogger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private readonly isConfigured: boolean;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT', 587);
        const user = this.configService.get<string>('SMTP_USER');

        this.LOGGER.log(
            `Email config - Host: ${host}, Port: ${port}, User: ${user ? 'SET' : 'NOT SET'}`
        );

        if (host && !host.includes('example.com') && host !== 'mailhog') {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: this.configService.get<string>('SMTP_SECURE') === 'true',
                auth: this.getAuthConfig(),
                debug: true,
                logger: true,
            });
            this.isConfigured = true;
            this.LOGGER.log(`Email service configured with host: ${host}:${port}`);

            // Verify connection on startup
            this.verifyConnection();
        } else if (host === 'mailhog') {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: false,
            });
            this.isConfigured = true;
            this.LOGGER.log(`Email service configured with Mailhog`);
        } else {
            this.isConfigured = false;
            this.LOGGER.warn(`Email service not configured. SMTP_HOST: ${host}`);
        }
    }

    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter?.verify();
            this.LOGGER.log(`SMTP connection verified successfully`);
        } catch (error) {
            this.LOGGER.error(`SMTP connection verification failed: ${error.message}`);
        }
    }

    private getAuthConfig(): { user: string; pass: string } | undefined {
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        if (!user && !pass) {
            this.LOGGER.warn(`No SMTP auth configured`);
            return undefined;
        }
        this.LOGGER.debug(`SMTP auth configured for user: ${user}`);
        return { user, pass };
    }

    async sendVerificationEmail(email: string, token: string, name: string): Promise<boolean> {
        const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
        const verificationUrl = `${baseUrl}/user/verify?token=${token}`;
        const from = this.configService.get<string>('SMTP_FROM', 'noreply@iwantmymtg.net');

        this.LOGGER.log(`Attempting to send verification email to: ${email}, from: ${from}`);

        if (!this.isConfigured || !this.transporter) {
            this.LOGGER.warn(`Email not configured. Verification URL: ${verificationUrl}`);
            return this.configService.get<string>('NODE_ENV') === 'dev';
        }

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Welcome to I Want My MTG, ${name}!</h1>
                <p>Please verify your email address by clicking the button below:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Verify Email Address
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 24 hours.
                </p>
                <p style="color: #666; font-size: 14px;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${verificationUrl}" style="color: #666;">${verificationUrl}</a>
                </p>
            </div>
        `;

        try {
            const info = await this.transporter.sendMail({
                from,
                to: email,
                subject: 'Verify your email - I Want My MTG',
                html,
            });
            this.LOGGER.log(`Verification email sent to ${email}. MessageId: ${info.messageId}`);
            return true;
        } catch (error) {
            this.LOGGER.error(`Failed to send verification email to ${email}: ${error.message}`);
            this.LOGGER.error(`Full error: ${JSON.stringify(error)}`);
            return false;
        }
    }
}
