import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
async function sendEmail( subject: string, message: string) {
    const email = await resend.emails.send({
        from: 'noreply@numericoach.fr',
        to: 'developpeur@numericoach.fr',
        subject: `[Support Workspace Helper] ${subject}`,
        text: message,
    });
    return email;
}

export async function POST(req: NextRequest) {
    const { subject, message } = await req.json();
    const email = await sendEmail(subject, message);
    return NextResponse.json(email);
}