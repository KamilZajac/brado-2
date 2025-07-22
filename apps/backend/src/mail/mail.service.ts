import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: 'test@webified.pl',
        pass: 'y7U9C5tFz%!jJXqFRH2X', // Todo - use env
      },
    });
  }

  async sendMail(options: {
    subject: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: 'test@webified.pl',
      to: ['kamil@webified.pl', 'msporysz@brado-2.pl'],
      subject: options.subject,
      text: options.text,
      attachments: options.attachments,
    };

    return await this.transporter.sendMail(mailOptions);
  }
}
