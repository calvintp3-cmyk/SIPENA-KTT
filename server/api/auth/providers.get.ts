// server/api/auth/providers.get.ts
import { defineEventHandler } from 'h3';
import { getGoogleOAuthConfig } from '../../utils/google-oauth';

export default defineEventHandler(() => {
  const google = getGoogleOAuthConfig();

  return {
    googleEnabled: google.configured,
    passwordEnabled: true,
  };
});

