import { describe, expect, it } from 'vitest';
import { QRContent } from '../qr-content.js';

describe('QRContent', () => {
  it('url returns as-is', () => {
    expect(QRContent.url('https://example.com')).toBe('https://example.com');
  });

  it('wifi produces WIFI: scheme', () => {
    expect(QRContent.wifi('Home', 'pw123')).toBe('WIFI:T:WPA;S:Home;P:pw123;;');
    expect(QRContent.wifi('Open', '', 'nopass')).toBe('WIFI:T:nopass;S:Open;P:;;');
  });

  it('wifi escapes special characters', () => {
    expect(QRContent.wifi('my;ssid', 'p\\w')).toContain('S:my\\;ssid');
    expect(QRContent.wifi('x', 'p:w')).toContain('P:p\\:w');
  });

  it('email produces mailto: URI', () => {
    expect(QRContent.email('a@b.com')).toBe('mailto:a@b.com');
    expect(QRContent.email('a@b.com', 'hi')).toBe('mailto:a@b.com?subject=hi');
    expect(QRContent.email('a@b.com', 'hi', 'body text')).toBe(
      'mailto:a@b.com?subject=hi&body=body%20text',
    );
  });

  it('phone / sms / geo / text', () => {
    expect(QRContent.phone('+31612345678')).toBe('tel:+31612345678');
    expect(QRContent.sms('+31612345678')).toBe('sms:+31612345678');
    expect(QRContent.sms('+31612345678', 'hi')).toBe('sms:+31612345678?body=hi');
    expect(QRContent.geo(52.3676, 4.9041)).toBe('geo:52.3676,4.9041');
    expect(QRContent.text('hello')).toBe('hello');
  });

  it('vcard produces a well-formed vCard', () => {
    const v = QRContent.vcard({
      firstName: 'Mannes',
      lastName: 'Brak',
      email: 'a@b.com',
      phone: '+31612345678',
    });
    expect(v).toContain('BEGIN:VCARD');
    expect(v).toContain('VERSION:3.0');
    expect(v).toContain('N:Brak;Mannes;;;');
    expect(v).toContain('FN:Mannes Brak');
    expect(v).toContain('EMAIL:a@b.com');
    expect(v).toContain('TEL:+31612345678');
    expect(v).toContain('END:VCARD');
  });
});
