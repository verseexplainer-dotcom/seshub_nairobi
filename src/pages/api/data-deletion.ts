import type { APIRoute } from 'astro';
import { storefrontDetails } from '../../lib/storefront';
import { jsonResponse } from '../../lib/server/http';

export const prerender = false;

const deletionPayload = {
  ok: true,
  business: storefrontDetails.brandName,
  support_email: storefrontDetails.email,
  deletion_url: 'https://sesicthub.co.ke/data-deletion',
  instructions: [
    `Email ${storefrontDetails.email} with the subject "Data deletion request".`,
    'Include the email address or phone number used on the website, and mention if the request relates to Facebook Login, Messenger, Instagram, or WhatsApp.',
    'SES ICT HUB will review the request and confirm the outcome by email or phone.'
  ],
  expected_processing_time: 'Within 7 business days after identity and account details are confirmed.',
  retention_note: 'Some order, payment, tax, fraud-prevention, and accounting records may be retained where required for legitimate business or legal reasons.'
};

export const GET: APIRoute = async () => jsonResponse(deletionPayload);

export const POST: APIRoute = async () => jsonResponse(deletionPayload);
