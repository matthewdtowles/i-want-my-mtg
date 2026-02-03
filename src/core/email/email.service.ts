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
    private transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure: this.configService.get<boolean>('SMTP_SECURE', false),
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async sendVerificationEmail(email: string, token: string, name: string): Promise<boolean> {
        const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
        const verificationUrl = `${baseUrl}/user/verify?token=${token}`;

        const html = `
            <h1>Welcome to I Want My MTG, ${name}!</h1>
            <p>Please verify your email address by clicking the link below:</p>
            <p><a href="${verificationUrl}">Verify Email Address</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
        `;

        try {
            await this.transporter.sendMail({
                from: this.configService.get<string>('SMTP_FROM', 'noreply@iwantmymtg.com'),
                to: email,
                subject: 'Verify your email - I Want My MTG',
                html,
            });
            this.LOGGER.debug(`Verification email sent to ${email}`);
            return true;
        } catch (error) {
            this.LOGGER.error(`Failed to send verification email to ${email}: ${error.message}`);
            return false;
        }
    }
}
