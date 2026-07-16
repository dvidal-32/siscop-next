import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'no-reply@siscopnext.com';

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM');

    if (from) {
      this.fromAddress = from;
    }

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.logger.log(`Servicio de correo SMTP configurado en ${host}:${port}`);
    } else {
      this.logger.warn(
        'Servicio de correo SMTP no configurado (SMTP_HOST/SMTP_PORT faltantes). Los correos se imprimirán en la consola.',
      );
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject,
          html,
        });
        this.logger.log(`Correo enviado con éxito a: ${to} (Asunto: ${subject})`);
        return true;
      } catch (error) {
        this.logger.error(`Error enviando correo a ${to}:`, error);
        return false;
      }
    } else {
      this.logger.log(`
┌────────────────────────────────────────────────────────┐
│ [SMTP MOCK] CORREO DE RECUPERACIÓN GENERADO            │
├────────────────────────────────────────────────────────┤
│ Para: ${to}
│ Asunto: ${subject}
├────────────────────────────────────────────────────────┤
│ Contenido HTML:
│ ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
└────────────────────────────────────────────────────────┘
`);
      return true;
    }
  }
}
