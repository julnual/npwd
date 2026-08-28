/*
 * PLOY & NAN — Google Sheets receiver v2 (GitHub Pages bridge)
 * Replace Code.gs in the EXISTING spreadsheet-bound Apps Script project.
 * Keep WEDDING_API_KEY and WEDDING_SPREADSHEET_ID in Script Properties.
 * Do NOT rerun setup, create a new spreadsheet, or publish the secret.
 * Update the EXISTING web-app deployment: execute as Me; access Anyone.
 * The original Sites JSON API remains supported with the same private key.
 */
var WEDDING_ALLOWED_ORIGINS = ['https://julnual.github.io'];
var WEDDING_PUBLIC_PER_MINUTE = 60;
var WEDDING_CHALLENGE_TTL_MS = 120000;
var WEDDING_HEADERS = {
  RSVP: ['รหัสคำตอบ', 'เวลาบันทึก (ประเทศไทย)', 'ชื่อผู้ตอบ', 'การเข้าร่วม', 'จำนวนผู้ร่วมงาน (รวมผู้ตอบ)', 'หมายเหตุ'],
  Wishes: ['รหัสคำตอบ', 'เวลาบันทึก (ประเทศไทย)', 'ชื่อผู้ฝากคำอวยพร', 'คำอวยพร']
};

function doGet(event) {
  var p = event && event.parameter || {};
  if (!p.mode) return json_({ ok: true, service: 'Ploy & Nan', version: 2, ready: configured_() });
  if (p.mode !== 'challenge' || !originAllowed_(p.origin) || !uuid_(p.channel) || !uuid_(p.requestId)) {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
  try {
    if (!configured_()) return bridgeReply_(p, 'challenge', { ok: false, code: 'NOT_CONFIGURED' });
    var issued = String(Date.now());
    var nonce = Utilities.getUuid();
    var unsigned = ['v2', issued, nonce].join('.');
    var signed = signature_([unsigned, p.origin, p.channel, p.requestId].join('|'));
    return bridgeReply_(p, 'challenge', { ok: true, token: unsigned + '.' + signed });
  } catch (_) {
    return bridgeReply_(p, 'challenge', { ok: false, code: 'UNAVAILABLE' });
  }
}

function doPost(event) {
  var raw = event && event.postData && event.postData.contents;
  var mime = String(event && event.postData && event.postData.type || '').split(';')[0].toLowerCase();
  // Native form POST avoids fetch/preflight/CORS limitations of Apps Script.
  if (mime === 'application/x-www-form-urlencoded') return publicPost_(event);
  // Backwards-compatible private server-to-server JSON submission.
  if (typeof raw !== 'string' || raw.length > 12000) return json_({ ok: false, code: 'INVALID_REQUEST' });
  try {
    var data = JSON.parse(raw);
    if (!object_(data)) return json_({ ok: false, code: 'INVALID_REQUEST' });
    if (!configured_()) return json_({ ok: false, code: 'NOT_CONFIGURED' });
    var secret = PropertiesService.getScriptProperties().getProperty('WEDDING_API_KEY');
    if (typeof data.apiKey !== 'string' || !equal_(data.apiKey, secret)) return json_({ ok: false, code: 'UNAUTHORIZED' });
    return json_(save_(data, false));
  } catch (_) {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
}

function publicPost_(event) {
  var p = event.parameter || {};
  // This is a PUBLIC submission endpoint, not guest authentication.
  // The allowlist constrains the browser message destination, not bots.
  if (!originAllowed_(p.origin) || !uuid_(p.channel) || !uuid_(p.requestId)) {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
  try {
    var raw = event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 64000 || typeof p.payload !== 'string' || p.payload.length > 12000) {
      return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    }
    if (String(p.website || '').trim()) return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    if (!configured_()) return bridgeReply_(p, 'result', { ok: false, code: 'NOT_CONFIGURED' });
    if (!validToken_(p)) return bridgeReply_(p, 'result', { ok: false, code: 'TOKEN_EXPIRED' });
    var data = JSON.parse(p.payload);
    if (!object_(data) || data.requestId !== p.requestId) return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    return bridgeReply_(p, 'result', save_(data, true));
  } catch (_) {
    return bridgeReply_(p, 'result', { ok: false, code: 'SAVE_FAILED' });
  }
}

function save_(data, publicRequest) {
  var record;
  try { record = validate_(data); } catch (_) { return { ok: false, code: 'INVALID_FIELDS' }; }
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    acquired = lock.tryLock(10000);
    if (!acquired) return { ok: false, code: 'BUSY_RETRY' };
    var id = PropertiesService.getScriptProperties().getProperty('WEDDING_SPREADSHEET_ID');
    var sheet = SpreadsheetApp.openById(id).getSheetByName(record.tab);
    if (!sheet) return { ok: false, code: 'SHEET_NOT_READY' };
    verifyHeaders_(sheet, record.tab);
    var rows = sheet.getLastRow();
    if (rows > 1) {
      var match = sheet.getRange(2, 1, rows - 1, 1).createTextFinder(data.requestId)
        .matchEntireCell(true).matchCase(true).useRegularExpression(false).findNext();
      if (match) {
        var saved = sheet.getRange(match.getRow(), 3, 1, record.values.length).getValues()[0];
        // Sheets may strip the leading apostrophe used to escape a formula.
        if (!record.values.every(function(v, i) {
          return saved[i] === v || (typeof v === 'string' && /^'[=+@\-]/.test(v) && saved[i] === v.slice(1));
        })) return { ok: false, code: 'REQUEST_CONFLICT' };
        return { ok: true, requestId: data.requestId, duplicate: true };
      }
    }
    if (publicRequest && !takeRateSlot_()) return { ok: false, code: 'RATE_LIMITED' };
    var savedAt = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    var row = [data.requestId, savedAt].concat(record.values);
    sheet.getRange(rows + 1, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return { ok: true, requestId: data.requestId };
  } catch (_) {
    return { ok: false, code: 'SAVE_FAILED' };
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function takeRateSlot_() {
  // Called under the same script lock as writes; persisted across executions.
  // This modest global limit is abuse mitigation, not a CAPTCHA or bot proof.
  var props = PropertiesService.getScriptProperties();
  var minute = String(Math.floor(Date.now() / 60000));
  var sameWindow = props.getProperty('WEDDING_PUBLIC_RATE_MINUTE') === minute;
  var count = sameWindow ? Number(props.getProperty('WEDDING_PUBLIC_RATE_COUNT') || 0) : 0;
  if (!Number.isFinite(count) || count < 0) return false;
  if (count >= WEDDING_PUBLIC_PER_MINUTE) return false;
  props.setProperties({ WEDDING_PUBLIC_RATE_MINUTE: minute, WEDDING_PUBLIC_RATE_COUNT: String(count + 1) }, false);
  return true;
}

function validToken_(p) {
  if (typeof p.token !== 'string' || p.token.length > 200) return false;
  var parts = p.token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v2' || !/^\d{13}$/.test(parts[1]) || !uuid_(parts[2])) return false;
  var age = Date.now() - Number(parts[1]);
  if (age < 0 || age > WEDDING_CHALLENGE_TTL_MS) return false;
  var unsigned = parts.slice(0, 3).join('.');
  return equal_(parts[3], signature_([unsigned, p.origin, p.channel, p.requestId].join('|')));
}

function signature_(message) {
  var secret = PropertiesService.getScriptProperties().getProperty('WEDDING_API_KEY');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(message, secret)).replace(/=+$/, '');
}

function equal_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var difference = 0;
  for (var i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function configured_() {
  var p = PropertiesService.getScriptProperties();
  return Boolean(p.getProperty('WEDDING_API_KEY') && p.getProperty('WEDDING_SPREADSHEET_ID'));
}

function originAllowed_(origin) { return WEDDING_ALLOWED_ORIGINS.indexOf(origin) >= 0; }
function object_(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function uuid_(value) { return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value); }

function bridgeReply_(context, phase, data) {
  var envelope = { kind: 'ploy-nan-wedding', version: 2, phase: phase, channel: context.channel,
    requestId: context.requestId, result: data };
  var safe = JSON.stringify(envelope).replace(/[<>&\u2028\u2029]/g, function(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
  // HtmlService renders inside Google's own nested frame. The website is top.
  // Only the explicit allowed website origin can receive this acknowledgement.
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Ploy &amp; Nan form response</title></head><body>' +
    '<script>window.top.postMessage(' + safe + ',' + JSON.stringify(context.origin) + ');</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function validate_(data) {
  if (!uuid_(data.requestId)) throw new Error('Invalid request ID');
  var name = text_(data.name, 100, true);
  if (data.type === 'wish') return { tab: 'Wishes', values: [name, text_(data.message, 2000, true)] };
  if (data.type !== 'rsvp' || ['yes', 'no'].indexOf(data.attendance) < 0) throw new Error('Invalid attendance');
  var count = data.guestCount;
  if (!Number.isInteger(count) || (data.attendance === 'yes' ? count < 1 || count > 20 : count !== 0)) throw new Error('Invalid count');
  return { tab: 'RSVP', values: [name, data.attendance === 'yes' ? 'ยินดีเข้าร่วม' : 'ไม่สะดวกเข้าร่วม', count, text_(data.note, 500, false)] };
}

function text_(value, max, required) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw new Error('Invalid text');
  var trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(trimmed)) throw new Error('Invalid text');
  return /^[=+@\-]/.test(trimmed) ? "'" + trimmed : trimmed;
}

function verifyHeaders_(sheet, name) {
  var expected = WEDDING_HEADERS[name];
  var actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
  if (!expected.every(function(v, i) { return actual[i] === v; })) throw new Error('Unexpected sheet headers');
}

function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
