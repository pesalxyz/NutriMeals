import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly client = new OAuth2Client();

  async verify(idToken: string): Promise<GoogleIdentity> {
    const audiences = parseAudiences(process.env.GOOGLE_OAUTH_CLIENT_IDS);
    if (!audiences.length) {
      throw new UnauthorizedException('Google OAuth is not configured.');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: audiences
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid Google token payload.');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: Boolean(payload.email_verified),
      name: payload.name,
      picture: payload.picture
    };
  }
}

function parseAudiences(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
