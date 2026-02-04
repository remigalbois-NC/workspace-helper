import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(subject: string, message: string, fromEmail: string) {
    const textBody = `Demande de support depuis Google Workspace Helper

De : ${fromEmail || 'non renseigné'}
Sujet : ${subject}

Message :
${message}`;

    const email = await resend.emails.send({
        from: 'noreply@numericoach.fr',
        to: 'developpeur@numericoach.fr',
        subject: `[Support Google Workspace Helper] ${subject}`,
        text: textBody,
        replyTo: fromEmail || undefined,
    });
    return email;
}

export async function POST(req: NextRequest) {
    const { subject, message, email } = await req.json();

    const sent = await sendEmail(subject, message, email);
    return NextResponse.json(sent);
}