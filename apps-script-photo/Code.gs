/*
 * PLOY & NAN — Guest Photo Receiver
 * Dedicated Apps Script for /share/ only.
 * It does not read or modify the RSVP/Wishes spreadsheet or its Apps Script.
 *
 * One-time setup:
 * 1. Create a new standalone Apps Script project and paste this file.
 * 2. Run setupPhotoSharing() as the wedding owner.
 * 3. Deploy as Web app: Execute as Me; access Anyone.
 */
var PHOTO_ALLOWED_ORIGINS = ['https://julnual.github.io'];
var PHOTO_PUBLIC_PER_MINUTE = 60;
var PHOTO_CHALLENGE_TTL_MS = 120000;
var PHOTO_SPREADSHEET_NAME = 'PLOY_NAN_GUEST_PHOTOS_2026';
var PHOTO_FOLDER_NAME = 'PLOY_NAN_GUEST_PHOTOS_2026';
var PHOTO_SHEET_NAME = 'Photos';
var PHOTO_MAX_BASE64 = 3000000;
var PHOTO_HEADERS = [
  'รหัสรูป',
  'รหัสชุดอัปโหลด',
  'เวลาบันทึก (ประเทศไทย)',
  'ชื่อไฟล์ใน Drive',
  'ชื่อไฟล์ต้นฉบับ',
  'File ID',
  'ลิงก์ไฟล์ใน Drive',
  'MIME Type',
  'ขนาดไฟล์ (bytes)',
  'ความกว้าง (px)',
  'ความสูง (px)',
  'สถานะ'
];

function doGet(event) {
  var p = event && event.parameter || {};
  if (!p.mode) {
    return json_({
      ok: true,
      service: 'PLOY & NAN Photo Upload',
      version: 1,
      photoReady: configured_()
    });
  }
  if (p.mode !== 'challenge' || !originAllowed_(p.origin) || !uuid_(p.channel) || !uuid_(p.requestId)) {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
  try {
    if (!configured_()) return bridgeReply_(p, 'challenge', { ok: false, code: 'PHOTO_NOT_CONFIGURED' });
    var issued = String(Date.now());
    var nonce = Utilities.getUuid();
    var unsigned = ['p1', issued, nonce].join('.');
    var signed = signature_([unsigned, p.origin, p.channel, p.requestId].join('|'));
    return bridgeReply_(p, 'challenge', { ok: true, token: unsigned + '.' + signed });
  } catch (_) {
    return bridgeReply_(p, 'challenge', { ok: false, code: 'UNAVAILABLE' });
  }
}

function doPost(event) {
  var mime = String(event && event.postData && event.postData.type || '').split(';')[0].toLowerCase();
  if (mime !== 'application/x-www-form-urlencoded') {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
  return publicPost_(event);
}

function publicPost_(event) {
  var p = event.parameter || {};
  if (!originAllowed_(p.origin) || !uuid_(p.channel) || !uuid_(p.requestId)) {
    return json_({ ok: false, code: 'INVALID_REQUEST' });
  }
  try {
    var raw = event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 5000000 || typeof p.payload !== 'string' || p.payload.length > 3200000) {
      return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    }
    if (String(p.website || '').trim()) return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    if (!configured_()) return bridgeReply_(p, 'result', { ok: false, code: 'PHOTO_NOT_CONFIGURED' });
    if (!validToken_(p)) return bridgeReply_(p, 'result', { ok: false, code: 'TOKEN_EXPIRED' });
    var data = JSON.parse(p.payload);
    if (!object_(data) || data.type !== 'photo' || data.requestId !== p.requestId) {
      return bridgeReply_(p, 'result', { ok: false, code: 'INVALID_REQUEST' });
    }
    return bridgeReply_(p, 'result', savePhoto_(data));
  } catch (_) {
    return bridgeReply_(p, 'result', { ok: false, code: 'SAVE_FAILED' });
  }
}

/**
 * Run once before deploying the web app. This creates a separate private
 * spreadsheet, a Photos sheet, a separate private Drive folder and a secret
 * used only to sign short-lived upload challenges.
 */
function setupPhotoSharing() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('PHOTO_SPREADSHEET_ID');
  var spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.create(PHOTO_SPREADSHEET_NAME);

  var sheet = spreadsheet.getSheetByName(PHOTO_SHEET_NAME);
  if (!sheet) {
    var sheets = spreadsheet.getSheets();
    sheet = sheets.length === 1 && sheets[0].getLastRow() === 0
      ? sheets[0].setName(PHOTO_SHEET_NAME)
      : spreadsheet.insertSheet(PHOTO_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, PHOTO_HEADERS.length).setValues([PHOTO_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, PHOTO_HEADERS.length)
      .setFontWeight('bold').setBackground('#858A74').setFontColor('#ffffff');
    sheet.autoResizeColumns(1, PHOTO_HEADERS.length);
  } else {
    verifyHeaders_(sheet);
  }

  var folderId = props.getProperty('PHOTO_FOLDER_ID');
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.createFolder(PHOTO_FOLDER_NAME);
  folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);

  var secret = props.getProperty('PHOTO_UPLOAD_SECRET');
  if (!secret) secret = Utilities.getUuid() + Utilities.getUuid();
  props.setProperties({
    PHOTO_SPREADSHEET_ID: spreadsheet.getId(),
    PHOTO_FOLDER_ID: folder.getId(),
    PHOTO_UPLOAD_SECRET: secret
  }, false);
  SpreadsheetApp.flush();
  return {
    ok: true,
    photoReady: true,
    spreadsheetUrl: spreadsheet.getUrl(),
    folderName: folder.getName()
  };
}

function savePhoto_(data) {
  var photo;
  try { photo = validatePhoto_(data); } catch (_) { return { ok: false, code: 'INVALID_FIELDS' }; }
  var lock = LockService.getScriptLock();
  var acquired = false;
  var createdFile = null;
  try {
    acquired = lock.tryLock(20000);
    if (!acquired) return { ok: false, code: 'BUSY_RETRY' };
    var props = PropertiesService.getScriptProperties();
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('PHOTO_SPREADSHEET_ID'));
    var sheet = spreadsheet.getSheetByName(PHOTO_SHEET_NAME);
    if (!sheet) return { ok: false, code: 'PHOTO_NOT_CONFIGURED' };
    verifyHeaders_(sheet);

    var rows = sheet.getLastRow();
    if (rows > 1) {
      var match = sheet.getRange(2, 1, rows - 1, 1).createTextFinder(data.requestId)
        .matchEntireCell(true).matchCase(true).useRegularExpression(false).findNext();
      if (match) return { ok: true, requestId: data.requestId, duplicate: true };
    }
    if (!takeRateSlot_()) return { ok: false, code: 'RATE_LIMITED' };

    var bytes = Utilities.base64Decode(photo.dataBase64);
    if (bytes.length !== photo.byteSize) return { ok: false, code: 'INVALID_FIELDS' };
    var savedAt = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    var driveName = 'PN_' + savedAt.replace(/[-: ]/g, '') + '_' + data.requestId.slice(0, 8) + '.jpg';
    var folder = DriveApp.getFolderById(props.getProperty('PHOTO_FOLDER_ID'));
    createdFile = folder.createFile(Utilities.newBlob(bytes, photo.mimeType, driveName));
    createdFile.setDescription('PLOY & NAN guest photo | batch ' + photo.batchId + ' | private');

    var row = [
      data.requestId,
      photo.batchId,
      savedAt,
      driveName,
      photo.originalName,
      createdFile.getId(),
      createdFile.getUrl(),
      photo.mimeType,
      photo.byteSize,
      photo.width,
      photo.height,
      'private'
    ];
    sheet.getRange(rows + 1, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return { ok: true, requestId: data.requestId };
  } catch (_) {
    if (createdFile) {
      try { createdFile.setTrashed(true); } catch (_cleanupError) {}
    }
    return { ok: false, code: 'SAVE_FAILED' };
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function validatePhoto_(data) {
  if (!uuid_(data.requestId) || !uuid_(data.batchId)) throw new Error('Invalid IDs');
  if (data.mimeType !== 'image/jpeg') throw new Error('Invalid MIME type');
  if (typeof data.dataBase64 !== 'string' || !data.dataBase64 || data.dataBase64.length > PHOTO_MAX_BASE64 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data.dataBase64)) throw new Error('Invalid image');
  if (!Number.isInteger(data.byteSize) || data.byteSize < 1 || data.byteSize > 2000000) throw new Error('Invalid size');
  if (!Number.isInteger(data.width) || data.width < 1 || data.width > 4000 ||
      !Number.isInteger(data.height) || data.height < 1 || data.height > 4000) throw new Error('Invalid dimensions');
  return {
    batchId: data.batchId,
    originalName: text_(data.originalName, 180),
    mimeType: data.mimeType,
    byteSize: data.byteSize,
    width: data.width,
    height: data.height,
    dataBase64: data.dataBase64
  };
}

function takeRateSlot_() {
  var props = PropertiesService.getScriptProperties();
  var minute = String(Math.floor(Date.now() / 60000));
  var sameWindow = props.getProperty('PHOTO_RATE_MINUTE') === minute;
  var count = sameWindow ? Number(props.getProperty('PHOTO_RATE_COUNT') || 0) : 0;
  if (!Number.isFinite(count) || count < 0 || count >= PHOTO_PUBLIC_PER_MINUTE) return false;
  props.setProperties({ PHOTO_RATE_MINUTE: minute, PHOTO_RATE_COUNT: String(count + 1) }, false);
  return true;
}

function validToken_(p) {
  if (typeof p.token !== 'string' || p.token.length > 200) return false;
  var parts = p.token.split('.');
  if (parts.length !== 4 || parts[0] !== 'p1' || !/^\d{13}$/.test(parts[1]) || !uuid_(parts[2])) return false;
  var age = Date.now() - Number(parts[1]);
  if (age < 0 || age > PHOTO_CHALLENGE_TTL_MS) return false;
  var unsigned = parts.slice(0, 3).join('.');
  return equal_(parts[3], signature_([unsigned, p.origin, p.channel, p.requestId].join('|')));
}

function signature_(message) {
  var secret = PropertiesService.getScriptProperties().getProperty('PHOTO_UPLOAD_SECRET');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(message, secret)).replace(/=+$/, '');
}

function configured_() {
  var props = PropertiesService.getScriptProperties();
  return Boolean(props.getProperty('PHOTO_UPLOAD_SECRET') && props.getProperty('PHOTO_SPREADSHEET_ID') && props.getProperty('PHOTO_FOLDER_ID'));
}

function bridgeReply_(context, phase, data) {
  var envelope = {
    kind: 'ploy-nan-photo',
    version: 1,
    phase: phase,
    channel: context.channel,
    requestId: context.requestId,
    result: data
  };
  var safe = JSON.stringify(envelope).replace(/[<>&\u2028\u2029]/g, function(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>PLOY &amp; NAN photo response</title></head><body>' +
    '<script>window.top.postMessage(' + safe + ',' + JSON.stringify(context.origin) + ');</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function verifyHeaders_(sheet) {
  var actual = sheet.getRange(1, 1, 1, PHOTO_HEADERS.length).getValues()[0];
  if (!PHOTO_HEADERS.every(function(v, i) { return actual[i] === v; })) throw new Error('Unexpected sheet headers');
}

function text_(value, max) {
  if (typeof value !== 'string') throw new Error('Invalid text');
  var trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(trimmed)) throw new Error('Invalid text');
  return /^[=+@\-]/.test(trimmed) ? "'" + trimmed : trimmed;
}

function equal_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var difference = 0;
  for (var i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function originAllowed_(origin) { return PHOTO_ALLOWED_ORIGINS.indexOf(origin) >= 0; }
function object_(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function uuid_(value) { return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
