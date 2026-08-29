/* 嵌入式八股文知识库 V2 主逻辑
 * 功能：文章渲染 / 右侧TOC / 深色模式 / 全文搜索UI /
 *       学习进度(掌握度) / 收藏 / 错题本 / 随机面试
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const MS_SYMBOLS = ['○', '◐', '●', '★'];           // 未掌握/已理解/已掌握/熟练
  const MS_TITLES = ['未掌握', '已理解', '已掌握', '熟练'];
  const STATE_KEY = 'v2state';

  const content = $('content'), meta = $('meta'), crumb = $('crumb');
  const nav = $('nav'), tocList = $('tocList'), tocAside = $('tocAside');

  let MANIFEST = [];
  let currentArt = null;      // 当前文章 manifest 项
  let currentView = '';       // article | favorites | wrong
  let qHeadings = [];         // 当前文章的题目 [{key, h}]
  const articleCache = {};    // id -> html

  /* ---------------- 状态存储 ---------------- */
  let state = { m: {}, f: {}, meta: {} };
  try { state = Object.assign(state, JSON.parse(localStorage[STATE_KEY] || '{}')); } catch (e) {}
  function persist() {
    try { localStorage[STATE_KEY] = JSON.stringify(state); } catch (e) {}
  }
  function cleanTitle(t) {
    return t.replace(/^[#\s◆●○★▪️·—-]+/u, '').trim();
  }

  /* ---------------- file:// 提示 ---------------- */
  if (location.protocol === 'file:') {
    const w = document.createElement('div');
    w.className = 'file-warn';
    w.innerHTML = '⚠️ 当前以 <code>file://</code> 直接打开，浏览器会拦截文章加载。' +
      '请在本目录运行 <code>npx serve</code> 或 <code>python -m http.server</code> 后访问，' +
      '部署到 GitHub Pages 后无此问题。';
    meta.parentNode.insertBefore(w, meta);
  }

  /* ---------------- 侧栏导航 ---------------- */
  function buildNav() {
    nav.innerHTML = '';
    MANIFEST.forEach((a, i) => {
      const li = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(a.num).padStart(2, '0');
      li.appendChild(num);
      li.appendChild(document.createTextNode(a.title));
      li.addEventListener('click', () => { location.hash = '#' + a.id; });
      nav.appendChild(li);
      a._li = li;
    });
  }

  /* ---------------- 文章渲染 ---------------- */
  async function renderArticle(a, hid) {
    currentArt = a; currentView = 'article';
    qHeadings = [];
    if (!(a.id in articleCache)) {
      try {
        articleCache[a.id] = await (await fetch('articles/' + a.file)).text();
      } catch (e) {
        content.innerHTML = '<div class="file-warn">文章加载失败：' + e.message + '</div>';
        return;
      }
    }
    content.innerHTML = articleCache[a.id];

    // 题目工具条 + 本章进度
    injectQTools(a);
    buildArtProgress(a);

    // meta 行：标题 + 原文链接
    meta.innerHTML = '';
    const b = document.createElement('b'); b.textContent = a.title;
    meta.appendChild(b);
    meta.appendChild(document.createTextNode(' · '));
    const src = document.createElement('a');
    src.href = a.source; src.target = '_blank'; src.rel = 'noopener';
    src.textContent = '查看原文 ↗';
    meta.appendChild(src);

    crumb.textContent = a.id;
    document.title = a.title + ' · 嵌入式八股文知识库';
    MANIFEST.forEach(x => x._li && x._li.classList.toggle('active', x === a));
    $('prevBtn').disabled = a.num === 0;
    $('nextBtn').disabled = a.num === MANIFEST.length - 1;

    buildToc();
    if (hid) scrollToHeading(hid, false);
    else window.scrollTo(0, 0);
    $('sidebar').classList.remove('open');
    tocAside.classList.remove('open');
  }

  /* ---------------- 题目掌握度 ---------------- */
  function injectQTools(a) {
    const heads = content.querySelectorAll('h2[id],h3[id],h4[id]');
    heads.forEach(h => {
      const t = cleanTitle(h.textContent);
      if (!/^Q\d+/.test(t)) return;
      const key = a.id + '~' + h.id;
      if (!state.meta[key]) state.meta[key] = { art: a.id, hid: h.id, title: t };
      qHeadings.push({ key, h });

      const tools = document.createElement('div');
      tools.className = 'q-tools';

      const label = document.createElement('span');
      label.className = 'qt-label';
      label.textContent = '掌握度：';
      tools.appendChild(label);

      MS_SYMBOLS.forEach((sym, lv) => {
        const btn = document.createElement('button');
        btn.className = 'qt m' + lv;
        btn.textContent = sym;
        btn.title = MS_TITLES[lv] + '（再次点击取消）';
        btn.addEventListener('click', () => {
          if (state.m[key] === lv) delete state.m[key];
          else state.m[key] = lv;
          persist();
          refreshQState();
          updateProgressUI();
        });
        btn._lv = lv;
        tools.appendChild(btn);
      });

      const fav = document.createElement('button');
      fav.className = 'qt fav';
      fav.textContent = '☆ 收藏';
      fav.title = '收藏本题';
      fav.addEventListener('click', () => {
        state.f[key] = !state.f[key];
        if (!state.f[key]) delete state.f[key];
        persist();
        refreshQState();
      });
      tools.appendChild(fav);

      h.after(tools);
    });
    refreshQState();
  }

  function refreshQState() {
    qHeadings.forEach(({ key, h }) => {
      const lv = state.m[key];
      h.classList.add('qs');
      h.dataset.ms = lv === undefined ? '' : MS_SYMBOLS[lv];
      const tools = h.nextElementSibling;
      if (tools && tools.classList.contains('q-tools')) {
        tools.querySelectorAll('.qt:not(.fav)').forEach(btn => {
          btn.classList.toggle('on', btn._lv === lv);
        });
        const fav = tools.querySelector('.fav');
        fav.classList.toggle('on', !!state.f[key]);
        fav.textContent = state.f[key] ? '★ 已收藏' : '☆ 收藏';
      }
    });
  }

  /* ---------------- 进度条 ---------------- */
  function buildArtProgress(a) {
    const old = content.querySelector('.art-progress');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'art-progress';
    const txt = document.createElement('span');
    const bar = document.createElement('div');
    bar.className = 'op-bar';
    const fill = document.createElement('div');
    fill.className = 'op-fill';
    bar.appendChild(fill);
    box.appendChild(txt); box.appendChild(bar);
    content.insertBefore(box, content.firstChild);
    box._txt = txt; box._fill = fill;
    updateProgressUI();
  }

  function updateProgressUI() {
    // 本章
    if (currentView === 'article' && currentArt && qHeadings.length) {
      const total = qHeadings.length;
      let got = 0;
      qHeadings.forEach(({ key }) => { if (state.m[key] >= 2) got++; });
      const box = content.querySelector('.art-progress');
      if (box) {
        box._txt.textContent = '本章已掌握 ' + got + ' / ' + total;
        box._fill.style.width = (total ? got / total * 100 : 0) + '%';
      }
    }
    // 全部（需要索引提供题目总数）
    let tTotal = 0;
    MANIFEST.forEach(a => { tTotal += KBIndex.qTotals[a.id] || 0; });
    let tGot = 0;
    Object.keys(state.m).forEach(k => {
      if (state.m[k] >= 2) {
        const art = k.split('~')[0];
        if (KBIndex.qTotals[art]) tGot++;
      }
    });
    $('opNum').textContent = tGot + ' / ' + tTotal;
    $('opFill').style.width = (tTotal ? tGot / tTotal * 100 : 0) + '%';

    // 每篇文章
    MANIFEST.forEach(a => {
      const qs = KBIndex.qTotals[a.id];
      if (!qs || !a._li) return;
      let got = 0;
      Object.keys(state.m).forEach(k => {
        if (k.startsWith(a.id + '~') && state.m[k] >= 2) got++;
      });
      let prog = a._li.querySelector('.prog');
      if (!prog) {
        prog = document.createElement('span');
        prog.className = 'prog';
        const bar = document.createElement('div');
        bar.className = 'pbar';
        const fill = document.createElement('div');
        fill.className = 'pfill';
        bar.appendChild(fill);
        a._li.appendChild(bar);
        a._li._pfill = fill;
        a._li.appendChild(prog);
        a._li._prog = prog;
      }
      prog.textContent = got + '/' + qs;
      a._li._pfill.style.width = (got / qs * 100) + '%';
    });
  }

  KBIndex.whenReady(updateProgressUI);

  /* ---------------- 收藏本 / 错题本 ---------------- */
  function renderListView(kind) {
    currentView = kind; currentArt = null; qHeadings = [];
    const isFav = kind === 'favorites';
    content.innerHTML = '';
    meta.innerHTML = '';
    crumb.textContent = isFav ? '收藏本' : '错题本';
    document.title = (isFav ? '⭐ 收藏本' : '❌ 错题本') + ' · 嵌入式八股文知识库';
    MANIFEST.forEach(x => x._li && x._li.classList.remove('active'));
    $('prevBtn').disabled = true; $('nextBtn').disabled = true;

    const head = document.createElement('div');
    head.className = 'list-head';
    const h2 = document.createElement('h2');
    h2.textContent = isFav ? '⭐ 我的收藏' : '❌ 未掌握（错题本）';
    head.appendChild(h2);
    content.appendChild(head);

    // 收集条目
    const byArt = {};
    Object.keys(state.meta).forEach(key => {
      const isF = !!state.f[key], lv = state.m[key];
      const hit = isFav ? isF : lv === 0;
      if (!hit) return;
      const m = state.meta[key];
      (byArt[m.art] = byArt[m.art] || []).push({ key, ...m, lv });
    });
    const arts = Object.keys(byArt);
    if (!arts.length) {
      const p = document.createElement('div');
      p.className = 'list-empty';
      p.textContent = isFav
        ? '还没有收藏。在题目下方的「☆ 收藏」按钮可以把重点题收进这里。'
        : '太棒了，暂无标记为「○ 未掌握」的题目。在题目下方点击 ○ 可将其加入错题本。';
      content.appendChild(p);
      buildToc();
      return;
    }
    arts.sort((x, y) => {
      const nx = MANIFEST.findIndex(a => a.id === x);
      const ny = MANIFEST.findIndex(a => a.id === y);
      return nx - ny;
    });
    arts.forEach(artId => {
      const a = MANIFEST.find(v => v.id === artId);
      const h3 = document.createElement('h3');
      h3.className = 'list-art';
      h3.textContent = (a ? a.title : artId) + '（' + byArt[artId].length + ' 题）';
      content.appendChild(h3);
      byArt[artId].forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const ms = document.createElement('span');
        ms.className = 'ms';
        ms.textContent = item.lv === undefined ? '⭐' : MS_SYMBOLS[item.lv];
        const t = document.createElement('span');
        t.textContent = item.title;
        div.appendChild(ms); div.appendChild(t);
        div.addEventListener('click', () => {
          location.hash = '#' + artId + '~' + item.hid;
        });
        content.appendChild(div);
      });
    });
    buildToc();
    window.scrollTo(0, 0);
  }

  /* ---------------- 右侧 TOC（沿用原逻辑） ---------------- */
  let tocLinks = [], headingEls = [];
  function buildToc() {
    tocList.innerHTML = '';
    tocLinks = [];
    headingEls = [...content.querySelectorAll('h1[id],h2[id],h3[id],h4[id]')];
    if (!headingEls.length) {
      tocList.innerHTML = '<div class="toc-empty">本篇无目录</div>';
      return;
    }
    headingEls.forEach(h => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/^[#\s]+/, '');
      a.title = a.textContent;
      const depth = parseInt(h.tagName[1]);
      if (depth >= 3) a.classList.add('d' + Math.min(depth, 4));
      a.addEventListener('click', e => {
        e.preventDefault();
        scrollToHeading(h.id, true);
        history.replaceState(null, '', location.hash.split('~')[0] + (currentArt ? '~' + h.id : ''));
        if (window.innerWidth <= 1200) tocAside.classList.remove('open');
      });
      li.appendChild(a);
      tocList.appendChild(li);
      tocLinks.push(a);
    });
  }

  function scrollToHeading(hid, flash) {
    const el = content.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(hid) : hid));
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - 18;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    window.scrollTo(0, top);
    if (flash) {
      el.classList.remove('flash-target');
      void el.offsetWidth; // 重启动画
      el.classList.add('flash-target');
      setTimeout(() => el.classList.remove('flash-target'), 2000);
    }
  }

  // 滚动高亮 TOC
  let scrollTick = false;
  window.addEventListener('scroll', () => {
    if (scrollTick || !headingEls.length) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      let active = 0;
      const y = window.scrollY + 90;
      for (let i = 0; i < headingEls.length; i++) {
        if (headingEls[i].offsetTop <= y) active = i; else break;
      }
      tocLinks.forEach((a, i) => a.classList.toggle('active', i === active));
      // 只滚动 TOC 容器自身，绝不调用 scrollIntoView（会连带滚动主窗口造成"回拉"）
      const cur = tocLinks[active];
      if (cur) {
        const li = cur.parentElement;
        const box = tocAside.getBoundingClientRect();
        const r = li.getBoundingClientRect();
        if (r.top < box.top + 8) tocAside.scrollTop += r.top - box.top - 40;
        else if (r.bottom > box.bottom - 8) tocAside.scrollTop += r.bottom - box.bottom + 40;
      }
    });
  });

  /* ---------------- 全文搜索 UI ---------------- */
  const searchInput = $('search');
  const searchResults = $('searchResults');
  let searchTimer = null;

  function runSearch() {
    const q = searchInput.value.trim();
    if (!q) { searchResults.hidden = true; searchResults.innerHTML = ''; return; }
    if (!KBIndex.ready) {
      searchResults.hidden = false;
      searchResults.innerHTML = '<div class="sr-empty">⏳ 全文索引构建中，马上就好…</div>';
      KBIndex.whenReady(runSearch);
      return;
    }
    const res = KBIndex.query(q, 30);
    searchResults.hidden = false;
    searchResults.innerHTML = '';
    if (!res.length) {
      searchResults.innerHTML = '<div class="sr-empty">没有找到「' + q.replace(/[<>&]/g, '') + '」相关内容</div>';
      return;
    }
    res.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'sr-item' + (i === 0 ? ' sel' : '');
      const art = document.createElement('div');
      art.className = 'sr-art';
      art.textContent = r.artTitle;
      const t = document.createElement('div');
      t.className = 'sr-title';
      t.innerHTML = r.hid ? r.title : '📑 ' + r.title;
      const s = document.createElement('div');
      s.className = 'sr-snippet';
      s.innerHTML = r.snippet;
      item.appendChild(art); item.appendChild(t); item.appendChild(s);
      item.addEventListener('click', () => {
        location.hash = '#' + r.art + (r.hid ? '~' + r.hid : '');
        closeSearch();
      });
      searchResults.appendChild(item);
    });
  }

  function closeSearch() {
    searchResults.hidden = true;
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 180);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); searchInput.blur(); }
    if (e.key === 'Enter') {
      const first = searchResults.querySelector('.sr-item');
      if (first) first.click();
    }
  });
  document.addEventListener('click', e => {
    if (!searchResults.hidden && !searchResults.contains(e.target) && e.target !== searchInput) closeSearch();
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------- 随机面试 ---------------- */
  const quizOverlay = $('quizOverlay'), quizQ = $('quizQ'), quizA = $('quizA');
  const quizAnswer = $('quizAnswer'), quizNext = $('quizNext'), quizOpen = $('quizOpen');
  const quizScope = $('quizScope');
  let quizCur = null; // {art, hid, title}

  function openQuiz() {
    quizOverlay.hidden = false;
    if (!quizScope.options.length) {
      const optAll = document.createElement('option');
      optAll.value = 'all'; optAll.textContent = '全部章节';
      quizScope.appendChild(optAll);
      MANIFEST.forEach(a => {
        const o = document.createElement('option');
        o.value = a.id; o.textContent = a.title;
        quizScope.appendChild(o);
      });
    }
    if (!KBIndex.ready) {
      quizQ.textContent = '⏳ 正在构建题目索引（首次打开稍慢）…';
      quizAnswer.disabled = quizNext.disabled = quizOpen.disabled = true;
      KBIndex.whenReady(() => { if (!quizOverlay.hidden) nextQuiz(); });
    } else if (!quizCur) {
      nextQuiz();
    }
  }
  function closeQuiz() { quizOverlay.hidden = true; }

  function nextQuiz() {
    const pool = KBIndex.ready
      ? KBIndex.questions.filter(q => quizScope.value === 'all' || q.art === quizScope.value)
      : [];
    if (!pool.length) {
      quizQ.textContent = '该范围暂无题目';
      quizCur = null;
      quizAnswer.disabled = quizOpen.disabled = true;
      return;
    }
    quizCur = pool[Math.floor(Math.random() * pool.length)];
    quizQ.textContent = quizCur.title;
    quizA.hidden = true; quizA.innerHTML = '';
    quizAnswer.disabled = false; quizOpen.disabled = false;
    quizNext.disabled = false;
    quizAnswer.textContent = '👀 显示答案';
  }

  async function showQuizAnswer() {
    if (!quizCur) return;
    if (!quizA.hidden) { // 再点一次收起
      quizA.hidden = true;
      quizAnswer.textContent = '👀 显示答案';
      return;
    }
    quizAnswer.textContent = '⏳ 加载中…';
    const a = MANIFEST.find(v => v.id === quizCur.art);
    if (!(a.id in articleCache)) {
      articleCache[a.id] = await (await fetch('articles/' + a.file)).text();
    }
    const doc = new DOMParser().parseFromString(articleCache[a.id], 'text/html');
    const h = doc.getElementById(quizCur.hid);
    if (!h) { quizA.hidden = false; quizA.textContent = '未找到该题内容'; return; }
    const frag = document.createDocumentFragment();
    let node = h.cloneNode(true);
    frag.appendChild(node);
    node = h.nextElementSibling;
    while (node && !/^H[1-4]$/.test(node.tagName)) {
      frag.appendChild(node.cloneNode(true));
      node = node.nextElementSibling;
    }
    quizA.innerHTML = '';
    quizA.appendChild(frag);
    quizA.hidden = false;
    quizAnswer.textContent = '🙈 收起答案';
  }

  $('quizBtn').addEventListener('click', openQuiz);
  $('quizClose').addEventListener('click', closeQuiz);
  quizOverlay.addEventListener('click', e => { if (e.target === quizOverlay) closeQuiz(); });
  quizScope.addEventListener('change', nextQuiz);
  quizAnswer.addEventListener('click', showQuizAnswer);
  quizNext.addEventListener('click', nextQuiz);
  quizOpen.addEventListener('click', () => {
    if (!quizCur) return;
    closeQuiz();
    location.hash = '#' + quizCur.art + '~' + quizCur.hid;
  });

  /* ---------------- 主题 / 按钮 ---------------- */
  const themeBtn = $('themeBtn');
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    themeBtn.textContent = dark ? '☀️ 浅色' : '🌙 深色';
    try { localStorage.theme = dark ? 'dark' : 'light'; } catch (e) {}
  }
  themeBtn.addEventListener('click', () =>
    setTheme(document.documentElement.getAttribute('data-theme') !== 'dark'));
  try {
    const saved = localStorage.theme;
    setTheme(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {}

  $('topBtn').addEventListener('click', () => window.scrollTo(0, 0));

  /* 左右侧栏收起/展开（桌面端持久化；窄屏保持抽屉行为） */
  const layout = document.querySelector('.layout');
  function applySideUI() {
    try {
      if (localStorage.getItem('v2-hide-left') === '1') layout.classList.add('hide-left');
      if (localStorage.getItem('v2-hide-right') === '1') layout.classList.add('hide-right');
    } catch (e) {}
  }
  applySideUI();
  $('menuBtn').addEventListener('click', () => {
    if (window.innerWidth <= 860) { $('sidebar').classList.toggle('open'); return; }
    const off = layout.classList.toggle('hide-left');
    try { localStorage.setItem('v2-hide-left', off ? '1' : '0'); } catch (e) {}
  });
  $('tocBtn').addEventListener('click', () => {
    if (window.innerWidth <= 1200) { tocAside.classList.toggle('open'); return; }
    const off = layout.classList.toggle('hide-right');
    try { localStorage.setItem('v2-hide-right', off ? '1' : '0'); } catch (e) {}
  });
  $('tocFab').addEventListener('click', () => tocAside.classList.toggle('open'));
  $('favBtn').addEventListener('click', () => { location.hash = '#favorites'; });
  $('wrongBtn').addEventListener('click', () => { location.hash = '#wrong'; });
  $('prevBtn').addEventListener('click', () => {
    if (currentArt && currentArt.num > 0) location.hash = '#' + MANIFEST[currentArt.num - 1].id;
  });
  $('nextBtn').addEventListener('click', () => {
    if (currentArt && currentArt.num < MANIFEST.length - 1) location.hash = '#' + MANIFEST[currentArt.num + 1].id;
  });

  /* ---------------- 路由 ---------------- */
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    closeSearch();
    if (h === 'favorites') return renderListView('favorites');
    if (h === 'wrong') return renderListView('wrong');
    const tid = h.split('~');
    const a = MANIFEST.find(v => v.id === tid[0]);
    if (a) renderArticle(a, tid[1]);
    else if (MANIFEST.length) renderArticle(MANIFEST[0]);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- 启动 ---------------- */
  fetch('data/articles.json')
    .then(r => r.json())
    .then(list => {
      MANIFEST = list;
      buildNav();
      route();
      // 后台构建全文索引（搜索 / 进度 / 随机面试 共用）
      setTimeout(() => KBIndex.build(MANIFEST), 200);
    })
    .catch(e => {
      content.innerHTML = '<div class="file-warn">加载 data/articles.json 失败：' + e.message +
        '<br>如果直接双击打开了本文件，请先启动本地静态服务器。</div>';
    });
})();
