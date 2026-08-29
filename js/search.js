/* 全文搜索索引：懒加载全部文章 → 按 h1~h4 标题分块 → 倒不如说是「块级全文索引」
 * 同时产出：
 *   KBIndex.questions  所有题目（Q 开头标题）→ 随机面试 / 收藏 / 错题本数据源
 *   KBIndex.qTotals    每篇文章题目总数 → 侧栏进度条
 */
(function () {
  'use strict';

  const KBIndex = {
    ready: false,
    building: false,
    chunks: [],      // { art, artNum, artTitle, hid, level, title, text, low }
    questions: [],   // { art, hid, title }
    qTotals: {},     // art -> 题目数
    _waiters: [],
    whenReady(fn) {
      if (this.ready) fn();
      else this._waiters.push(fn);
    },
  };

  const QUESTION_RE = /^Q\d+/; // 标题去掉装饰符后以 Q数字 开头视为题目

  function cleanTitle(t) {
    return t.replace(/^[#\s◆●○★▪️·—-]+/u, '').trim();
  }

  function parseArticle(doc, meta) {
    const walker = [];
    // 先按块切：遇到 h1~h4[id] 开新块，其余元素文本归入当前块
    let cur = null;
    const flush = () => { if (cur) walker.push(cur); cur = null; };
    const newChunk = (h) => {
      flush();
      cur = {
        art: meta.id, artNum: meta.num, artTitle: meta.title,
        hid: h ? h.id : '', level: h ? +h.tagName[1] : 0,
        title: h ? cleanTitle(h.textContent) : meta.title,
        text: '',
      };
    };
    newChunk(null); // 文首（标题之前的引导内容）
    [...doc.body.children].forEach(el => {
      const m = /^H[1-4]$/.test(el.tagName) && el.id;
      if (m) newChunk(el);
      else cur.text += ' ' + el.textContent;
    });
    flush();

    walker.forEach(c => { c.low = (c.title + ' \n ' + c.text).toLowerCase(); });
    KBIndex.chunks.push(...walker);

    // 题目清单
    let n = 0;
    walker.forEach(c => {
      if (c.hid && QUESTION_RE.test(c.title)) {
        KBIndex.questions.push({ art: c.art, hid: c.hid, title: c.title });
        n++;
      }
    });
    if (n) KBIndex.qTotals[meta.id] = n;
  }

  KBIndex.build = async function (manifest) {
    if (KBIndex.building || KBIndex.ready) return;
    KBIndex.building = true;
    try {
      const texts = await Promise.all(
        manifest.map(a => fetch('articles/' + a.file).then(r => r.text()))
      );
      texts.forEach((html, i) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        parseArticle(doc, manifest[i]);
      });
      KBIndex.ready = true;
      KBIndex._waiters.splice(0).forEach(fn => fn());
    } catch (e) {
      console.error('索引构建失败', e);
    } finally {
      KBIndex.building = false;
    }
  };

  function esc(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function snippet(text, tokens) {
    const low = text.toLowerCase();
    let pos = -1;
    for (const t of tokens) {
      const p = low.indexOf(t);
      if (p !== -1 && (pos === -1 || p < pos)) pos = p;
    }
    if (pos === -1) pos = 0;
    const start = Math.max(0, pos - 50);
    const end = Math.min(text.length, pos + 120);
    let s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    s = esc(s);
    tokens.forEach(t => {
      if (!t) return;
      // 大小写不敏感高亮
      s = s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        m => '<mark>' + m + '</mark>');
    });
    return s;
  }

  // 返回 [{art, artTitle, hid, title, snippet, score}]
  KBIndex.query = function (q, limit) {
    limit = limit || 50;
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const out = [];
    for (const c of KBIndex.chunks) {
      let ok = true, score = 0;
      for (const t of tokens) {
        const inTitle = c.title.toLowerCase().includes(t);
        const inText = c.low.includes(t);
        if (!inTitle && !inText) { ok = false; break; }
        const hits = inText ? c.low.split(t).length - 1 : 0;
        score += (inTitle ? 30 : 0) + Math.min(hits, 10) * 2;
      }
      if (!ok) continue;
      score -= c.level * 0.1; // 同分时优先大标题
      out.push({
        art: c.art, artNum: c.artNum, artTitle: c.artTitle,
        hid: c.hid, title: c.title, score,
        snippet: snippet(c.text.trim() || c.title, tokens),
      });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit);
  };

  window.KBIndex = KBIndex;
})();
