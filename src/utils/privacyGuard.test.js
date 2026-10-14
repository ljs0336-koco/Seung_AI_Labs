import { describe, expect, it } from 'vitest';
import '../../public/shared/privacy-guard.js';

const { findPrivacyIssues, maskPrivateText } = globalThis.SeungPrivacy;
const phone = (prefix = '010', middle = '2846', last = '7395', separator = '-') => [prefix, middle, last].join(separator);
const email = ['lesson', 'teacher'].join('+') + '@' + ['school', 'example', 'org'].join('.');
const resident = (birth = '900228', tail = '1234567') => [birth, tail].join('-');

describe('public privacy guard', () => {
  it('exposes a frozen classic-script API without captured values', () => {
    expect(Object.isFrozen(globalThis.SeungPrivacy)).toBe(true);
    const [issue] = findPrivacyIssues(phone());
    expect(issue).toEqual({ type: 'mobile', label: '휴대전화번호', start: 0, end: phone().length });
    expect(Object.keys(issue).sort()).toEqual(['end', 'label', 'start', 'type']);
  });

  it.each(['-', ' ', '.', '', ') ('])('finds supported domestic mobile separators %j', (separator) => {
    expect(findPrivacyIssues(phone('010', '2846', '7395', separator))).toHaveLength(1);
    expect(maskPrivateText(phone('010', '2846', '7395', separator))).toBe('[휴대전화번호 가림]');
  });

  it.each(['011', '016', '017', '018', '019'])('finds legacy mobile prefix %s with three or four middle digits', (prefix) => {
    expect(findPrivacyIssues(phone(prefix, '284'))[0]?.type).toBe('mobile');
    expect(findPrivacyIssues(phone(prefix))[0]?.type).toBe('mobile');
  });

  it.each(['+82', '0082'])('finds international prefix %s and optional trunk parentheses', (prefix) => {
    for (const value of [prefix + ' ' + phone('10', '2846', '7395', ' '), prefix + phone('10', '2846', '7395', ''), prefix + ' (0) ' + phone('10')]) {
      expect(maskPrivateText(value)).toBe('[휴대전화번호 가림]');
    }
  });

  it('includes formatting and uses original UTF-16 indexes after NFKC and hidden characters', () => {
    const fullWidth = phone().replace(/[0-9]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) + 0xFEE0));
    const hidden = fullWidth.split('').join('\u200B');
    const value = '수업🙂 연락 (' + hidden + ') 끝';
    const [issue] = findPrivacyIssues(value);
    expect(value.slice(issue.start, issue.end)).toBe('(' + hidden + ')');
    expect(maskPrivateText(value)).toBe('수업🙂 연락 [휴대전화번호 가림] 끝');
    expect(maskPrivateText(phone().split('').join('\u2060'))).toBe('[휴대전화번호 가림]');
  });

  it('finds landlines with recognized Korean area codes', () => {
    for (const value of [['02', '284', '7395'].join('-'), ['031', '2846', '7395'].join(' '), ['070', '2846', '7395'].join(''), '+82 ' + ['2', '2846', '7395'].join(' ')]) {
      expect(maskPrivateText(value)).toBe('[전화번호 가림]');
    }
  });

  it('masks contact links and residents with a valid date without requiring a checksum', () => {
    expect(maskPrivateText('tel:' + phone() + ' mailto:' + email)).toBe('tel:[휴대전화번호 가림] mailto:[이메일 가림]');
    expect(maskPrivateText(resident())).toBe('[주민등록번호 가림]');
    expect(maskPrivateText(resident('000229', '3234567'))).toBe('[주민등록번호 가림]');
    expect(findPrivacyIssues(resident('900230'))).toEqual([]);
    expect(findPrivacyIssues(resident('901328'))).toEqual([]);
    expect(findPrivacyIssues(resident('900228', '0234567'))).toEqual([]);
  });

  it('prefers the complete email span if its local part also resembles a phone', () => {
    const value = phone('010', '2846', '7395', '') + '@' + ['example', 'org'].join('.');
    expect(findPrivacyIssues(value).map((issue) => issue.type)).toEqual(['email']);
    expect(maskPrivateText(value)).toBe('[이메일 가림]');
  });

  it('ignores semver CDN package URLs while inspecting contacts inside other URLs', () => {
    const cdn = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css';
    expect(findPrivacyIssues(cdn)).toEqual([]);
    const contacts = 'https://example.org/share?email=' + email + '\nhttps://example.org/share?phone=' + phone();
    expect(findPrivacyIssues(contacts).map((issue) => issue.type)).toEqual(['email', 'mobile']);
    const masked = maskPrivateText(contacts);
    expect(masked.includes(email)).toBe(false);
    expect(masked.includes(phone())).toBe(false);
  });

  it('does not extract shorter numeric substrings or mistake learning numbers for contacts', () => {
    const values = [
      '9' + phone('010', '2846', '7395', ''),
      phone('010', '2846', '7395', '') + '9',
      'abc' + phone('010', '2846', '7395', '') + 'def',
      'id_' + phone('010', '2846', '7395', ''),
      '2026-10-14 12:30:00',
      '00:10:16',
      'ISBN 978-89-1234-567-0',
      '정답률 0.1012345678, 1010명, 2345회, 6789점',
      '통계: 20261014123000',
      'https://schema.org @context @type',
      phone('010', '284', '7395'),
      phone('012'),
    ];
    for (const value of values) expect(findPrivacyIssues(value)).toEqual([]);
  });

  it('handles empty values and multiple replacements without exposing originals', () => {
    expect(findPrivacyIssues(null)).toEqual([]);
    expect(maskPrivateText(undefined)).toBe('');
    const original = [phone(), email, resident()].join('\n');
    const masked = maskPrivateText(original);
    expect(masked).toBe('[휴대전화번호 가림]\n[이메일 가림]\n[주민등록번호 가림]');
    expect(findPrivacyIssues(masked)).toEqual([]);
  });
});
