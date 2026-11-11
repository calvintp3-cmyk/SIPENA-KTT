// server/middleware/01-security.ts
import { randomUUID } from 'node:crypto';
import {
  defineEventHandler,
  getRequestHeader,
  getRequestProtocol,
  setResponseHeader,
} from 'h3';

export default defineEventHandler((event) => {
  const existingRequestId = getRequestHeader(event, 'x-request-id');
  const requestId =
    existingRequestId && /^[a-zA-Z0-9_-]{8,64}$/.test(existingRequestId)
      ? existingRequestId
      : randomUUID();

  event.context.requestId = requestId;
  setResponseHeader(event, 'X-Request-Id', requestId);
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff');
  setResponseHeader(event, 'X-Frame-Options', 'DENY');
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin');
  setResponseHeader(event, 'X-Permitted-Cross-Domain-Policies', 'none');
  setResponseHeader(
    event,
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );

  const isProd = process.env.NODE_ENV === 'production';
  const connectSrc = isProd ? "connect-src 'self'" : "connect-src 'self' ws: wss:";

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    connectSrc,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  setResponseHeader(event, 'Content-Security-Policy', csp);

  if (isProd && getRequestProtocol(event, { xForwardedProto: true }) === 'https') {
    setResponseHeader(
      event,
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
});

