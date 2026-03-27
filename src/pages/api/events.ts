import type { APIRoute } from 'astro';
import { errorResponse } from '../../lib/server/http';

export const prerender = false;

export const POST: APIRoute = async () => {
  return errorResponse(410, 'EVENTS_ENDPOINT_DEPRECATED', 'Browser analytics writes are disabled.');
};
