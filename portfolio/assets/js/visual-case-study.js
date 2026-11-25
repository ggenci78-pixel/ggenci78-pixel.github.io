import { visualCases } from './visual-case-data.js';

export function visualCaseStudy(p, next, helpers) {
  const {esc, icon, imageButton, mediaDimensions} = helpers;
  const brief = visualCases[p.id];
  const number = i => String(i+1).padStart(2,'0');
  const figures = c => c.figures.map(f => {
    const width = mediaDimensions[f.file]?.width || 600;
    return `<figure class="${width >= 1100 ? 'case-figure-wide' : ''}" style="--figure-width:${width}px">${imageButton(f.file,`${p.title} · ${f.caption}`)}<figcaption>${esc(f.caption)}</figcaption></figure>`;
  }).join('');
  return `<article class="project-page visual-case-study"><div class="view-inner case-inner">
    <header class="case-heading"><p class="eyebrow">VISUAL DESIGN / ${esc(p.en)}</p>
      <div class="case-title-row"><h1 tabindex="-1">${esc(p.title)}</h1><span>${esc(p.type)}</span></div>
      <p class="case-thesis">${esc(brief.thesis)}</p>
    </header>
    <div class="case-opening">
      <div class="case-brief"><span class="tiny">THE BRIEF</span><h2>背景与目标</h2><p>${esc(brief.background)}</p><p>${esc(brief.task)}</p>
        <dl><div><dt>设计重点</dt><dd>${esc(brief.strength)}</dd></div><div><dt>项目属性</dt><dd>${esc(p.status)}</dd></div></dl>
      </div>
      <figure class="case-key-art">${imageButton(p.cover,`${p.title} · 项目主画面`,true)}<figcaption>${esc(p.subtitle)}</figcaption></figure>
    </div>
    ${brief.metrics ? `<section class="case-highlights" aria-label="项目要点">${brief.metrics.map(([value,label,note])=>`<div><strong>${esc(value)}</strong><h2>${esc(label)}</h2><p>${esc(note)}</p></div>`).join('')}</section>` : ''}
    ${brief.population ? `<section class="case-population" aria-label="校园人群背景">
      <div class="population-bars"><div style="--population:30000"><span>全日制在校生</span><strong>30,000 余人</strong></div><div style="--population:2700"><span>教职工</span><strong>2,700 余人</strong></div></div>
      <p>校级规模背景，不代表本项目实际覆盖或实测服务人数；也不回推设计当年的校园人口。<a href="${esc(brief.population.url)}" target="_blank" rel="noopener">来源：上理官网 · 数据截至 2026 年 9 月 ${icon('arrow-up-right')}</a></p>
    </section>` : ''}
    ${brief.flow ? `<section class="case-flow" aria-label="三级导视的信息逻辑">${brief.flow.map(([n,title,place,type])=>`<div><span class="tiny">${n} / ${esc(type)}</span><h2>${esc(title)}</h2><p>${esc(place)}</p></div>`).join('')}</section>` : ''}
    <nav class="chapter-nav case-chapter-nav" aria-label="项目章节">${p.chapters.map((c,i)=>`<a href="#chapter-${i}" data-chapter="chapter-${i}"><small>${number(i)}</small>${esc(c.title)}</a>`).join('')}</nav>
    ${p.chapters.map((c,i)=>`<section class="case-chapter" id="chapter-${i}"><header><span class="tiny">${number(i)} / DESIGN DEVELOPMENT</span><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p></header><div class="case-figures">${figures(c)}</div></section>`).join('')}
    <section class="case-evidence"><span class="tiny">EVIDENCE & CONTEXT</span><h2>作品与记录</h2><p>${esc(brief.evidence)}</p><p class="quality-note">${esc(p.qualityNote)}</p>
    ${p.id==='fuxing-island' ? `<details class="case-original"><summary>完整设计展板</summary>${imageButton('fuxing-island/source-02.jpeg','量子岛链 · 原始完整展板')}</details>` : ''}</section>
    <a class="next-project" href="#project/${next.id}"><div><span class="tiny">NEXT / VISUAL DESIGN</span><h2>${esc(next.title)}</h2></div><span class="round-arrow">${icon('arrow-right')}</span></a>
    <a class="case-return" href="#collection/visual">${icon('arrow-left')}返回视觉设计</a>
  </div></article>`;
}
