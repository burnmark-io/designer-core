/**
 * Helpers for producing QR-code payload strings for common content types.
 * Used as `data` for a BarcodeObject of format `'qrcode'`.
 */

export interface VCardContact {
  firstName: string;
  lastName: string;
  organisation?: string;
  title?: string;
  phone?: string;
  email?: string;
  url?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

function escapeMecardField(value: string): string {
  return value.replaceAll(/[\\;,:"]/g, match => `\\${match}`);
}

function escapeVCardField(value: string): string {
  return value.replaceAll(/[\\;,]/g, match => `\\${match}`);
}

export const QRContent = {
  url(url: string): string {
    return url;
  },

  wifi(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass' = 'WPA'): string {
    const s = escapeMecardField(ssid);
    const p = escapeMecardField(password);
    return `WIFI:T:${security};S:${s};P:${p};;`;
  },

  email(to: string, subject?: string, body?: string): string {
    const params: string[] = [];
    if (subject !== undefined) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body !== undefined) params.push(`body=${encodeURIComponent(body)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return `mailto:${to}${qs}`;
  },

  phone(number: string): string {
    return `tel:${number}`;
  },

  sms(number: string, message?: string): string {
    const body = message === undefined ? '' : `?body=${encodeURIComponent(message)}`;
    return `sms:${number}${body}`;
  },

  geo(lat: number, lng: number): string {
    return `geo:${String(lat)},${String(lng)}`;
  },

  text(text: string): string {
    return text;
  },

  vcard(contact: VCardContact): string {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    const { firstName, lastName, organisation, title, phone, email, url, address } = contact;
    lines.push(`N:${escapeVCardField(lastName)};${escapeVCardField(firstName)};;;`);
    lines.push(`FN:${escapeVCardField(firstName)} ${escapeVCardField(lastName)}`);
    if (organisation !== undefined) lines.push(`ORG:${escapeVCardField(organisation)}`);
    if (title !== undefined) lines.push(`TITLE:${escapeVCardField(title)}`);
    if (phone !== undefined) lines.push(`TEL:${phone}`);
    if (email !== undefined) lines.push(`EMAIL:${email}`);
    if (url !== undefined) lines.push(`URL:${url}`);
    if (address !== undefined) {
      const a = address;
      lines.push(
        `ADR:;;${escapeVCardField(a.street ?? '')};${escapeVCardField(a.city ?? '')};${escapeVCardField(
          a.region ?? '',
        )};${escapeVCardField(a.postalCode ?? '')};${escapeVCardField(a.country ?? '')}`,
      );
    }
    lines.push('END:VCARD');
    return lines.join('\n');
  },
};
