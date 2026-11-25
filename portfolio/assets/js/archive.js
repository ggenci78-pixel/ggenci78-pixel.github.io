import { collections, projects, profile, projectCovers } from './archive-data.js';
import { createNameField } from './name-field.js';
import { mountCoverIndex, mountMediaIndex } from './cover-index.js';
import { mediaDimensions as importedMedia } from './imported-evidence.js';
import { boundaryMedia } from './model-study-data.js';
import { studyBrowser, studyMethod, studyDetail, studySelection } from './model-study.js';
import { studyVisuals, studyRadar } from './model-study-charts.js';
import { mountImageStack, stackCategoryName } from './image-stack.js';
import { visualWordMedia } from './visual-word-media.js';
import { visualCaseStudy } from './visual-case-study.js';

const view = document.querySelector('#view');
const intro = document.querySelector('#intro');
const footer = document.querySelector('.site-footer');
const dialog = document.querySelector('.lightbox');
const evidenceDialog = document.querySelector('.evidence-dialog');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const still = new URLSearchParams(location.search).has('still');
const mediaDimensions = { ...importedMedia, ...boundaryMedia, ...visualWordMedia };
const states = new Map();
let current = '', transition = null, ticket = 0, entering = false, lastZoom = null, lastStudyTrigger = null;
let unmountIndex = () => {}, unmountMedia = () => {}, unmountCases = () => {}, unmountGallery = () => {};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const asset = name => `assets/img/${name.split('/').map(encodeURIComponent).join('/')}`;
const colLink = c => c.id === 'about' ? '#about' : `#collection/${c.id}`;
const getState = id => {
  if (!states.has(id)) states.set(id, { filter: '全部', mode: 'gallery', scroll: 0, focus: null, selected: '' });
  return states.get(id);
};
const icons = () => window.lucide?.createIcons({ attrs: { 'stroke-width': 1.5 } });
const pending = '<span class="pending-pill">内容整理中</span>';
const image = (file, alt, eager = false) => `<img src="${asset(mediaDimensions[file]?.preview || file)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
const imageButton = (file, alt, eager = false) => `<button type="button" class="image-button ${mediaDimensions[file] ? 'native-image' : ''}" ${mediaDimensions[file] ? `style="--native-width:${mediaDimensions[file].width}px"` : ''} data-zoom="${esc(file)}" data-caption="${esc(alt)}" aria-label="放大查看：${esc(alt)}">${image(file, alt, eager)}</button>`;
const sectionLabel = (n, text) => `<div class="section-label"><span class="tiny">${n}</span><h2>${esc(text)}</h2></div>`;
const tabs = id => `<nav class="collection-tabs" aria-label="作品分类">${collections.map(c => `<a href="${colLink(c)}" ${c.id === id ? 'aria-current="page"' : ''}><span class="swatch" style="--tab:${c.color}"></span>${c.title}</a>`).join('')}</nav>`;

function archiveView() {
  return `<div class="view-inner archive-view">
    <div class="view-heading"><div><p class="eyebrow">SELECTED WORK / 2026</p><h1 tabindex="-1">作品档案<span class="heading-italic">Selected works.</span></h1></div><p>设计的不同切面，<br>收在这里。</p></div>
    <div class="file-cabinet">${collections.map(c => `<a class="folder" href="${colLink(c)}" style="--folder:${c.color}" aria-label="打开${c.title}文件夹">
      <span class="folder-back" aria-hidden="true"></span>
      <span class="folder-previews" aria-hidden="true">${(c.id === 'about' ? c.covers : projects.filter(p => p.collection === c.id).slice(0,3).map(p => projectCovers[p.id])).map(f => `<span class="folder-preview">${image(f, '', true)}</span>`).join('')}</span>
      <span class="folder-front"><span class="folder-index">${c.index}</span><span><span class="folder-title">${c.title}</span><span class="folder-en">${c.en}</span></span>
      <span class="folder-tags">${c.tags.map(t => `<span>${t}</span>`).join('')}</span><span class="folder-arrow">${icon('arrow-up-right')}</span></span>
    </a>`).join('')}</div>
    <div class="archive-bottom"><span>04 COLLECTIONS / AN ONGOING ARCHIVE</span><span>视觉 · 产品 · 系统</span></div>
  </div>`;
}

function coverIndexView(c, selected, types, state) {
  return `<section class="cover-index" style="--accent:${c.color}" data-stage="${state.stage === 'focus' ? 'focus' : 'index'}">
    <h1 class="sr-only" tabindex="-1">${c.title}</h1>
    <div class="cover-ticks" role="group" aria-label="封面索引">${selected.map((p,i) => `<button type="button" data-cover-tick="${i}" aria-label="选择封面：${esc(p.title)}" title="${esc(p.title)}"><span></span><small>${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div>
    <div class="cover-viewport" tabindex="0" aria-label="滑动选取作品封面"><div class="cover-track">${selected.map(p => `<div class="cover-item" data-key="${p.id}">
      <button type="button" class="cover-frame" data-cover-open data-title="${esc(p.title)}" aria-expanded="false" aria-label="展开封面：${esc(p.title)}" data-cover="${p.id}">${image(projectCovers[p.id], p.title, true)}</button>
      <div class="cover-item-caption"><span class="cover-item-number">${String(selected.indexOf(p)+1).padStart(2,'0')}</span><div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p><a class="cover-direct" href="#project/${p.id}" data-project="${p.id}" data-cover-info="${p.id}" aria-label="查看项目：${esc(p.title)}" hidden>查看项目${icon('arrow-up-right')}</a></div><small>${esc(p.type)}</small></div>
      <div class="cover-title ${(p.displayLines || [p.title]).some(line => line.length > 6) ? 'is-long' : ''}" aria-label="${esc(p.title)}" aria-hidden="true">${(p.displayLines || [p.title]).map(line => `<div class="cover-title-line">${[...line].map(char => `<span>${esc(char)}</span>`).join('')}</div>`).join('')}</div>
    </div>`).join('')}</div></div>
    <div class="cover-caption-index"><span class="tiny" data-cover-status aria-live="polite"></span>${selected.map(p => `<span data-cover-info="${p.id}">${p.title}</span>`).join('')}</div>
    <div class="cover-focus-info">${selected.map(p => `<div class="cover-project-info" data-cover-info="${p.id}">
      <div class="cover-focus-name"><span class="tiny">${esc(p.type)} / ${c.index}</span><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div>
      <a class="cover-explore" href="#project/${p.id}" data-project="${p.id}"><span>查看项目</span><span class="tiny">EXPLORE</span>${icon('arrow-down')}</a>
      <p>${p.description}</p>
    </div>`).join('')}</div>
    <div class="cover-bottom"><div class="cover-category"><span class="swatch" style="--tab:${c.color}"></span><span>${c.title}<small>${c.en}</small></span></div>
      <div class="cover-options"><select data-cover-filter aria-label="项目类型">${types.map(type => `<option ${type === state.filter ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select><button type="button" data-mode="grid" aria-label="网格视图" title="网格视图">${icon('layout-grid')}</button></div>
      <div class="cover-arrows"><button type="button" data-cover-prev aria-label="上一张封面" title="上一张封面">${icon('arrow-left')}</button><button type="button" data-cover-next aria-label="下一张封面" title="下一张封面">${icon('arrow-right')}</button></div>
    </div>
  </section>`;
}

function collectionView(c) {
  const all = projects.filter(p => p.collection === c.id);
  const state = getState(`collection/${c.id}`);
  const types = ['全部', ...new Set(all.map(p => p.type))];
  const selected = state.filter === '全部' ? all : all.filter(p => p.type === state.filter);
  if (state.mode === 'gallery') return coverIndexView(c, selected, types, state);
  const cards = selected.map((p, i) => `<a class="project-link" href="#project/${p.id}" data-project="${p.id}" data-collection="${c.id}">
      <div class="project-image" data-cover="${p.id}">${image(projectCovers[p.id], p.title, i < 2)}<span class="project-code">${c.index} / ${String(all.indexOf(p) + 1).padStart(2,'0')}</span></div>
      <div class="project-meta"><div><h2>${p.title}</h2><p>${esc(p.subtitle)} / ${p.type}</p></div>${icon('arrow-up-right')}</div></a>`);
  return `<div class="view-inner" style="--accent:${c.color}">
    <div class="breadcrumbs"><a href="#archive">${icon('arrow-left')}作品档案</a><span>/</span><span>${c.title}</span></div>
    <div class="view-heading"><div><p class="eyebrow">${c.index} / ${c.en}</p><h1 tabindex="-1">${c.title}</h1></div><p>${String(all.length).padStart(2, '0')} 个项目档案<br>${c.tags.join(' / ')}</p></div>
    ${tabs(c.id)}
    <div class="collection-toolbar"><div class="filters" role="group" aria-label="项目类型">${types.map(t => `<button class="filter" type="button" data-filter="${esc(t)}" aria-pressed="${state.filter === t}">${t}</button>`).join('')}</div>
    <div class="view-modes" role="group" aria-label="陈列方式">${[['gallery','panels-top-left','展陈视图'],['grid','layout-grid','网格视图'],['list','list','列表视图']].map(([mode, glyph, label]) => `<button type="button" data-mode="${mode}" aria-label="${label}" title="${label}" aria-pressed="${state.mode === mode}">${icon(glyph)}</button>`).join('')}</div></div>
    <div class="project-grid ${state.mode === 'list' ? 'is-list' : ''}">${cards.join('')}</div>
  </div>`;
}

function pendingSections(titles, body) {
  return `<div class="pending-sections">${titles.map((title, i) => {
    const item = body?.find(s => s.title === title);
    return `<section><div class="pending-section"><span class="tiny">${String(i+1).padStart(2,'0')}</span><h2>${esc(title)}</h2>${item ? '' : '<span>内容整理中</span>'}</div>${item ? `<p class="description">${esc(item.text)}</p>` : ''}</section>`;
  }).join('')}</div>`;
}

const documentLinks = p => p.documents?.length ? `<nav class="source-links" aria-label="项目原始资料">${p.documents.map(d => `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.label)}${icon('arrow-up-right')}</a>`).join('')}</nav>` : '';
const promptView = (entry, label = '原始 Prompt') => `<details class="prompt-panel" open><summary><span>${entry.promptComplete === false ? '需求摘要 / 未保存完整 Prompt' : label}</span>${icon('chevron-down')}</summary><div class="prompt-actions"><span class="tiny">${esc(entry.id)} / SOURCE TEXT</span><button class="icon-button" type="button" data-copy-prompt aria-label="${entry.promptComplete === false ? '复制需求摘要' : '复制完整 Prompt'}" title="${entry.promptComplete === false ? '复制需求摘要' : '复制完整 Prompt'}">${icon('copy')}</button><span class="copy-status" role="status"></span></div><pre>${esc(entry.prompt)}</pre></details>`;
const studyHelpers = { esc, icon, imageButton, promptView, sectionLabel, imageStackView };
function evidenceSelection(p) {
  const state = getState(`project/${p.id}`);
  const entries = p.template === 'comparison' ? (state.evidenceMode === 'studies' ? p.studies : p.cases) : p.samples;
  const categories = ['全部', ...new Set(entries.map(e => e.category))];
  if (!categories.includes(state.category)) state.category = '全部';
  const visible = state.category === '全部' ? entries : entries.filter(e => e.category === state.category);
  const entry = visible.find(e => e.id === state.selected) || visible[0];
  return { state, entries, categories, visible, entry };
}
function evidenceToolbar(p, selection) {
  const {state, categories, visible, entry} = selection;
  const index = visible.indexOf(entry);
  const comparison = p.template === 'comparison';
  return `<div class="evidence-toolbar">
    <label>品类<select class="case-select" data-evidence-category aria-label="选择案例品类">${categories.map(c => `<option ${c === state.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label>${comparison ? '案例' : 'Prompt 样本'}<select class="case-select" ${comparison ? 'data-case' : 'data-sample'} aria-label="${comparison ? '选择对比案例' : '选择数据样本'}">${visible.map(c => `<option value="${esc(c.id)}" ${c.id === entry?.id ? 'selected' : ''}>${esc(c.title || `${c.id} · ${c.category}`)}</option>`).join('')}</select></label>
    <div class="evidence-paging"><span class="tiny">${String(index+1).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')}</span><button class="icon-button" type="button" data-evidence-step="-1" aria-label="上一个案例" title="上一个案例" ${index <= 0 ? 'disabled' : ''}>${icon('arrow-left')}</button><button class="icon-button" type="button" data-evidence-step="1" aria-label="下一个案例" title="下一个案例" ${index >= visible.length-1 ? 'disabled' : ''}>${icon('arrow-right')}</button></div>
  </div>`;
}
function imageStackView(entries, kind) {
  return `<div class="image-stack" data-stack-kind="${kind}">
    <div class="stack-stage"><div class="stack-scroll" tabindex="0" aria-label="滚动浏览叠放作品">
      <ol class="stack-items">${entries.map((entry,i) => `<li><button type="button" data-stack-item="${esc(entry.id)}" data-title="${esc(entry.title)}" data-category="${esc(entry.category)}" data-label="${esc(stackCategoryName(entry.category))}" aria-label="打开作品：${esc(entry.title)}">
        <span class="stack-fallback-title">${esc(stackCategoryName(entry.category))}</span><span class="stack-fallback-images">${entry.images.map(file=>image(file,entry.title)).join('')}</span>
      </button></li>`).join('')}</ol>
    </div></div>
    <div class="stack-caption"><button type="button" class="stack-current" data-stack-current><span></span>${icon('arrow-up-right')}</button><span class="tiny" data-stack-status aria-live="polite"></span></div>
    </div>`;
}
function comparisonView(p) {
  const selection = evidenceSelection(p);
  const {state, visible, categories} = selection;
  const single = state.evidenceMode === 'studies';
  return `<div class="evidence-heading"><div><p class="eyebrow">DESIGN LOOP / CASE ARCHIVE</p><h2>${single ? 'Skill 单项探索' : '同一需求，两种结果'}</h2></div><div class="evidence-modes" role="group" aria-label="案例类型"><button type="button" data-evidence-mode="comparison" aria-pressed="${!single}">对比 ${p.cases.length}</button><button type="button" data-evidence-mode="studies" aria-pressed="${single}">单项 ${p.studies.length}</button></div></div>
    <div class="case-filters" role="group" aria-label="案例品类">${categories.map(category => `<button type="button" data-case-category="${esc(category)}" aria-pressed="${state.category === category}">${esc(stackCategoryName(category))}</button>`).join('')}</div>
    ${imageStackView(visible.map(entry=>({id:entry.id,title:entry.title,category:entry.category,images:single?[entry.skillImage]:[entry.directImage,entry.skillImage]})),'comparison')}`;
}
function comparisonDetail(p) {
  const selection=evidenceSelection(p),{state,entry}=selection;
  const single=state.evidenceMode==='studies';
  return `<div class="detail-heading"><div><p class="eyebrow">${esc(entry.id)}</p><h2 id="evidence-dialog-title">${esc(stackCategoryName(entry.category))}</h2></div><div class="evidence-paging"><button class="icon-button" type="button" data-evidence-step="-1" aria-label="上一个案例" title="上一个案例" ${selection.visible.indexOf(entry) <= 0 ? 'disabled' : ''}>${icon('arrow-left')}</button><button class="icon-button" type="button" data-evidence-step="1" aria-label="下一个案例" title="下一个案例" ${selection.visible.indexOf(entry) >= selection.visible.length-1 ? 'disabled' : ''}>${icon('arrow-right')}</button></div></div>
    <div class="comparison ${single ? 'comparison-single' : ''}">${(single ? [['使用 Skill','WITH SKILL',entry.skillImage]] : [['GPT 直出','DIRECT',entry.directImage],['使用 Skill','WITH SKILL',entry.skillImage]]).map(([label, en, img]) => `<section class="compare-column"><header><span>${label}</span><span class="tiny">${en}</span></header>${imageButton(img, `${entry.title} · ${label}`, true)}</section>`).join('')}</div>
    ${promptView(entry)}
    <div class="case-analysis">${sectionLabel('01',single ? '归档边界' : '比较条件')}<p>${esc(single ? '这条资料只保存了 Skill 成图与原始需求，没有对应直出稿，不计入双图比较。' : entry.conditions)}</p></div>
    ${single ? '' : `<div class="case-analysis">${sectionLabel('02',entry.notes ? '画面观察' : '比较关注')}<p>${esc(entry.notes || '首先核查标题、时间、地点等事实是否完整；再比较主体尺度、阅读顺序、字图关系、留白与任务语气。这里不预设 Skill 在每一项都优于直出。')}</p></div>`}
    <a class="source-link" href="${esc(entry.sourceDoc)}" target="_blank" rel="noopener">此案例的原始资料${icon('arrow-up-right')}</a>`;
}
function archiveSelection(p) {
  const state=getState(`project/${p.id}/images`);
  const categories=['全部',...new Set(p.gallery.map(entry=>entry.category))];
  if (!categories.includes(state.category)) state.category='全部';
  const indices=p.gallery.map((_,index)=>index).filter(index=>state.category==='全部' || p.gallery[index].category===state.category);
  return {state,categories,indices};
}
function archiveImagesContent(p) {
  const {state,categories,indices}=archiveSelection(p);
  return `${categories.length>2 ? `<div class="case-filters archive-style-filters" role="group" aria-label="图像画风">${categories.map(category=>`<button type="button" data-gallery-category="${esc(category)}" aria-pressed="${state.category===category}">${esc(category)}</button>`).join('')}</div>` : ''}
    ${imageStackView(indices.map(index=>{const entry=p.gallery[index];return {id:String(index),title:entry.caption,category:entry.category,images:[entry.file]};}),'gallery')}`;
}
function archiveImagesView(p) {
  return `<section class="image-archive" id="image-archive">${archiveImagesContent(p)}</section>`;
}
function sampleView(p) {
  const selection = evidenceSelection(p);
  const {entry} = selection;
  return `<div class="evidence-heading"><div><p class="eyebrow">PROMPT / TRACEABLE SAMPLES</p><h2>Prompt 样本</h2></div></div>
    ${evidenceToolbar(p, selection)}
    <div class="sample-record"><dl><div><dt>SAMPLE ID</dt><dd>${esc(entry.id)}</dd></div><div><dt>CATEGORY</dt><dd>${esc(entry.category)}</dd></div><div><dt>VERSION</dt><dd>${esc(entry.version)}</dd></div></dl>
    ${promptView(entry, '完整 Prompt')}${entry.image ? imageButton(entry.image, entry.id) : ''}<p class="description">${esc(entry.rules)}</p></div>`;
}
function pipelineView(p) {
  const steps = p.pipelineSteps;
  return `<div class="research-intro"><p class="eyebrow">${esc(p.role)}</p><h2>从视觉判断到规模化生产</h2><p class="description">${esc(p.description)}</p></div>
    <div class="evidence-stats">${p.stats.map(s => `<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')}</div>
    <p class="quality-note production-note">${esc(p.productionNote)}</p>
    <div class="pipeline">${steps.map(([title, sub], i) => `<div class="pipeline-step"><span class="tiny">0${i+1}</span><h3>${title}</h3><p>${sub}</p></div>`).join('')}</div>
    ${sectionLabel('01', '分类维度')}<div class="data-axes">${p.axes.map(a => `<div class="data-axis"><span></span>${esc(a.label)}<small>${esc(a.value)}</small></div>`).join('')}</div>
    <details class="taxonomy-panel"><summary>${esc(p.taxonomy.title)}<span class="tiny">${p.taxonomy.rows.length} TYPES</span>${icon('chevron-down')}</summary><p class="quality-note">${esc(p.taxonomy.note)}</p><div class="taxonomy-table"><table><thead><tr>${p.taxonomy.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${p.taxonomy.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
    ${pendingSections(p.body.map(s=>s.title), p.body)}
    <section class="review-framework" aria-label="美学判断与 Badcase"><h2>美学判断与 Badcase</h2><div class="review-table"><table><thead><tr><th scope="col">判断维度</th><th scope="col">Badcase 信号</th><th scope="col">调整方向</th></tr></thead><tbody>${p.reviewChecklist.map(row=>`<tr><th scope="row">${esc(row[0])}</th><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')}</tbody></table></div></section>
    ${documentLinks(p)}<section class="evidence-browser" id="evidence-records" data-project-content>${sampleView(p)}</section>`;
}
function chaptersView(p) {
  return `<nav class="chapter-nav" aria-label="项目章节">${p.chapters.map((c,i) => `<a href="#chapter-${i}" data-chapter="chapter-${i}"><small>0${i+1}</small>${esc(c.title)}</a>`).join('')}</nav>${p.chapters.map((c,i) => `<section class="project-chapter" id="chapter-${i}">${sectionLabel(`0${i+1}`,c.title)}<p class="chapter-copy">${esc(c.text)}</p><div class="chapter-figures ${c.figures.length === 1 ? 'is-single' : ''}">${c.figures.map(f => `<figure>${imageButton(f.file, `${p.title} · ${f.caption}`)}<figcaption>${esc(f.caption)}</figcaption></figure>`).join('')}</div></section>`).join('')}`;
}

function projectView(p) {
  const c = collections.find(c => c.id === p.collection);
  const siblings = projects.filter(s => s.collection === p.collection);
  const next = siblings[(siblings.indexOf(p) + 1) % siblings.length];
  if (p.collection === 'visual' && p.chapters) return visualCaseStudy(p,next,{esc,icon,imageButton,mediaDimensions});
  const media = p.template || p.chapters ? [projectCovers[p.id]] : [...new Set([projectCovers[p.id], p.cover, ...p.images])];
  if (p.template === 'model-study') return `<article class="project-page study-project" style="--accent:${c.color}"><div class="view-inner loop-body">
    <header class="loop-heading"><div><p class="eyebrow">INTERNSHIP / 04 / AESTHETIC EVALUATION</p><h1 tabindex="-1">${esc(p.title)}</h1><p>${esc(p.subtitle)}</p></div><span class="tiny">SEEDREAM / GPT IMAGE</span></header>
    <div class="study-scope"><span><strong>600</strong>组配对档案</span><span><strong>78</strong>组已观察</span><span><strong>12</strong>组精选证据</span><p>探索性案例研究，不作模型整体排名。<br>逐图观察由 Codex AI 辅助，未独立人工复评。</p></div>
    <nav class="chapter-nav study-nav" aria-label="项目章节"><a href="#study-visuals" data-chapter="study-visuals">01 / 数据可视化</a><a href="#study-cases" data-chapter="study-cases">02 / 双图案例</a><a href="#study-findings" data-chapter="study-findings">03 / 判断与反例</a><a href="#study-method" data-chapter="study-method">04 / 方法与边界</a></nav>
    ${studyVisuals(p,getState(`project/${p.id}`),studyHelpers)}
    <section id="study-cases" data-study-browser>${studyBrowser(p,getState(`project/${p.id}`),studyHelpers)}</section>
    ${studyMethod(p,studyHelpers)}
    <a class="next-project" href="#project/${next.id}"><div><span class="tiny">NEXT IN ${c.en}</span><h2>${next.title}</h2></div><span class="round-arrow">${icon('arrow-right')}</span></a>
    </div></article>`;
  if (p.template === 'comparison') return `<article class="project-page loop-project" style="--accent:${c.color}">
    <div class="view-inner loop-body"><header class="loop-heading"><div><p class="eyebrow">INTERNSHIP / GENERATIVE DESIGN</p><h1 tabindex="-1">Design Loop</h1><p>${esc(p.subtitle)}</p></div><span class="tiny">38 COMPARISONS / 15 STUDIES</span></header>
    <section class="evidence-browser" id="evidence-records" data-project-content>${comparisonView(p)}</section>
    <div class="loop-method">${pendingSections(['Skill 工作流','局限与复盘'],p.body)}${documentLinks(p)}</div>
    <a class="next-project" href="#project/${next.id}"><div><span class="tiny">NEXT IN ${c.en}</span><h2>${next.title}</h2></div><span class="round-arrow">${icon('arrow-right')}</span></a></div></article>`;
  if (p.template === 'pipeline') return `<article class="project-page pipeline-project" style="--accent:${c.color}"><div class="view-inner loop-body">
    <header class="loop-heading"><div><p class="eyebrow">INTERNSHIP / AESTHETIC RESEARCH</p><h1 tabindex="-1">${esc(p.title)}</h1><p>${esc(p.subtitle)}</p></div><span class="tiny">${p.gallery.length} SELECTED IMAGES</span></header>
    <nav class="chapter-nav pipeline-nav" aria-label="项目章节"><a href="#image-archive" data-chapter="image-archive">精选案例</a><a href="#pipeline-method" data-chapter="pipeline-method">美学研究与生产</a><a href="#evidence-records" data-chapter="evidence-records">Prompt 样本</a></nav>
    ${archiveImagesView(p)}<section class="pipeline-method" id="pipeline-method">${pipelineView(p)}</section>
    <a class="next-project" href="#project/${next.id}"><div><span class="tiny">NEXT IN ${c.en}</span><h2>${next.title}</h2></div><span class="round-arrow">${icon('arrow-right')}</span></a></div></article>`;
  let content;
  if (p.template === 'pipeline') content = pipelineView(p);
  else if (p.chapters) content = chaptersView(p);
  else content = `${pendingSections(p.sections, p.body)}${media.slice(1).map((file,i) => `<figure class="project-media" id="media-${i+1}">${imageButton(file, `${p.title} / ${i+2}`)}<figcaption>${p.en} / ${String(i+2).padStart(2,'0')}</figcaption></figure>`).join('')}`;
  return `<article class="project-page" style="--accent:${c.color}">
    <aside class="media-index" aria-label="作品图片索引">${p.video ? `<button type="button" data-media-target="project-film" aria-label="跳到案例短片" title="案例短片">${icon('circle-play')}<small>FILM</small></button>` : ''}${media.map((file,i) => `<button type="button" data-media-target="media-${i}" aria-label="跳到作品图 ${i+1}" title="作品图 ${i+1}" aria-pressed="${i===0}">${image(file, '', true)}<small>${String(i+1).padStart(2,'0')}</small></button>`).join('')}${p.chapters ? p.chapters.map((c,i)=>`<button type="button" data-media-target="chapter-${i}" aria-label="跳到${esc(c.title)}" title="${esc(c.title)}">${icon('layers')}<small>0${i+1}</small></button>`).join('') : ''}${p.template ? `<button type="button" data-media-target="evidence-records" aria-label="${p.template === 'comparison' ? '跳到对比案例' : '跳到 Prompt 样本'}" title="${p.template === 'comparison' ? '对比案例' : 'Prompt 样本'}">${icon(p.template === 'comparison' ? 'columns-2' : 'file-text')}<small>${p.template === 'comparison' ? 'CASES' : 'PROMPT'}</small></button>${p.template === 'pipeline' ? `<button type="button" data-media-target="image-archive" aria-label="跳到生成图档案" title="生成图档案">${icon('images')}<small>IMAGES</small></button>` : ''}` : ''}</aside>
    <section class="project-front" id="media-0">
      <div class="project-front-title"><span class="tiny">${c.index} / ${String(siblings.indexOf(p)+1).padStart(2,'0')}</span><h1 class="${p.title.length > 10 ? 'is-long' : ''}" aria-label="${esc(p.title)}" tabindex="-1">${(p.displayLines || [p.title]).map(line => `<span>${esc(line)}</span>`).join('')}</h1><p class="project-subtitle">${esc(p.subtitle)}</p><span class="tiny">${p.en}</span></div>
      <div class="project-front-image" data-cover="${p.id}">${imageButton(projectCovers[p.id], p.title, true)}</div>
      <div class="project-front-meta"><dl><div><dt>A / 分类</dt><dd>${p.type}</dd></div><div><dt>B / 领域</dt><dd>${c.title}</dd></div><div><dt>C / 档案</dt><dd>${esc(p.status || '内容整理中')}</dd></div></dl><div><p>${p.description}</p>${p.url ? `<a class="project-live-link" href="${esc(p.url)}" target="_blank" rel="noopener">打开交互演示${icon('arrow-up-right')}</a>` : ''}${p.template ? `<a class="project-live-link" href="#evidence-records" data-chapter="evidence-records">${p.template === 'comparison' ? '对比案例' : 'Prompt 样本'}${icon('arrow-down')}</a>` : ''}${p.template === 'pipeline' ? `<a class="project-live-link" href="#image-archive" data-chapter="image-archive">生成图档案${icon('arrow-down')}</a>` : ''}</div></div>
      <button class="project-scroll" type="button" data-media-target="${p.video ? 'project-film' : media.length > 1 ? 'media-1' : 'project-body'}" aria-label="向下查看项目" title="向下查看项目">${icon('arrow-down')}</button>
    </section>
    <div class="project-body view-inner" id="project-body">${p.video ? `<figure class="project-film" id="project-film"><video controls playsinline preload="metadata" poster="${asset(p.videoPoster || p.cover)}" aria-label="${esc(p.title)} 产品案例短片"><source src="${esc(p.video)}" type="video/mp4"></video><figcaption>${esc(p.videoNote || '')}</figcaption></figure>` : ''}${content}
    ${p.qualityNote ? `<p class="quality-note">${esc(p.qualityNote)}</p>` : ''}${p.sourceUrl ? `<a class="source-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.sourceLabel)}${icon('arrow-up-right')}</a>` : ''}
    ${p.url ? `<a class="about-contact" href="${esc(p.url)}" target="_blank" rel="noopener">打开项目 ${icon('arrow-up-right')}</a>` : ''}
    <a class="next-project" href="#project/${next.id}"><div><span class="tiny">NEXT IN ${c.en}</span><h2>${next.title}</h2></div><span class="round-arrow">${icon('arrow-right')}</span></a>
    </div>
  </article>`;
}

function aboutView() {
  return `<div class="view-inner"><div class="breadcrumbs"><a href="#archive">${icon('arrow-left')}作品档案</a><span>/</span><span>关于我</span></div>${tabs('about')}
    <section class="about-layout"><div><p class="eyebrow">04 / A LITTLE ABOUT ME</p><h1 tabindex="-1">${profile.name}</h1><p class="about-en">${profile.en}</p><p class="about-note">${profile.bio}</p>
    <div class="about-details"><span>${profile.location}</span><span>${profile.title}</span></div>
    </div>
    <aside class="about-sheet"><span class="tiny">PERSONAL FILE / 2026</span><h2>Design.<br>Explore.<br>Make.</h2><div class="sheet-rule"><span>视觉 / AI / 产品</span><span>ZHT.</span></div></aside></section>
    ${pendingSections(['个人经历', '能力与方法'], profile.experience)}
  </div>`;
}

function normalize(route) {
  if (['home','archive','about'].includes(route)) return route;
  const [kind,id] = route.split('/');
  if (kind === 'collection' && collections.some(c => c.id === id && id !== 'about')) return route;
  if (kind === 'project' && projects.some(p => p.id === id)) return route;
  return 'archive';
}
function render(route, previous) {
  unmountIndex();
  unmountMedia();
  unmountCases();
  unmountGallery();
  const home = route === 'home';
  intro.hidden = !home;
  view.hidden = home;
  footer.hidden = home;
  document.body.dataset.route = route.split('/')[0];
  const exhibition = route.startsWith('collection/') && getState(route).mode === 'gallery';
  document.body.dataset.exhibition = String(exhibition);
  footer.hidden = home || exhibition;
  const back = document.querySelector('#page-back');
  const project = projects.find(p => route === `project/${p.id}`);
  if (project) {
    const parentRoute = `collection/${project.collection}`;
    const parent = getState(parentRoute);
    parent.selected = project.id;
    if (previous !== parentRoute || parent.mode !== 'gallery') parent.stage = 'focus';
    if (parent.filter !== '全部' && parent.filter !== project.type) parent.filter = '全部';
  }
  const backRoute = home ? '' : route === 'archive' ? 'home' : project ? `collection/${project.collection}` : 'archive';
  const backText = route === 'archive' ? '返回首页' : project ? `返回${collections.find(c => c.id === project.collection).title}` : '返回作品档案';
  back.hidden = home;
  back.href = `#${backRoute}`;
  back.toggleAttribute('data-return', true);
  back.innerHTML = `${icon('arrow-left')}<span>${backText}</span>`;
  if (home) { nameField.start(); document.title = '曾慧婷 / Portfolio 2026'; }
  else {
    nameField.stop();
    const [kind,id] = route.split('/');
    const c = collections.find(c => c.id === id), p = projects.find(p => p.id === id);
    view.innerHTML = route === 'archive' ? archiveView() : route === 'about' ? aboutView() : kind === 'collection' ? collectionView(c) : projectView(p);
    document.title = `${route === 'archive' ? '作品档案' : route === 'about' ? '关于我' : kind === 'collection' ? c.title : p.title} / 曾慧婷`;
  }
  document.querySelectorAll('[data-nav]').forEach(a => {
    const selected = a.dataset.nav === 'about' ? route === 'about' : !home && route !== 'about';
    if (selected) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  icons();
  unmountIndex = home ? () => {} : mountCoverIndex(view.querySelector('.cover-index'), getState(route), motion.matches || still, stage => {
    document.body.dataset.coverStage = stage;
    back.querySelector('span').textContent = stage === 'focus' ? '返回封面索引' : backText;
  });
  unmountMedia = mountMediaIndex(view.querySelector('.project-page'), motion.matches || still);
  mountCases();
  mountGallery();
}

async function navigate(raw, { historyMode = 'push', restore = false, animate = true } = {}) {
  const route = normalize(raw);
  if (route === current) return;
  const ownTicket = ++ticket;
  document.body.dataset.transitioning = 'true';
  if (dialog.open) dialog.close();
  if (evidenceDialog.open) evidenceDialog.close();
  if (current) getState(current).scroll = window.scrollY;
  if (transition) {
    transition.skipTransition();
    await transition.updateCallbackDone.catch(() => {});
    if (ownTicket !== ticket) return;
  }
  const previous = current;
  const candidate = route.startsWith('project/') ? route.split('/')[1] : previous.startsWith('project/') ? previous.split('/')[1] : '';
  const coverId = projects.find(p => p.id === candidate)?.template ? '' : candidate;
  const oldCover = coverId && document.querySelector(`[data-cover="${coverId}"]`);
  if (oldCover) oldCover.style.viewTransitionName = 'project-cover';
  if (historyMode === 'push') history.pushState({}, '', `#${route}`);
  if (historyMode === 'replace') history.replaceState({}, '', `#${route}`);
  const update = () => {
    current = route;
    render(route, previous);
    const newCover = coverId && document.querySelector(`[data-cover="${coverId}"]`);
    if (newCover) newCover.style.viewTransitionName = 'project-cover';
    window.scrollTo({ top: restore ? getState(route).scroll : 0, behavior: 'instant' });
    const savedFocus = restore && getState(route).focus;
    const target = savedFocus ? Array.from(view.querySelectorAll('a[href]')).find(a => a.getAttribute('href') === savedFocus) : null;
    if (route !== 'home') (target || view.querySelector('h1'))?.focus({ preventScroll: true });
    else if (previous) document.querySelector('#enter').focus({ preventScroll: true });
  };
  const canAnimate = animate && !motion.matches && !still;
  if (document.startViewTransition && canAnimate) {
    transition = document.startViewTransition(update);
    transition.ready.catch(() => {});
    await transition.finished.catch(() => {});
  } else {
    update();
    if (canAnimate && !view.hidden) view.animate([{ opacity:0, transform:'translateY(12px)' }, { opacity:1, transform:'translateY(0)' }], { duration:350, easing:'cubic-bezier(.22,1,.36,1)' });
  }
  if (ownTicket !== ticket) return;
  transition = null;
  delete document.body.dataset.transitioning;
  document.querySelectorAll('[data-cover]').forEach(el => el.style.removeProperty('view-transition-name'));
  try { if (route !== 'home') sessionStorage.setItem('zht-visited', '1'); } catch { /* Storage is optional. */ }
}

async function enter(point) {
  if (entering || current !== 'home') return;
  entering = true;
  const ownTicket = ticket;
  document.querySelector('#enter').disabled = true;
  await nameField.open(point);
  if (ticket === ownTicket && current === 'home') await navigate('archive');
  document.querySelector('#enter').disabled = false;
  entering = false;
}
const nameField = createNameField(document.querySelector('#name-field'), enter);
document.querySelector('#enter').addEventListener('click', () => enter());
function mountCases() {
  const project=projects.find(p=>current===`project/${p.id}`),state=getState(current);
  if (project?.template==='model-study' && !state.stackCursor) state.stackCursor=studySelection(project,state).visible[0]?.id;
  unmountCases = mountImageStack(view.querySelector('[data-stack-kind="comparison"],[data-stack-kind="boundaries"]'), getState(current), motion.matches || still, id => {
    const state = getState(current);
    state.selected = id;
    const p=projects.find(p=>current===`project/${p.id}`);
    if (p.template === 'model-study') {
      state.studySelected=id; state.studyDetailCategory=state.studyCategory;
      showEvidence(studyDetail(p,state,studyHelpers));
    }
    else showEvidence(comparisonDetail(p));
  });
}
function showEvidence(content) {
  evidenceDialog.querySelector('.evidence-dialog-content').innerHTML=content;
  icons();
  if (!evidenceDialog.open) {
    evidenceDialog.showModal();
    if (!motion.matches && !still) evidenceDialog.animate(
      [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:240,easing:'cubic-bezier(.22,1,.36,1)'}
    );
  }
  evidenceDialog.scrollTo({top:0,behavior:'instant'});
  document.body.style.overflow='hidden';
}
function openArchiveImage(index) {
  const p=projects.find(p=>current===`project/${p.id}`),entry=p.gallery[index];
  if (!entry) return;
  const {indices}=archiveSelection(p),position=indices.indexOf(index);
  getState(current).archiveIndex=index;
  showEvidence(`<div class="detail-heading"><div><p class="eyebrow">${esc(entry.sourceName)} / ${String(position+1).padStart(2,'0')} OF ${indices.length}</p><h2 id="evidence-dialog-title">${esc(entry.category)}</h2></div><div class="evidence-paging"><button class="icon-button" type="button" data-archive-step="-1" aria-label="上一张原图" title="上一张原图" ${position<=0?'disabled':''}>${icon('arrow-left')}</button><button class="icon-button" type="button" data-archive-step="1" aria-label="下一张原图" title="下一张原图" ${position===indices.length-1?'disabled':''}>${icon('arrow-right')}</button></div></div>
    <div class="archive-detail-image">${imageButton(entry.file,entry.caption,true)}</div>
    ${entry.promptRecord ? `${promptView(entry.promptRecord,'生成 Prompt')}<p class="quality-note">${esc(entry.provenance.model)} / ${esc(entry.provenance.batch)}。原图、原始请求与回执哈希已核对。</p>` : entry.promptCandidate ? `<p class="quality-note">以下是原文件中可回查的同编号文本。不同批次存在编号复用，现有资料尚未确认与 Prompt 样本的逐图对应关系；这段文本不是已确认的成图生成记录。</p>${promptView(entry.promptCandidate,'同编号回查文本 / 对应待核')}` : '<p class="quality-note">此图已保留原文件名；当前资料未找到同批次逐图 Prompt，不用相似图或其他批次的文字补写。</p>'}
    <a class="project-live-link" href="#evidence-records" data-chapter="evidence-records">查看完整 Prompt 文本档案${icon('arrow-down')}</a>`);
}
function mountGallery() {
  unmountGallery=mountImageStack(view.querySelector('[data-stack-kind="gallery"]'),getState(`${current}/images`),motion.matches || still,id=>openArchiveImage(Number(id)));
}
function updateEvidence(focusSelector) {
  const p = projects.find(p => current === `project/${p.id}`);
  const panel = view.querySelector('[data-project-content]');
  if (!p || !panel) return;
  const top = panel.getBoundingClientRect().top;
  unmountCases();
  panel.innerHTML = p.template === 'comparison' ? comparisonView(p) : sampleView(p);
  icons();
  mountCases();
  window.scrollBy({ top:panel.getBoundingClientRect().top-top, behavior:'instant' });
  const focus = panel.querySelector(focusSelector);
  if (focus && !focus.disabled) focus.focus({preventScroll:true});
  else panel.querySelector('[data-stack-current],[data-sample]')?.focus({preventScroll:true});
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-close-evidence]')) {evidenceDialog.close();return;}
  const studyAxis=e.target.closest('[data-study-axis]');
  if (studyAxis) {
    const p=projects.find(p=>current===`project/${p.id}`);
    if (p?.template !== 'model-study') return;
    const [category,id]=studyAxis.dataset.studyAxis.split('/');
    if (!p.study.scoring.groups[category]?.axes.some(a=>a.id===id)) return;
    const state=getState(current);
    state[`axis_${category}`]=id;
    const chart=studyAxis.closest('[data-study-chart]');
    chart.innerHTML=studyRadar(p,category,id,studyHelpers);
    icons();
    chart.querySelector(`[data-study-axis="${category}/${id}"]`)?.focus({preventScroll:true});
    return;
  }
  const studyCategory=e.target.closest('[data-study-category]');
  const studyOpen=e.target.closest('[data-study-open]');
  const studyStep=e.target.closest('[data-study-step]');
  if (studyCategory || studyOpen || studyStep) {
    const p=projects.find(p=>current===`project/${p.id}`),state=getState(current);
    if (p?.template !== 'model-study') return;
    if (studyCategory) {
      state.studyCategory=studyCategory.dataset.studyCategory;
      state.stackCursor=''; state.stackPosition=undefined;
      unmountCases();
      const panel=view.querySelector('[data-study-browser]');
      panel.innerHTML=studyBrowser(p,state,studyHelpers);
      icons(); mountCases();
      panel.querySelector(`[data-study-category="${state.studyCategory}"]`)?.focus({preventScroll:true});
    } else {
      if (studyOpen) {
        lastStudyTrigger=studyOpen;
        state.studySelected=studyOpen.dataset.studyOpen;
        state.studyDetailCategory=studySelection(p,state).visible.some(c=>c.id===state.studySelected) ? state.studyCategory : '全部';
      }
      else {
        const {visible}=studySelection(p,{studyCategory:state.studyDetailCategory}),entry=p.study.cases.find(c=>c.id===state.studySelected);
        const entries=visible.includes(entry)?visible:p.study.cases;
        const next=entries[entries.indexOf(entry)+Number(studyStep.dataset.studyStep)];
        if (!next) return;
        state.studySelected=next.id;
      }
      showEvidence(studyDetail(p,state,studyHelpers));
    }
    return;
  }
  const archiveStep=e.target.closest('[data-archive-step]');
  if (archiveStep) {
    const p=projects.find(p=>current===`project/${p.id}`),{indices}=archiveSelection(p);
    openArchiveImage(indices[indices.indexOf(getState(current).archiveIndex)+Number(archiveStep.dataset.archiveStep)]);
    return;
  }
  const galleryCategory=e.target.closest('[data-gallery-category]');
  if (galleryCategory) {
    const p=projects.find(p=>current===`project/${p.id}`),{state}=archiveSelection(p);
    state.category=galleryCategory.dataset.galleryCategory;
    state.stackCursor=''; state.stackPosition=undefined;
    const panel=view.querySelector('#image-archive'),top=panel.getBoundingClientRect().top;
    unmountGallery();
    panel.innerHTML=archiveImagesContent(p);
    icons(); mountGallery();
    window.scrollBy({top:panel.getBoundingClientRect().top-top,behavior:'instant'});
    panel.querySelector(`[data-gallery-category="${CSS.escape(state.category)}"]`)?.focus({preventScroll:true});
    return;
  }
  const categoryButton = e.target.closest('[data-case-category]');
  const closeCase = e.target.closest('[data-case-close]');
  if (categoryButton || closeCase) {
    const state = getState(current);
    state.caseOpen = false;
    if (categoryButton) {
      state.category = categoryButton.dataset.caseCategory;
      state.selected = '';
      state.caseCursor = '';
      state.stackCursor = '';
      state.stackPosition = undefined;
    }
    updateEvidence(categoryButton ? `[data-case-category="${CSS.escape(state.category)}"]` : `[data-case-open="${CSS.escape(state.selected)}"]`);
    if (closeCase) view.querySelector('#evidence-records')?.scrollIntoView({behavior:motion.matches || still ? 'instant' : 'smooth',block:'start'});
    return;
  }
  const chapterLink = e.target.closest('[data-chapter]');
  if (chapterLink) {
    e.preventDefault();
    const target = document.getElementById(chapterLink.dataset.chapter);
    if (evidenceDialog.open) evidenceDialog.close();
    target?.scrollIntoView({behavior:motion.matches ? 'instant' : 'smooth', block:'start'});
    return;
  }
  const evidenceMode = e.target.closest('[data-evidence-mode]');
  const evidenceStep = e.target.closest('[data-evidence-step]');
  if (evidenceMode || evidenceStep) {
    const state = getState(current);
    if (evidenceMode) {
      state.evidenceMode = evidenceMode.dataset.evidenceMode;
      state.category = '全部';
      state.selected = '';
      state.caseOpen = false;
      state.caseCursor = '';
      state.stackCursor = '';
      state.stackPosition = undefined;
    } else {
      const p = projects.find(p => current === `project/${p.id}`);
      const {visible,entry} = evidenceSelection(p);
      const next = visible[visible.indexOf(entry) + Number(evidenceStep.dataset.evidenceStep)];
      if (!next) return;
      state.selected = next.id;
      state.caseCursor = next.id;
    }
    const p=projects.find(p=>current===`project/${p.id}`);
    if (evidenceStep && evidenceDialog.open && p.template==='comparison') showEvidence(comparisonDetail(p));
    else updateEvidence(evidenceMode ? `[data-evidence-mode="${state.evidenceMode}"]` : `[data-evidence-step="${evidenceStep.dataset.evidenceStep}"]`);
    return;
  }
  const a = e.target.closest('a[href^="#"]');
  if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
    const route = a.getAttribute('href').slice(1);
    if (route === 'main') {
      e.preventDefault();
      document.querySelector('#main').focus({ preventScroll: true });
      return;
    }
    e.preventDefault();
    getState(current).focus = a.getAttribute('href');
    if (a.dataset.project) getState(current).selected = a.dataset.project;
    navigate(route, { restore: a.hasAttribute('data-return') || route === 'archive' });
    return;
  }
  const filter = e.target.closest('[data-filter]');
  const mode = e.target.closest('[data-mode]');
  if (filter || mode) {
    const state = getState(current);
    if (filter) state.filter = filter.dataset.filter;
    if (mode) state.mode = mode.dataset.mode;
    const selector = filter ? `[data-filter="${CSS.escape(state.filter)}"]` : `[data-mode="${state.mode}"]`;
    render(current);
    view.querySelector(selector)?.focus({ preventScroll:true });
  }
  const zoom = e.target.closest('[data-zoom]');
  if (zoom) {
    lastZoom = zoom;
    dialog.querySelector('img').src = asset(zoom.dataset.zoom);
    dialog.querySelector('img').alt = zoom.dataset.caption;
    dialog.querySelector('#lightbox-caption').textContent = zoom.dataset.caption;
    dialog.querySelector('[data-open-original]').href = asset(zoom.dataset.zoom);
    const dimensions = mediaDimensions[zoom.dataset.zoom];
    dialog.querySelector('[data-image-resolution]').textContent = dimensions ? `${dimensions.width} × ${dimensions.height}` : '';
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
});
view.addEventListener('change', e => {
  if (e.target.matches('[data-cover-filter]')) {
    getState(current).filter = e.target.value;
    getState(current).stage = 'index';
    render(current);
    view.querySelector('[data-cover-filter]').focus({ preventScroll: true });
    return;
  }
  if (e.target.matches('[data-evidence-category]')) {
    getState(current).category = e.target.value;
    getState(current).selected = '';
    updateEvidence('[data-evidence-category]');
    return;
  }
  if (!e.target.matches('[data-case],[data-sample]')) return;
  const selector = e.target.matches('[data-case]') ? '[data-case]' : '[data-sample]';
  getState(current).selected = e.target.value;
  updateEvidence(selector);
});
document.addEventListener('click', async e => {
  const button = e.target.closest('[data-copy-prompt]');
  if (!button) return;
  const status = button.parentElement.querySelector('[role="status"]');
  try {
    const prompt = button.closest('.prompt-panel').querySelector('pre');
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt.textContent);
      status.textContent = '已复制';
    } else {
      const range = document.createRange();
      range.selectNodeContents(prompt);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = '已选中文本，请手动复制';
    }
  } catch {
    status.textContent = '复制失败';
  }
});
dialog.querySelector('[data-native-zoom]').addEventListener('click', e => {
  const zoomed = dialog.classList.toggle('is-zoomed');
  e.currentTarget.setAttribute('aria-pressed', String(zoomed));
});
dialog.querySelector('[data-close-lightbox]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  dialog.classList.remove('is-zoomed');
  dialog.querySelector('[data-native-zoom]').setAttribute('aria-pressed','false');
  document.body.style.overflow = evidenceDialog.open ? 'hidden' : '';
  if (lastZoom?.isConnected) lastZoom.focus({ preventScroll:true });
});
evidenceDialog.addEventListener('click',e=>{if(e.target===evidenceDialog)evidenceDialog.close();});
evidenceDialog.addEventListener('close',()=>{
  document.body.style.overflow=dialog.open?'hidden':'';
  const trigger=lastStudyTrigger?.isConnected ? lastStudyTrigger : view.querySelector('[data-stack-current]');
  trigger?.focus({preventScroll:true});
  lastStudyTrigger=null;
});
function onHistory() {
  const requested = location.hash.slice(1) || 'home';
  const route = normalize(requested);
  navigate(route, { historyMode: route !== requested ? 'replace' : 'none', restore:true });
}
window.addEventListener('popstate', onHistory);
window.addEventListener('hashchange', onHistory);
history.scrollRestoration = 'manual';
let initial = location.hash.slice(1);
if (!initial) {
  try { initial = sessionStorage.getItem('zht-visited') ? 'archive' : 'home'; } catch { initial = 'home'; }
}
navigate(initial, { historyMode:'replace', animate:false });
document.addEventListener('DOMContentLoaded', icons, { once:true });
