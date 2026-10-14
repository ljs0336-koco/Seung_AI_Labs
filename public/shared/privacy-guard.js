(function attachPrivacyGuard(root) {
  'use strict';

  if (root.SeungPrivacy) return;

  var LABELS = Object.freeze({
    mobile: '휴대전화번호',
    telephone: '전화번호',
    email: '이메일',
    rrn: '주민등록번호',
  });
  var SEPARATOR = '[ \\t.()\\-]*';
  var DOMESTIC_MOBILE = '(?:010' + SEPARATOR + '[0-9]{4}' + SEPARATOR + '[0-9]{4}|01[16789]' + SEPARATOR + '[0-9]{3,4}' + SEPARATOR + '[0-9]{4})';
  var INTERNATIONAL_MOBILE = '(?:\\+82|0082)' + SEPARATOR + '(?:0' + SEPARATOR + ')?(?:10' + SEPARATOR + '[0-9]{4}' + SEPARATOR + '[0-9]{4}|1[16789]' + SEPARATOR + '[0-9]{3,4}' + SEPARATOR + '[0-9]{4})';
  var AREA = '(?:02|0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4]|70))';
  var INTERNATIONAL_AREA = '(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4]|70)';

  // Every normalized code unit retains its complete source code-point span.
  // Dropped format characters remain inside the final source match range.
  function normalizeWithOffsets(value) {
    var source = String(value == null ? '' : value);
    var normalized = '';
    var starts = [];
    var ends = [];
    var offset = 0;
    for (var point of source) {
      var next = offset + point.length;
      var folded = point.normalize('NFKC').replace(/\p{Cf}/gu, '');
      for (var index = 0; index < folded.length; index += 1) {
        normalized += folded[index];
        starts.push(offset);
        ends.push(next);
      }
      offset = next;
    }
    return { source: source, text: normalized, starts: starts, ends: ends };
  }

  function hasNumericBoundary(text, start, end) {
    // Identifiers and hashes must not yield a phone-sized substring.
    var adjacent = /[\p{N}A-Za-z_]/u;
    return !adjacent.test(text[start - 1] || '') && !adjacent.test(text[end] || '');
  }

  function isPlausibleResidentNumber(value) {
    var digits = value.replace(/[^0-9]/g, '');
    var gender = Number(digits[6]);
    var century = gender === 1 || gender === 2 || gender === 5 || gender === 6 ? 1900 : 2000;
    var year = century + Number(digits.slice(0, 2));
    var month = Number(digits.slice(2, 4));
    var day = Number(digits.slice(4, 6));
    var date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function findPrivacyIssues(value) {
    var normalized = normalizeWithOffsets(value);
    var text = normalized.text;
    var candidates = [];

    function collect(pattern, type, validate, numeric) {
      var match;
      while ((match = pattern.exec(text)) !== null) {
        var start = match.index;
        var end = start + match[0].length;
        if (numeric && !hasNumericBoundary(text, start, end)) continue;
        if (validate && !validate(match[0], start, end)) continue;
        candidates.push({ type: type, label: LABELS[type], start: normalized.starts[start], end: normalized.ends[end - 1] });
      }
    }

    collect(/[0-9]{6}[ \t.\-]?[1-8][0-9]{6}/g, 'rrn', isPlausibleResidentNumber, true);
    collect(/[A-Z0-9.!#$%&'*+/=?^_`{|}~\-]+@[A-Z0-9](?:[A-Z0-9\-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9\-]{0,61}[A-Z0-9])?)+/gi, 'email', function validEmail(value, start, end) {
      var local = value.slice(0, value.indexOf('@'));
      var domain = value.slice(value.indexOf('@') + 1);
      var tld = domain.slice(domain.lastIndexOf('.') + 1);
      // A numeric semver suffix in a CDN package URL is not an email TLD.
      // Do not skip URLs: their paths and queries may contain real contacts.
      var validTld = /^(?:[a-z]{2,63}|xn--[a-z0-9](?:[a-z0-9\-]{0,57}[a-z0-9])?)$/i.test(tld);
      return validTld && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
        !/[A-Za-z0-9_@\-]/.test(text[start - 1] || '') && !/[A-Za-z0-9_@\-]/.test(text[end] || '');
    });
    collect(new RegExp('\\(?(?:' + INTERNATIONAL_MOBILE + '|' + DOMESTIC_MOBILE + ')\\)?', 'g'), 'mobile', null, true);
    collect(new RegExp('\\(?(?:(?:\\+82|0082)' + SEPARATOR + '(?:0' + SEPARATOR + ')?' + INTERNATIONAL_AREA + '|' + AREA + ')' + SEPARATOR + '[0-9]{3,4}' + SEPARATOR + '[0-9]{4}\\)?', 'g'), 'telephone', null, true);

    candidates.sort(function bySourceRange(left, right) { return left.start - right.start || right.end - left.end; });
    var issues = [];
    var previousEnd = -1;
    for (var issue of candidates) {
      if (issue.start >= previousEnd) {
        issues.push(issue);
        previousEnd = issue.end;
      }
    }
    return issues;
  }

  function maskPrivateText(value) {
    var source = String(value == null ? '' : value);
    var issues = findPrivacyIssues(source);
    for (var index = issues.length - 1; index >= 0; index -= 1) {
      var issue = issues[index];
      source = source.slice(0, issue.start) + '[' + issue.label + ' 가림]' + source.slice(issue.end);
    }
    return source;
  }

  root.SeungPrivacy = Object.freeze({ findPrivacyIssues: findPrivacyIssues, maskPrivateText: maskPrivateText });
})(globalThis);
