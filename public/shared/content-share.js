(function (global) {
  'use strict';
  var DEFAULT_SITE = 'https://ljs0336-koco.github.io/Seung_AI_Labs/';
  var FONT = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

  function validId(id) { return typeof id === 'string' && /^n-[a-z0-9-]{1,64}$/.test(id); }
  function isLocalHost(host) {
    host = host.toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127\./.test(host) || host === '0.0.0.0';
  }
  function canonicalRoot(value) {
    try {
      var url = new URL(value || DEFAULT_SITE);
      if (!/^https?:$/.test(url.protocol) || isLocalHost(url.hostname) || url.username || url.password || url.search || url.hash) return DEFAULT_SITE;
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      return url.href;
    } catch (_) { return DEFAULT_SITE; }
  }
  function newsUrl(id, site) {
    if (!validId(id)) throw new Error('올바른 뉴스 ID가 아닙니다.');
    return new URL('share/news/' + id + '/', canonicalRoot(site)).href;
  }
  function shareText(item, site) {
    return [item.title, item.summary, '출처: ' + item.source + ' · ' + item.date, '원문: ' + item.url, '요약 페이지: ' + newsUrl(item.id, site)].join('\n\n');
  }
  function safeImageUrl(value, root, exportOnly) {
    if (!value || typeof value !== 'string') return null;
    try {
      var url = new URL(value, root);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
      if (exportOnly && url.origin !== new URL(root).origin) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function wrapText(context, value, width) {
    var output = [];
    String(value || '').split(/\r?\n/).forEach(function (paragraph) {
      if (!paragraph) { output.push(''); return; }
      var line = '';
      Array.from(paragraph).forEach(function (character) {
        if (line && context.measureText(line + character).width > width) { output.push(line.trimEnd()); line = character.trimStart(); }
        else line += character;
      });
      if (line) output.push(line.trimEnd());
    });
    return output.length ? output : [''];
  }
  function cardLayout(context, item, hasImage) {
    var textWidth = 904;
    context.font = '700 48px ' + FONT;
    var titleLines = wrapText(context, item.title, textWidth);
    context.font = '34px ' + FONT;
    var summaryLines = wrapText(context, item.summary, textWidth);
    context.font = '25px ' + FONT;
    var sourceLines = wrapText(context, '출처: ' + item.source + ' · ' + item.date, textWidth);
    context.font = '21px ' + FONT;
    var addressLines = wrapText(context, item.pageUrl || '', textWidth);
    var imageHeight = hasImage ? 460 : 0;
    var height = 160 + imageHeight + 74 + titleLines.length * 70 + 40 + summaryLines.length * 55 + 68 + sourceLines.length * 38 + 30 + addressLines.length * 31 + 80;
    if (height > 6000) throw new Error('이미지에 담기에는 글이 너무 깁니다. 제목이나 공유용 요약을 짧게 편집해 주세요.');
    return { width: 1080, height: Math.max(1080, height), titleLines: titleLines, summaryLines: summaryLines, sourceLines: sourceLines, addressLines: addressLines, imageHeight: imageHeight };
  }
  function drawCard(canvas, item, image) {
    var context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서는 이미지 만들기를 사용할 수 없습니다. 캡처 화면을 이용해 주세요.');
    var layout = cardLayout(context, item, !!image);
    canvas.width = layout.width;
    canvas.height = layout.height;
    context = canvas.getContext('2d');
    context.fillStyle = '#f4f0e5'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fffdf7'; context.fillRect(28, 28, canvas.width - 56, canvas.height - 56);
    context.fillStyle = '#294f40'; context.fillRect(28, 28, canvas.width - 56, 132);
    context.fillStyle = '#fffdf7'; context.font = '700 28px ' + FONT;
    context.fillText('SEUNG AI LABS', 88, 88);
    context.font = '22px ' + FONT; context.fillText('AI 교육 브리핑 · 뉴스 한 건', 88, 126);
    var y = 160;
    if (image) {
      context.fillStyle = '#e9e9dd'; context.fillRect(28, y, canvas.width - 56, layout.imageHeight);
      var sourceWidth = image.naturalWidth || image.width;
      var sourceHeight = image.naturalHeight || image.height;
      var ratio = Math.min((canvas.width - 56) / sourceWidth, layout.imageHeight / sourceHeight);
      var width = sourceWidth * ratio, height = sourceHeight * ratio;
      context.drawImage(image, (canvas.width - width) / 2, y + (layout.imageHeight - height) / 2, width, height);
      y += layout.imageHeight;
    }
    y += 74;
    context.fillStyle = '#233e35'; context.font = '700 48px ' + FONT;
    layout.titleLines.forEach(function (line) { context.fillText(line, 88, y); y += 70; });
    y += 40;
    context.font = '34px ' + FONT;
    layout.summaryLines.forEach(function (line) { context.fillText(line, 88, y); y += 55; });
    y += 25;
    context.strokeStyle = '#d8ddce'; context.lineWidth = 2; context.beginPath(); context.moveTo(88, y); context.lineTo(992, y); context.stroke();
    y += 43;
    context.fillStyle = '#647366'; context.font = '25px ' + FONT;
    layout.sourceLines.forEach(function (line) { context.fillText(line, 88, y); y += 38; });
    y += 30;
    context.font = '21px ' + FONT;
    layout.addressLines.forEach(function (line) { context.fillText(line, 88, y); y += 31; });
    return layout;
  }

  // Drawing and address functions are exposed independently for deterministic tests.
  global.SeungShareCore = Object.freeze({ validId: validId, canonicalRoot: canonicalRoot, newsUrl: newsUrl, shareText: shareText, safeImageUrl: safeImageUrl, wrapText: wrapText, cardLayout: cardLayout, drawCard: drawCard });
  if (typeof document === 'undefined') return;

  var ownScript = document.currentScript || Array.from(document.scripts).find(function (script) { return /\/content-share\.js(?:\?|$)/.test(script.src); });
  var assetRoot = new URL('../', ownScript ? ownScript.src : document.baseURI);
  var siteMeta = document.querySelector('meta[name="seung-share-site-url"]');
  var siteRoot = canonicalRoot(siteMeta ? siteMeta.content : ownScript && ownScript.dataset.siteUrl);
  var manifestPromise;
  var dialog;
  var returnFocus;
  var openingVersion = 0;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function getItems() {
    if (!manifestPromise) {
      manifestPromise = fetch(new URL('content/news.json', assetRoot).href, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('뉴스 목록을 불러오지 못했습니다.');
        return response.json();
      }).then(function (manifest) {
        if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.items)) throw new Error('뉴스 목록 형식이 올바르지 않습니다.');
        return manifest.items;
      }).catch(function (error) { manifestPromise = null; throw error; });
    }
    return manifestPromise;
  }
  function pictureCard(item, headingId) {
    var article = element('article', 'cs-card');
    article.setAttribute('aria-labelledby', headingId);
    article.append(element('p', 'cs-brand', 'SEUNG AI LABS · AI 교육 브리핑'));
    var imageUrl = safeImageUrl(item.image, assetRoot, false);
    if (imageUrl) {
      var image = element('img', 'cs-article-image');
      image.alt = ''; image.referrerPolicy = 'no-referrer'; image.src = imageUrl;
      image.addEventListener('error', function () { image.remove(); }, { once: true });
      article.append(image);
    }
    var body = element('div', 'cs-card-body');
    body.append(element('p', 'cs-meta', item.source + ' · ' + item.date));
    var title = element('h2', '', item.title); title.id = headingId; body.append(title);
    body.append(element('p', 'cs-summary', item.summary));
    body.append(element('p', 'cs-source', '출처: ' + item.source + ' · ' + item.date));
    var originalUrl = safeImageUrl(item.url, assetRoot, false);
    if (originalUrl) { var original = element('a', 'cs-original', '원문 보기 ↗'); original.href = originalUrl; original.target = '_blank'; original.rel = 'noopener noreferrer'; body.append(original); }
    body.append(element('p', 'cs-page-address', newsUrl(item.id, siteRoot)));
    article.append(body); return article;
  }
  function clipboard(text, status, container) {
    var operation = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('unavailable'));
    return operation.then(function () { status.textContent = '복사했습니다.'; }).catch(function () {
      status.textContent = '아래 내용을 선택해 직접 복사해 주세요.';
      var previous = container.querySelector('.cs-fallback-copy'); if (previous) previous.remove();
      var input = element('textarea', 'cs-fallback-copy'); input.readOnly = true; input.value = text; input.setAttribute('aria-label', '직접 복사할 공유 내용'); container.append(input); input.focus(); input.select();
    });
  }
  function loadExportImage(item) {
    var url = safeImageUrl(item.exportImage, assetRoot, true);
    if (!url) return Promise.resolve(null);
    // Only same-origin prepared assets are fetched. Redirects to remote pictures are rejected.
    return fetch(url, { mode: 'same-origin', credentials: 'same-origin', redirect: 'error' }).then(function (response) {
      if (!response.ok || !/^image\//.test(response.headers.get('content-type') || '')) throw new Error('준비된 이미지 없음');
      return response.blob();
    }).then(function (blob) {
      if (blob.size > 10 * 1024 * 1024) throw new Error('이미지 크기 초과');
      return new Promise(function (resolve, reject) {
        var address = URL.createObjectURL(blob), image = new Image();
        image.onload = function () { resolve({ image: image, cleanup: function () { URL.revokeObjectURL(address); } }); };
        image.onerror = function () { URL.revokeObjectURL(address); reject(new Error('이미지 읽기 실패')); };
        image.src = address;
      });
    }).catch(function () { return null; });
  }
  function canvasBlob(canvas) {
    return new Promise(function (resolve, reject) {
      try { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('PNG를 만들지 못했습니다.')); }, 'image/png'); }
      catch (error) { reject(error); }
    });
  }
  function createControls(item, host) {
    var actions = element('div', 'cs-actions');
    var status = element('p', 'cs-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var isPreview = location.origin !== new URL(siteRoot).origin || !location.pathname.startsWith(new URL(siteRoot).pathname);
    if (isPreview) status.textContent = '로컬 미리보기입니다. 복사되는 링크는 실제 게시 후 사용할 포털 주소입니다.';
    function button(label, handler) { var node = element('button', 'cs-action', label); node.type = 'button'; node.addEventListener('click', handler); actions.append(node); return node; }
    button('요약 페이지 링크 복사', function () { clipboard(newsUrl(item.id, siteRoot), status, host); });
    button('글과 링크 복사', function () { clipboard(shareText(item, siteRoot), status, host); });
    var capture = element('a', 'cs-action', '캡처 화면');
    capture.href = new URL('share/news/' + item.id + '/?capture=1', assetRoot).href;
    capture.target = '_blank'; capture.rel = 'noopener noreferrer'; actions.append(capture);
    var save = button('PNG 준비 중…', function () {
      preview.open = true;
      save.disabled = true;
      canvasBlob(canvas).then(function (blob) {
        var address = URL.createObjectURL(blob), link = element('a');
        link.href = address; link.download = 'seung-news-' + item.id + '.png'; host.append(link); link.click(); link.remove();
        global.setTimeout(function () { URL.revokeObjectURL(address); }, 30000);
        status.textContent = 'PNG 저장을 요청했습니다. 이미지에는 클릭 가능한 링크가 없으므로 글과 링크도 함께 복사할 수 있습니다.';
      }).catch(function () { status.textContent = 'PNG를 저장하지 못했습니다. 캡처 화면을 이용해 주세요.'; }).finally(function () { save.disabled = false; });
    });
    save.disabled = true;
    if (typeof navigator.share === 'function') {
      button('기기에서 공유', function () {
        navigator.share({ title: item.title, text: item.summary + '\n출처: ' + item.source + ' · ' + item.date + '\n원문: ' + item.url, url: newsUrl(item.id, siteRoot) }).then(function () {
          status.textContent = '기기 공유 창에서 돌아왔습니다. 전달 여부는 선택한 앱에서 확인하세요.';
        }).catch(function (error) { if (error.name !== 'AbortError') status.textContent = '기기 공유를 열지 못했습니다. 링크 복사를 이용해 주세요.'; });
      });
    }
    var preview = element('details', 'cs-export');
    preview.append(element('summary', 'cs-export-title', '저장할 이미지 미리보기'));
    var help = element('p', 'cs-export-help', '공유용 사진이 준비되지 않은 경우 제목·요약·출처로 만든 카드를 저장합니다.');
    var canvas = element('canvas'); canvas.setAttribute('aria-label', 'PNG로 저장할 뉴스 카드'); canvas.setAttribute('role', 'img');
    preview.append(help, canvas); host.append(actions, status, preview);
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([fontsReady, loadExportImage(item)]).then(function (results) {
      var loaded = results[1];
      try {
        drawCard(canvas, Object.assign({}, item, { pageUrl: newsUrl(item.id, siteRoot) }), loaded && loaded.image);
        help.textContent = loaded ? '이 미리보기와 같은 이미지가 PNG로 저장됩니다.' : '공유용 사진 없이 제목·요약·출처로 만든 카드입니다. 이 모습 그대로 PNG로 저장됩니다.';
        save.textContent = 'PNG 저장'; save.disabled = false;
      } catch (error) { help.textContent = error.message; canvas.hidden = true; save.textContent = 'PNG 저장 불가'; status.textContent = error.message; }
      finally { if (loaded) loaded.cleanup(); }
    });
  }
  function getDialog() {
    if (dialog) return dialog;
    dialog = element('dialog', 'cs-dialog');
    dialog.setAttribute('aria-labelledby', 'cs-dialog-label');
    dialog.addEventListener('close', function () { if (returnFocus && returnFocus.isConnected) returnFocus.focus(); });
    dialog.addEventListener('cancel', function () { /* Native Escape handling closes the dialog and restores focus. */ });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) { var box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && typeof dialog.showModal !== 'function') { event.preventDefault(); dialog.removeAttribute('open'); if (returnFocus) returnFocus.focus(); }
      if (event.key !== 'Tab') return;
      var focusable = Array.from(dialog.querySelectorAll('a[href],button:not([disabled]),textarea,summary')).filter(function (node) { return node.getClientRects().length && !node.closest('details:not([open]) :not(summary)'); });
      if (!focusable.length) { event.preventDefault(); return; }
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    document.body.append(dialog); return dialog;
  }
  function showInDialog(item, previous) {
    var modal = getDialog(); returnFocus = previous || document.activeElement; modal.replaceChildren();
    var inner = element('div', 'cs-dialog-inner'), top = element('div', 'cs-dialog-top');
    var label = element('p', 'cs-dialog-label', '뉴스 한 건 공유'); label.id = 'cs-dialog-label';
    var close = element('button', 'cs-close', '닫기'); close.type = 'button'; close.addEventListener('click', function () { if (typeof modal.close === 'function') modal.close(); else { modal.removeAttribute('open'); if (returnFocus) returnFocus.focus(); } });
    top.append(label, close); inner.append(top, pictureCard(item, 'cs-dialog-title'));
    var controls = element('div'); inner.append(controls); createControls(item, controls); modal.append(inner);
    if (!modal.open) { if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', ''); }
    modal.scrollTop = 0; close.focus(); return modal;
  }
  function reportOpenError(error, trigger) {
    var old = document.querySelector('.cs-open-error'); if (old) old.remove();
    var message = element('p', 'cs-status cs-open-error', error.message); message.setAttribute('role', 'alert');
    if (trigger && trigger.parentNode) trigger.parentNode.insertBefore(message, trigger.nextSibling); else document.body.append(message);
  }
  function open(id, trigger) {
    if (!validId(id)) return Promise.reject(new Error('올바른 뉴스 ID가 아닙니다.'));
    var version = ++openingVersion;
    return getItems().then(function (items) {
      var item = items.find(function (candidate) { return candidate.id === id; });
      if (!item) throw new Error('이 뉴스의 공유 내용을 찾지 못했습니다.');
      if (version === openingVersion) return showInDialog(item, trigger);
    });
  }
  global.SeungShare = Object.freeze({ open: open });
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-share-id]');
    if (!trigger || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(trigger.dataset.shareId, trigger).catch(function (error) { reportOpenError(error, trigger); });
  });
  function initializePage() {
    var main = document.querySelector('[data-share-page-id]');
    if (!main) return;
    if (new URLSearchParams(location.search).get('capture') === '1') { document.body.classList.add('cs-capture'); return; }
    var record = document.getElementById('seung-share-record');
    try {
      var item = JSON.parse(record.textContent);
      if (!validId(item.id) || item.id !== main.dataset.sharePageId) throw new Error('공유 자료를 확인하지 못했습니다.');
      createControls(item, main.querySelector('.cs-page-controls'));
    } catch (error) { reportOpenError(error); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage, { once: true }); else initializePage();
})(globalThis);
