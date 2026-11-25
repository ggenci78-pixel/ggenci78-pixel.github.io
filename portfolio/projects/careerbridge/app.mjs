import { workSamples, directions, discussions, opportunities, material, learningPaths, glossary, searchContent, contactQuestions, methodTemplate } from './content.mjs';
import { createStore, resolveRoute, makeDraft, sanitizeProfile, profileStages, profileGoals, skillStatuses, explorationDecisions, nextStepFor } from './state.mjs';

const main = document.querySelector('main');
const dialog = document.querySelector('#editor-dialog');
let storage;
try { storage = window.localStorage; } catch { /* The store provides an in-memory fallback. */ }
const store = createStore(storage);
const ui = {
  directionTab: 'overview', peerType: 'all', opportunityType: 'all', opportunityStatus: 'all',
  preferenceStep: 1, profileDraft: null, returnHash: '#/discover',
};
let route = resolveRoute(location.hash);
let dialogContext = {};
let toastTimer;
let opener;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const tag = text => `<span class="tag">${esc(text)}</span>`;
const button = (label, action, extra = '', primary = false) => `<button class="button${primary ? ' primary' : ''}" type="button" data-action="${action}" ${extra}>${label}</button>`;
const actionLink = (label, href, primary = false) => `<a class="button${primary ? ' primary' : ''}" href="${href}">${label}${icon('arrow-up-right')}</a>`;
const icons = () => window.lucide?.createIcons();
const breadcrumb = (title, href = '#/discover', label = '看岗位') => `<nav class="breadcrumb" aria-label="当前位置"><a href="${href}">${esc(label)}</a>${icon('chevron-right')}<span>${esc(title)}</span></nav>`;
const contextLink = (title, desc, href) => `<a class="context-link" href="${href}"><strong>${esc(title)}${icon('arrow-up-right')}</strong><p>${esc(desc)}</p></a>`;
const empty = text => `<p class="empty">${esc(text)}</p>`;

function notify(text) {
  const toast = document.querySelector('#toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}

function syncStorageNotice() {
  const notice = document.querySelector('#storage-notice');
  notice.textContent = store.notice();
  notice.hidden = !store.notice();
}

function persist(change, message) {
  const saved = store.update(change);
  syncStorageNotice();
  if (message) notify(saved ? message : '仅临时保留，未写入本地存储。请先导出记录。');
  return saved;
}

function bookmark(kind, id) {
  const key = `${kind}:${id}`;
  const active = store.get().bookmarks.includes(key);
  return `<button class="icon-button" type="button" data-action="bookmark" data-key="${key}" aria-label="${active ? '取消收藏' : '收藏'}" aria-pressed="${active}" title="${active ? '取消收藏' : '收藏'}">${icon('bookmark')}</button>`;
}

function discussionRow(id) {
  const post = discussions[id];
  return `<article class="post-row">
    <div class="tags">${tag(post.type)}<span class="small muted">${esc(directions[post.direction].title)} · 示例内容</span></div>
    <h3><a href="#/discussion/${id}">${esc(post.title)}</a></h3>
    <p class="excerpt">${esc(post.excerpt)}</p>
    <div class="post-meta"><span>${esc(post.author)}</span><span>${post.replies.length} 条示例回应</span></div>
  </article>`;
}

function opportunityRow(id) {
  const item = opportunities[id];
  return `<article class="post-row"><div class="tags">${tag(item.type)}${tag(item.status === 'open' ? '示例 · 开放' : '示例 · 已关闭')}</div>
    <h3><a href="#/opportunity/${id}">${esc(item.title)}</a></h3>
    <p class="excerpt">${esc(item.organization)} · ${esc(item.conditions[0][1])}</p>
    <div class="post-meta"><span>${esc(item.author)}</span><span>非真实招聘</span></div>
  </article>`;
}

function directionRow(id) {
  const item = directions[id];
  return contextLink(item.title, item.subtitle, `#/direction/${id}`);
}

function inCurrentDirection(item) {
  const scope = store.get().profile.activeDirection;
  return scope === 'all' || item.direction === scope;
}

function currentDirections() {
  const scope = store.get().profile.activeDirection;
  return Object.keys(directions).filter(id => scope === 'all' || id === scope);
}

function explorationContext() {
  const profile = store.get().profile;
  const choices = [...new Set([...(profile.interests.length ? profile.interests : Object.keys(directions)), ...(profile.activeDirection === 'all' ? [] : [profile.activeDirection])])];
  return `<section class="exploration-context" aria-label="探索偏好与方向">
    <div class="context-identity"><div><strong>${esc(profileStages[profile.stage] || '我的起点 · 尚未设置')}</strong>${profile.major ? `<span class="context-major">${esc(profile.major)}</span>` : ''}</div>
    ${button(`${icon('sliders-horizontal')}调整背景`, 'preferences')}</div>
    <label class="context-goal"><span>当前目标</span><select data-filter="profileGoal" aria-label="当前目标"><option value="">还没确定，先看看</option>${Object.entries(profileGoals).map(([value, label]) => `<option value="${value}" ${profile.goal === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
    <div class="direction-strip" role="group" aria-label="浏览方向"><button type="button" data-action="scope" data-id="all" aria-pressed="${profile.activeDirection === 'all'}">综合</button>${choices.map(id => `<button type="button" data-action="scope" data-id="${id}" aria-pressed="${profile.activeDirection === id}">${esc(directions[id].title)}</button>`).join('')}
    <button class="icon-button" type="button" data-action="preferences" data-step="3" aria-label="管理感兴趣的方向" title="管理感兴趣的方向">${icon('plus')}</button></div>
  </section>`;
}

function preferencesPage() {
  if (!ui.profileDraft) ui.profileDraft = structuredClone(store.get().profile);
  const draft = ui.profileDraft;
  const step = ui.preferenceStep;
  const editing = store.get().profile.status !== 'new';
  const titles = ['你目前处在哪个阶段？', '你现在最想做什么？', '从你的背景和兴趣出发'];
  return `<div class="onboarding">
    <header class="page-intro"><div><p class="eyebrow">探索偏好 / ${step} · 3</p><h1>${titles[step - 1]}</h1><p class="muted">选填 · 仅保存在当前浏览器，不是职业测评。</p></div></header>
    <ol class="onboarding-progress" aria-label="偏好设置进度">${['目前阶段', '当前目标', '背景与兴趣'].map((label, i) => `<li ${step === i + 1 ? 'aria-current="step"' : ''}>${i + 1} / ${label}</li>`).join('')}</ol>
    <form data-form="preferences">
    ${step === 1 ? `<fieldset class="preference-options"><legend>目前阶段</legend>${Object.entries(profileStages).map(([value, label]) => `<label class="choice-option"><input type="radio" name="stage" value="${value}" ${draft.stage === value ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}<label class="choice-option"><input type="radio" name="stage" value="" ${!draft.stage ? 'checked' : ''}><span>暂不选择</span></label></fieldset>`
      : step === 2 ? `<fieldset class="preference-options"><legend>当前目标</legend>${Object.entries(profileGoals).map(([value, label]) => `<label class="choice-option"><input type="radio" name="goal" value="${value}" ${draft.goal === value ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}<label class="choice-option"><input type="radio" name="goal" value="" ${!draft.goal ? 'checked' : ''}><span>还没有明确目标</span></label></fieldset>`
      : `<label class="field"><span>专业或已有工作方向（选填）</span><input type="text" name="major" maxlength="80" value="${esc(draft.major)}" placeholder="例如：视觉传达、市场营销、行政"></label>
      <fieldset class="preference-options"><legend>感兴趣的岗位方向（可多选，也可暂不选择）</legend>${Object.values(directions).map(item => `<label class="choice-option"><input type="checkbox" name="interests" value="${item.id}" ${draft.interests.includes(item.id) ? 'checked' : ''}><span>${esc(item.title)}<small>${esc(item.subtitle)}</small></span></label>`).join('')}</fieldset>
      <p class="small muted">本版提供两个方向样例。未选方向时仍可浏览综合内容，专业不会限制可看的方向。</p>`}
    <div class="onboarding-actions">${step > 1 ? button('上一步', 'preference-back') : ''}<button class="button primary" type="submit">${step === 3 ? '保存偏好，开始浏览' : '下一步'}</button>
    ${button(editing ? '取消，返回浏览' : '先随便看看', 'preference-skip')}</div>
    </form></div>`;
}

function searchHref(query, scope = store.get().profile.activeDirection) {
  return `#/search?${new URLSearchParams({ q: query, scope })}`;
}

function searchForm(query = '', scope = store.get().profile.activeDirection, expanded = false) {
  return `<form class="search-form" data-form="search" role="search" aria-label="内容搜索">
    <label class="search-input"><span class="sr-only">搜索关键词</span><input type="search" name="query" maxlength="120" value="${esc(query)}" placeholder="搜索岗位、工作问题或 AI 方法"></label>
    ${expanded ? `<label class="search-scope"><span class="sr-only">搜索方向</span><select name="scope" aria-label="搜索方向"><option value="all">全部方向</option>${Object.values(directions).map(item => `<option value="${item.id}" ${scope === item.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label>` : `<input type="hidden" name="scope" value="${esc(scope)}">`}
    <button class="icon-button" type="submit" aria-label="搜索" title="搜索">${icon('search')}</button></form>`;
}

function searchPage() {
  const results = searchContent(route.query, route.scope);
  return `${breadcrumb('搜索')}<header class="page-intro"><div><h1>搜索内容</h1><p class="small muted">仅检索本版公开示例，不搜索你的私有记录。</p></div></header>
    ${searchForm(route.query, route.scope, true)}
    ${route.query.trim() ? `<p class="small muted" role="status">${route.scope === 'all' ? '全部方向' : esc(directions[route.scope].title)} · ${results.length} 条结果</p>
    <section class="search-results" aria-label="搜索结果">${results.length ? results.map(item => contextLink(item.title, `${item.kind} · ${directions[item.direction].title} · ${item.description}`, item.href)).join('')
      : `${empty('没有找到相关示例。可以缩短关键词，或换一个方向。')}${route.scope !== 'all' ? actionLink('扩大到全部方向', searchHref(route.query, 'all')) : contextLink('先看有哪些方向', '目前提供产品经理与用户运营两个方向样例', '#/discover')}`}</section>`
      : `<section class="section"><h2>从一个具体问题开始</h2>${['需求', '访谈', '继任'].map(term => contextLink(term, '搜索现有示例内容', searchHref(term, 'all'))).join('')}</section>`}`;
}

function nextStepSection() {
  const state = store.get();
  const taskStarted = state.task.facts || state.task.unknown || state.task.next;
  const candidates = currentDirections().filter(id => state.profile.activeDirection !== 'all'
    || state.profile.interests.includes(id) || state.explorations[id].updated || (id === 'product' && taskStarted));
  if (!candidates.length) return '';
  const available = candidates.filter(id => state.explorations[id].decision !== 'pause');
  const id = available.find(id => state.explorations[id].nextAction.trim() && !state.explorations[id].actionDone)
    || available.find(id => Object.values(state.explorations[id].skills).some(skill => skill.status === 'learn'))
    || available.find(id => state.profile.interests.includes(id)) || available[0] || candidates[0];
  const step = nextStepFor(state, id);
  const started = state.explorations[id].updated || (id === 'product' && taskStarted);
  return `<section class="next-step" aria-label="我的下一步"><div class="section-heading"><p class="small muted">${started ? '继续探索' : '从这里开始'} · ${esc(directions[id].title)}</p><a class="small" href="#/exploration/${id}">我的探索记录</a></div>
    <h2>${esc(step.title)}</h2><p class="small muted">${esc(step.reason)}</p><div class="actions">${actionLink(step.label, step.href, true)}</div></section>`;
}

function explorationPage() {
  const id = route.id;
  const item = directions[id];
  const record = store.get().explorations[id];
  return `${breadcrumb('我的探索', `#/direction/${id}`, item.title)}
    <header class="page-intro"><div><p class="eyebrow">私有记录 / 无能力评分</p><h1>${esc(item.title)} · 我的探索</h1><p class="muted">先写下已有经历与还不确定的部分，再决定下一步。</p><div class="actions"><button type="button" class="text-link record-jump" data-action="jump-action">记录判断与下一步${icon('arrow-down')}</button></div></div></header>
    <form class="exploration-form" data-form="exploration" data-id="${id}">
    <section class="section"><h2>已有经历与待补点</h2><p class="small muted">以下是入门任务线索示例，不是统一招聘标准；“有相关经历”由你自己标记，不代表已通过岗位考核。</p>
    ${learningPaths[id].map(skill => {
      const saved = record.skills[skill.id];
      return `<article class="skill-row"><h3>${esc(skill.title)}</h3><p class="small">${esc(skill.transfer)}</p><p class="small muted">可以回看：${esc(skill.evidence)}</p>
      <label class="field"><span>${esc(skill.title)} · 当前状态</span><select name="skill-${skill.id}">${Object.entries(skillStatuses).map(([value, title]) => `<option value="${value}" ${saved.status === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>
      <details ${saved.note ? 'open' : ''}><summary>记录经历或卡点</summary><label class="field"><span>${esc(skill.title)} · 我的记录</span><textarea name="note-${skill.id}" maxlength="1000" placeholder="做过什么？有什么材料支持？还不确定什么？">${esc(saved.note)}</textarea></label></details>
      <div class="actions">${actionLink(skill.action, skill.href)}${button(`${icon('message-square')}准备追问`, 'compose', `data-direction="${id}" data-source="direction:${id}" data-skill="${skill.id}"`)}</div></article>`;
    }).join('')}</section>
    <section class="section decision-section"><h2>我目前的判断</h2><label class="field"><span>对这个方向的想法</span><select name="decision">${Object.entries(explorationDecisions).map(([value, title]) => `<option value="${value}" ${record.decision === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>
    <label class="field"><span>判断依据和待确认的问题</span><textarea name="reason" maxlength="2000" placeholder="哪些工作内容吸引你？哪些限制还要核实？也可以暂时不下结论。">${esc(record.reason)}</textarea></label>
    <label class="field"><span>我自己的下一步</span><input type="text" name="nextAction" maxlength="500" value="${esc(record.nextAction)}" placeholder="例如：带着一份问题说明向学长确认"></label>
    <label class="check"><input type="checkbox" name="actionDone" ${record.actionDone ? 'checked' : ''}><span>这一步已完成（自记，不代表能力认证）</span></label>
    <div class="actions"><button class="button primary" type="submit">${icon('save')}保存探索记录</button>${actionLink('回到方向概览', `#/direction/${id}`)}</div>
    <p class="small muted save-status" data-save-status role="status">输入会尝试自动保存在当前浏览器，不公开。</p>
    <div class="actions">${button(`${icon('trash-2')}清除此方向记录`, 'clear-exploration', `data-id="${id}"`)}</div></section></form>`;
}

function discoverPage() {
  const ids = currentDirections();
  const profile = store.get().profile;
  return `<header class="page-intro work-intro"><div><h1>先看懂一份工作</h1><p>岗位每天做什么，交出什么？<br>从一个工作样本开始，找到自己的入门方向。</p></div></header>
    <div class="direction-strip work-filters" role="group" aria-label="浏览方向">${[['all', '全部岗位'], ...Object.values(directions).map(item => [item.id, item.title])].map(([id, title]) => `<button type="button" data-action="scope" data-id="${id}" aria-pressed="${profile.activeDirection === id}">${title}</button>`).join('')}</div>
    <section class="work-samples" aria-label="岗位工作样本">${ids.map(id => {
      const sample = workSamples[id];
      return `<article class="work-sample"><div class="tags">${tag(directions[id].title)}<span class="small muted">构造工作样本 · 非企业材料</span></div>
        <h2><a href="#/direction/${id}">${esc(sample.title)}</a></h2><p class="sample-summary">${esc(sample.summary)}</p>
        <div class="sample-output" role="figure" aria-label="${esc(sample.outputTitle)}预览"><div class="document-top">${icon('file-text')}<strong>${esc(sample.outputTitle)}</strong><span class="small muted">产物片段</span></div><p>${esc(sample.output[0][1])}</p></div>
        <div class="actions">${actionLink('看看这份工作', `#/direction/${id}`, true)}${id === 'product' ? `<a class="text-link" href="#/task/feedback">我也试一小段${icon('arrow-right')}</a>` : `<a class="text-link" href="#/discussion/ai-method">看 AI 整理流程${icon('arrow-right')}</a>`}</div>
      </article>`;
    }).join('')}</section>
    ${nextStepSection()}
    <section class="section"><h2>想找别的工作内容？</h2>${searchForm()}<div class="actions">${button(`${icon('sliders-horizontal')}设置我的背景与兴趣`, 'preferences')}</div></section>
    <section class="section"><h2>有问题，或想进一步求职？</h2>${contextLink('问问做过的人', '围绕工作材料、入门困惑和 AI 方法交流', '#/peers')}${contextLink('实习继任与内推', '了解具体工作、带教与申请条件 · 当前为示例机会', '#/opportunities')}</section>`;
}

function overviewPanel(item) {
  const sample = workSamples[item.id];
  return `<div class="two-column"><div>
    <section class="section"><h2>${esc(sample.inputTitle)}</h2><p>${esc(sample.context)}</p>${sample.input.map((text, i) => `<div class="material-item"><span>材料 ${i + 1} · 构造示例</span><p>${esc(text)}</p></div>`).join('')}</section>
    <section class="section"><h2>这份工作怎么推进</h2><ol class="row-list">${sample.steps.map((text, i) => `<li><span class="row-number">0${i + 1}</span><span>${esc(text)}</span></li>`).join('')}</ol></section>
    <section class="section"><h2>最后交出什么？</h2><div class="document" role="figure" aria-label="${esc(sample.outputTitle)}的示例">
      <div class="document-top"><span class="small">工作产物 / 示例</span>${icon('file-text')}</div>
      <h3>${esc(sample.outputTitle)}</h3><dl>${sample.output.map(([title, text]) => `<div><dt>${esc(title)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl>
      <p class="document-note">构造示例 · 不是标准答案或真实业务数据</p></div></section>
    <section class="section"><h2>AI 可以帮到哪一步？</h2><p>${esc(sample.ai)}</p>${item.id === 'operations' ? contextLink('查看步骤与流程模板', '输入、输出、人工检查点', '#/discussion/ai-method') : ''}</section>
    <section class="section"><h2>常见的工作片段</h2><ol class="row-list">${item.tasks.map((task, i) => `<li><span class="row-number">0${i + 1}</span><span>${esc(task)}</span></li>`).join('')}</ol></section>
    <section class="section"><h2>从一个小任务开始</h2>${item.id === 'product' ? `<p>校园二手交易里，有人收藏却没有联系卖家。你收到三条材料，先判断还需要了解什么。</p><div class="actions">${actionLink('查看材料并尝试', '#/task/feedback', true)}<span class="small muted">构造情境 · 无能力评分</span></div>` : `<p>先看看如何整理用户访谈：输入什么、怎样归类、哪些判断仍要自己检查。</p><div class="actions">${actionLink('查看方法讨论', '#/discussion/ai-method')}</div><p class="small muted">此方向目前只有概览与方法示例，没有完整任务体验。</p>`}</section>
    <section class="section"><h2>先了解这些限制</h2>${item.limits.map(text => `<p class="muted">${esc(text)}</p>`).join('')}<p>${esc(item.entry)}</p></section>
  </div><aside>
    <section class="section"><h2>接下来想了解什么？</h2>${contextLink(sample.question, '带着这份工作材料问问同行', `#/discussion/${sample.discussion}`)}${contextLink('我有哪些经历用得上？', learningPaths[item.id][0].transfer, `#/exploration/${item.id}`)}${contextLink('这个岗位的实习是什么样？', '查看工作范围与带教待确认项 · 非真实招聘', `#/opportunity/${item.opportunityIds[0]}`)}</section>
    <section class="section"><h2>相关机会</h2>${opportunityRow(item.opportunityIds[0])}</section>
  </aside></div>`;
}

function directionPage() {
  const item = directions[route.id];
  const following = store.get().following.includes(item.id);
  return `${breadcrumb(item.title)}
    <header class="page-intro"><div><p class="eyebrow">${esc(item.title)} / 构造工作样本</p><h1>${esc(workSamples[item.id].title)}</h1><p>${esc(workSamples[item.id].summary)}</p></div>
      <button class="button small subtle" type="button" data-action="follow" data-id="${item.id}" aria-pressed="${following}">${icon(following ? 'check' : 'plus')}${following ? '已关注' : '关注'}</button>
    </header>
    <div class="tabs" role="tablist" aria-label="方向内容">${[['overview', '工作概览'], ['discussion', '同行讨论'], ['opportunity', '相关机会']].map(([id, title]) => `<button id="tab-${id}" type="button" role="tab" aria-controls="direction-panel" aria-selected="${ui.directionTab === id}" tabindex="${ui.directionTab === id ? '0' : '-1'}" data-action="direction-tab" data-tab="${id}">${title}</button>`).join('')}</div>
    <div id="direction-panel" role="tabpanel" aria-labelledby="tab-${ui.directionTab}">${ui.directionTab === 'overview' ? overviewPanel(item) : ui.directionTab === 'discussion'
      ? `<div class="actions">${button(`${icon('square-pen')}写一个问题`, 'compose', `data-direction="${item.id}"`)}</div>${item.discussionIds.map(discussionRow).join('')}`
      : `<p class="small muted">示例机会，不可真实投递；无需完成任务即可查看。</p>${item.opportunityIds.map(opportunityRow).join('')}`}</div>`;
}

function discussionPage() {
  const item = discussions[route.id];
  return `${breadcrumb(item.title, '#/peers', '同行')}
    <header class="page-intro"><div><div class="tags">${tag(item.type)}${tag('构造示例')}<a class="small" href="#/direction/${item.direction}">${esc(directions[item.direction].title)}</a></div><h1>${esc(item.title)}</h1></div>${bookmark('discussion', item.id)}</header>
    <div class="two-column"><article>
      <div class="author"><div class="avatar" aria-hidden="true">示例</div><div><strong>${esc(item.author)}</strong><p>${esc(item.role)}</p></div></div>
      <div class="article-copy">${item.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}</div>
      ${item.workflow ? workflowPanel(item) : ''}
      <section class="section" style="margin-top:26px"><h2>讨论 · 示例回应</h2>${item.replies.map(reply => `<article class="reply"><strong>${esc(reply.author)}</strong><div class="muted">${esc(reply.relation)}</div><p>${esc(reply.text)}</p></article>`).join('')}</section>
      <section class="section"><h2>写下你的追问或补充</h2><form data-form="reply" data-id="${item.id}"><label class="field"><span>具体内容</span><textarea name="body" maxlength="4000" required placeholder="你想进一步确认什么？"></textarea></label><p class="small muted">仅保存到本地草稿，不会进入公开讨论。</p><div class="actions"><button class="button primary" type="submit">保存回复草稿</button></div><p class="form-error" role="alert" hidden></p></form></section>
    </article><aside>
      <section class="section"><h2>相关背景</h2>${directionRow(item.direction)}
      ${item.task ? contextLink('从这份材料开始', '查看三条原始材料，再尝试作判断', '#/task/feedback') : ''}
      ${item.opportunity ? contextLink('看看这段工作的继任示例', '工作自述、条件与来源放在一起', `#/opportunity/${item.opportunity}`) : ''}
      </section>
      <div class="side-note"><strong>来源边界</strong><p>人物、任职关系与回应均为示例，没有经过真实从业者校对或身份核验。</p></div>
    </aside></div>`;
}

function workflowPanel(item) {
  const saved = store.get().explorations.operations.skills.workflow.status === 'learn';
  return `<section class="section"><h2>把方法带走试一次</h2><dl class="facts"><div><dt>输入边界</dt><dd>${esc(item.workflow.input)}</dd></div><div><dt>预期产物</dt><dd>${esc(item.workflow.output)}</dd></div></dl>
    <ol class="row-list">${item.workflow.steps.map((step, i) => `<li><span class="row-number">${i + 1}</span><span>${esc(step)}</span></li>`).join('')}</ol>
    <details><summary>人工复核清单</summary><ul>${item.workflow.checks.map(check => `<li>${esc(check)}</li>`).join('')}</ul></details>
    <div class="actions">${button(`${icon('download')}下载流程模板`, 'download-method')}${saved ? actionLink('查看我的待补点', '#/exploration/operations') : button(`${icon('list-plus')}加入待补点`, 'plan-method')}</div>
    <p class="small muted" style="margin-top:12px">构造方法样例 · 未在此原型运行模型或验证效果。模板不包含你的私有记录。</p></section>`;
}

function opportunityPage() {
  const item = opportunities[route.id];
  const intention = store.get().intentions.find(record => record.source === item.id);
  return `${breadcrumb(item.title, '#/opportunities', '机会')}
    <header class="page-intro"><div><div class="tags">${tag(item.type)}${tag(item.status === 'open' ? '示例 · 开放' : '示例 · 已关闭')}</div><h1>${esc(item.title)}</h1><p>${esc(item.organization)}</p></div>${bookmark('opportunity', item.id)}</header>
    <p class="source-summary">来源：${esc(item.author)} · 任职关系与公开授权未核验 · 不可真实申请</p>
    <div class="two-column"><div>
      <dl class="facts">${item.conditions.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      <section class="section"><h2>这段工作具体做什么</h2><ol class="row-list">${item.work.map((work, i) => `<li><span class="row-number">0${i + 1}</span><span>${esc(work)}</span></li>`).join('')}</ol></section>
      <section class="section"><h2>不应忽略的部分</h2><p>${esc(item.limits)}</p></section>
      <section class="section"><h2>先看看相关经历与讨论</h2>${contextLink(discussions[item.discussion].title, '了解工作背景，也可以留下本地追问草稿', `#/discussion/${item.discussion}`)}${item.question ? contextLink(discussions[item.question].title, '这个方向中的具体问题', `#/discussion/${item.question}`) : ''}</section>
      <details><summary>正式申请与沟通有什么不同？</summary><p>联系发布者只是沟通意向，不代表已投递或被录用。此原型没有真实申请渠道，也不会发送消息。</p></details>
      ${intention ? `<p class="result-label">${icon('file-check-2')}本地意向已保存 · 未发送</p>` : ''}
      <div class="opportunity-actions">${item.status === 'open' ? button(intention ? '编辑本地沟通意向' : '准备沟通意向', 'intention', `data-id="${item.id}"`, true) : '<button class="button primary" disabled>示例已关闭，不能发起意向</button>'}${button('反馈信息问题', 'report', `data-id="${item.id}"`)}</div>
    </div><aside>
      <div class="source-panel"><h2>来源与核查范围</h2><p><strong>${esc(item.author)}</strong></p><p>${esc(item.source)}</p>
        <dl class="facts"><div><dt>任职关系</dt><dd>未核验 · 示例人物</dd></div><div><dt>公开授权</dt><dd>未核验</dd></div><div><dt>申请渠道</dt><dd>未接入</dd></div><div><dt>示例整理</dt><dd>2026-11-03</dd></div></dl>
        <p>此条为原型示例，不能真实申请。未来真实机会未经必要审核，不应进入公开列表。</p></div>
      <section class="section"><h2>这个方向还有什么</h2>${directionRow(item.direction)}</section>
      <div class="side-note"><strong>不以任务换申请资格</strong><p>实践与作品均为自愿，不需要先做任务或公开个人资料才能了解机会。</p></div>
    </aside></div>`;
}

function peersPage() {
  const items = Object.values(discussions).filter(post => inCurrentDirection(post) && (ui.peerType === 'all' || post.type === ui.peerType));
  return `<header class="page-intro"><div><p class="eyebrow">同行 / 经历、问题与方法</p><h1>同行讨论</h1><p class="muted">示例帖子与回应，未接入真实社区。</p></div>${button(icon('square-pen'), 'compose', 'aria-label="写一个问题" title="写一个问题"')}</header>
    ${searchForm()}
    ${explorationContext()}
    ${store.get().drafts.length ? `<div class="draft-shelf"><span>${store.get().drafts.length} 条私有草稿 · 未发布</span><a href="#/me">继续编辑</a></div>` : ''}
    <div class="filters"><label class="field"><span>内容类型</span><select data-filter="peerType" aria-label="内容类型">${['all', '提问', '经历', '方法'].map(value => `<option value="${value}" ${ui.peerType === value ? 'selected' : ''}>${value === 'all' ? '全部类型' : value}</option>`).join('')}</select></label></div>
    ${items.length ? items.map(item => discussionRow(item.id)).join('') : `${empty('没有符合筛选条件的示例内容，可以调整筛选。')}${button(`${icon('rotate-ccw')}重置讨论筛选`, 'reset-filters', 'data-page="peers"')}`}`;
}

function opportunitiesPage() {
  const items = Object.values(opportunities).filter(item => inCurrentDirection(item) && (ui.opportunityType === 'all' || item.type === ui.opportunityType) && (ui.opportunityStatus === 'all' || item.status === ui.opportunityStatus));
  return `<header class="page-intro"><div><p class="eyebrow">机会 / 先看清工作与来源</p><h1>从机会了解下一步</h1><p class="muted">全部为示例，没有真实职位、内推码或申请通道。</p></div></header>
    ${searchForm()}
    ${explorationContext()}
    <div class="filters"><label class="field"><span>机会类型</span><select data-filter="opportunityType" aria-label="机会类型">${['all', '实习继任', '内推'].map(value => `<option value="${value}" ${ui.opportunityType === value ? 'selected' : ''}>${value === 'all' ? '全部类型' : value}</option>`).join('')}</select></label>
    <label class="field"><span>状态</span><select data-filter="opportunityStatus" aria-label="状态">${[['all', '全部状态'], ['open', '示例开放'], ['closed', '示例关闭']].map(([value, title]) => `<option value="${value}" ${ui.opportunityStatus === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label></div>
    ${items.length ? items.map(item => opportunityRow(item.id)).join('') : `${empty('没有符合条件的示例机会，可以调整筛选。')}${button(`${icon('rotate-ccw')}重置机会筛选`, 'reset-filters', 'data-page="opportunities"')}`}`;
}

function taskPage() {
  const task = store.get().task;
  return `${breadcrumb('尝试一个工作任务', '#/direction/product', '产品经理')}
    <header class="page-intro"><div><div class="tags">${tag('构造情境')}${tag('预设参考，不是 AI 评分')}</div><h1>先把问题说清楚</h1><p>同事问：收藏后联系卖家的人较少，我们是不是应该先改按钮？请整理一页讨论依据。</p></div></header>
    <nav class="step-list" aria-label="任务步骤">${[['1', '读材料'], ['2', '写判断'], ['3', '对照与求助']].map(([step, title]) => `<button type="button" data-action="task-step" data-step="${step}" ${task.step === Number(step) ? 'aria-current="step"' : ''}>${step} / ${title}</button>`).join('')}</nav>
    <div class="two-column"><div>${task.step > 1 ? `<details class="inline-material"><summary>随时回看原始材料</summary>${material.map(item => `<div class="material-item"><span>${esc(item.label)}</span><p>${esc(item.text)}</p></div>`).join('')}</details>` : ''}${task.step === 1 ? `<section class="section"><h2>你目前收到的材料</h2>${material.map(item => `<div class="material-item"><span>${esc(item.label)}</span><p>${esc(item.text)}</p></div>`).join('')}<div class="actions">${button('继续，写下我的判断', 'task-step', 'data-step="2"', true)}</div></section>`
      : task.step === 2 ? `<section class="section"><h2>留下一份可讨论的判断</h2><p class="small muted">没有唯一标准答案。记录会尝试保存在当前浏览器，不公开。</p>
      ${[['facts', '已经知道的事实', '哪条材料支持这个观察？'], ['unknown', '还不确定的部分', '哪些是你的假设，暂时没有证据？'], ['next', '想补充的证据或下一步', '你准备问谁，或再看什么资料？']].map(([name, label, placeholder]) => `<label class="field"><span>${label}</span><textarea data-task-field="${name}" maxlength="4000" placeholder="${placeholder}">${esc(task[name])}</textarea></label>`).join('')}<div class="actions">${button('保存并去对照', 'task-step', 'data-step="3"', true)}</div></section>`
      : `<section class="section"><h2>先回看自己的判断</h2>${task.facts || task.unknown || task.next ? `<div class="document"><dl>${[['facts', '事实'], ['unknown', '不确定'], ['next', '下一步']].map(([key, title]) => `<div><dt>${title}</dt><dd>${esc(task[key] || '尚未填写')}</dd></div>`).join('')}</dl></div>` : empty('还没有写下判断。可以返回填写，也可以先查看参考。')}
      <div class="actions">${button(task.reference ? '收起预设参考' : '查看预设参考', 'reference', `aria-expanded="${task.reference}"`)}</div>
      ${task.reference ? `<div class="reference"><h3>一种参考思路 · 非唯一答案</h3><p>已知：两位用户给出了不同的描述。目前无法确定入口问题和流程顾虑哪个更常见。</p><p>待确认：用户是否看见入口？联系后会发生什么？材料不够，不急着决定改按钮。</p><p>下一步：补充具体页面和操作过程，区分观察与假设，再与同事讨论。</p></div>` : ''}
      <div class="actions">${button(`${icon('message-square')}带着材料提问`, 'compose', 'data-source="task:feedback" data-direction="product"', true)}${actionLink('看看别人怎么问', '#/discussion/feedback')}</div>
      <p class="small muted" style="margin-top:12px">不会自动附上你的输入；是否引用由你决定。</p></section>`}</div><aside>
      <section class="section"><h2>留给自己的下一步</h2>${contextLink('整理我的经历与待补点', '做过一次任务不等于掌握岗位能力，判断由你自己记录', '#/exploration/product')}</section>
      <section class="section"><h2>这不是完整的岗位</h2><p class="small">此任务只体验问题澄清，没有涵盖团队协调、排期和上线。不会输出职业适合度。</p></section>
      <details><summary>“事实”和“假设”有什么区别？</summary><p>事实应能指向材料；假设是对原因的暂时解释。例如“用户 B 有顾虑”来自原话，“所有用户都不信任平台”则没有足够依据。</p></details>
      <details><summary>遇到的工作术语</summary><dl class="glossary">${glossary.map(([term, definition]) => `<div><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join('')}</dl></details>
      ${contextLink('回到职业方向', '任务不是查看机会的前置条件', '#/direction/product')}
    </aside></div>`;
}

function recordList(records, field) {
  return records.length ? records.map(record => `<article class="record-row"><div class="tags">${tag(field === 'intentions' ? '本地意向 · 未发送' : field === 'reports' ? '本地反馈 · 未提交' : '私有草稿')}</div><h3>${esc(record.title)}</h3>
    ${record.source && (field === 'intentions' || field === 'reports') ? `<a class="small" href="#/opportunity/${esc(record.source)}">查看关联机会</a>` : ''}
    <details><summary>查看记录内容</summary>${record.attachment ? `<p class="small muted">${esc(record.attachment)}</p>` : ''}<p class="record-body">${esc(record.body)}</p></details>
    <div class="actions">${field === 'drafts' ? button(`${icon('pencil')}编辑草稿`, 'edit-draft', `data-id="${esc(record.id)}"`) : ''}${field === 'drafts' && publicContext(record.source).href ? actionLink('回到关联内容', publicContext(record.source).href) : ''}${button(`${icon('trash-2')}删除`, 'delete-record', `data-field="${field}" data-id="${esc(record.id)}"`, false)}</div></article>`).join('') : empty('还没有本地记录。');
}

function mePage() {
  const state = store.get();
  const taskStarted = state.task.facts || state.task.unknown || state.task.next;
  return `<header class="page-intro"><div><p class="eyebrow">我的 / 当前浏览器</p><h1>保留自己的探索</h1><p class="muted">未注册、无云同步；草稿与意向默认私有。清除浏览器数据后可能丢失。</p></div></header>
    <div class="two-column"><div>
      <section class="section"><h2>我的探索记录</h2>${Object.keys(directions).filter(id => state.explorations[id].updated).map(id => {
        const record = state.explorations[id];
        return contextLink(directions[id].title, `${explorationDecisions[record.decision]}${record.nextAction ? ` · ${record.actionDone ? '已完成这一步' : '下一步'}：${record.nextAction}` : ''}`, `#/exploration/${id}`);
      }).join('') || empty('还没有留下探索判断。可以从方向页整理已有经历和待补点。')}</section>
      <section class="section"><h2>关注的方向</h2>${state.following.length ? state.following.map(directionRow).join('') : empty('还没有关注方向。')}</section>
      <section class="section"><h2>收藏</h2>${state.bookmarks.length ? state.bookmarks.map(key => { const [kind, id] = key.split(':'); const item = kind === 'discussion' ? discussions[id] : opportunities[id]; return contextLink(item.title, kind === 'discussion' ? '示例讨论' : '示例机会', `#/${kind}/${id}`); }).join('') : empty('还没有收藏内容。')}</section>
      <section class="section"><h2>问题与回复草稿</h2>${recordList(state.drafts, 'drafts')}</section>
      <section class="section"><h2>沟通意向</h2>${recordList(state.intentions, 'intentions')}</section>
      <section class="section"><h2>信息反馈</h2>${recordList(state.reports, 'reports')}</section>
    </div><aside>
      <section class="section"><h2>探索偏好</h2><p>${esc(profileStages[state.profile.stage] || '阶段未设置')}${state.profile.major ? ` · ${esc(state.profile.major)}` : ''}</p><p class="small muted">${esc(profileGoals[state.profile.goal] || '目标未确定')}</p><div class="actions">${button(`${icon('settings-2')}修改偏好`, 'preferences')}</div></section>
      <section class="section"><h2>实践记录</h2>${taskStarted ? contextLink('先把问题说清楚', '继续查看或修改自己的判断', '#/task/feedback') : empty('还没有写下实践判断。')}</section>
      <section class="section"><h2>本地数据</h2><p class="small muted">导出包含你输入的文字，请自行确认保存位置和隐私。</p><div class="actions">${button(`${icon('download')}导出记录`, 'export')}${button(`${icon('trash-2')}清除记录`, 'clear')}</div></section>
    </aside></div>`;
}

function focusRecordField(name) {
  const target = main.querySelector(`[name="${name}"]`);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'center', behavior: 'instant' });
}

function render({ focus = false } = {}) {
  route = resolveRoute(location.hash);
  if (route.page !== 'preferences') {
    ui.profileDraft = null;
    ui.preferenceStep = 1;
  }
  const pages = {
    discover: discoverPage, direction: directionPage, discussion: discussionPage, opportunity: opportunityPage,
    peers: peersPage, opportunities: opportunitiesPage, task: taskPage, me: mePage, preferences: preferencesPage,
    exploration: explorationPage, search: searchPage,
  };
  main.innerHTML = pages[route.page]?.() || `<h1>没有这个页面</h1><p class="empty">这个地址不在当前原型中。</p>${actionLink('回到发现', '#/discover')}`;
  const active = ['direction', 'task', 'search'].includes(route.page) ? 'discover' : route.page === 'exploration' ? 'me' : route.page === 'discussion' ? 'peers' : route.page === 'opportunity' ? 'opportunities' : route.page;
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${main.querySelector('h1')?.textContent || 'CareerBridge'} · CareerBridge 低保真`;
  icons();
  syncStorageNotice();
  if (focus) main.focus({ preventScroll: true });
  if (route.page === 'exploration' && route.focus) {
    const name = route.focus === 'action' ? 'nextAction' : 'decision';
    requestAnimationFrame(() => focusRecordField(name));
  }
}

function openDialog(title, content, context = {}) {
  opener = document.activeElement;
  dialogContext = context;
  dialog.innerHTML = `<div class="dialog-inner"><div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="关闭">${icon('x')}</button></div>${content}</div>`;
  icons();
  dialog.showModal();
  const input = dialog.querySelector('input[type="text"], textarea, select');
  input?.focus();
}

function closeDialog() {
  dialog.close();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

function publicContext(source) {
  const [kind, id] = source.split(':');
  if (kind === 'task' && id === 'feedback') return { title: '任务：先把问题说清楚', href: '#/task/feedback' };
  if (kind === 'discussion' && Object.hasOwn(discussions, id)) return { title: `讨论：${discussions[id].title}`, href: `#/discussion/${id}` };
  if (kind === 'direction' && Object.hasOwn(directions, id)) return { title: `方向：${directions[id].title}`, href: `#/direction/${id}` };
  return { title: '', href: '' };
}

function composeQuestion(trigger, existing = null) {
  const scope = store.get().profile.activeDirection;
  const direction = existing?.direction || trigger.dataset.direction || (['direction', 'exploration'].includes(route.page) ? route.id : route.page === 'discussion' ? discussions[route.id].direction : scope !== 'all' ? scope : 'product');
  const source = existing?.source || trigger.dataset.source || (route.page === 'discussion' ? `discussion:${route.id}` : '');
  const sourceTitle = existing?.attachment || publicContext(source).title;
  const skill = learningPaths[direction].find(item => item.id === trigger.dataset.skill);
  openDialog(existing ? '编辑私有草稿' : '写一个具体问题', `<form data-form="question">
    <p class="small muted">只保存私有草稿，不公开发布，也没有真实接收者。</p>
    <label class="field"><span>关联方向</span><select name="direction">${Object.values(directions).map(item => `<option value="${item.id}" ${direction === item.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label>
    <label class="field"><span>问题标题</span><input type="text" name="title" maxlength="200" required value="${esc(existing?.title || skill?.question || '')}" placeholder="你具体想确认什么？"></label>
    <label class="field"><span>背景与卡点</span><textarea name="body" maxlength="4000" required placeholder="你想达到什么目标？已经查过或尝试了什么？具体卡在哪里？">${esc(existing?.body || '')}</textarea></label>
    ${sourceTitle ? `<label class="check"><input type="checkbox" name="includeSource" checked><span>附上公开背景：${esc(sourceTitle)}。不包含你在任务中写的内容。</span></label>` : ''}
    <p class="form-error" role="alert" hidden></p><div class="dialog-actions">${button('取消', 'close-dialog')}<button class="button primary" type="submit">保存私有草稿</button></div>
  </form>`, { source, sourceTitle, existing });
}

function intentionDialog(id) {
  const item = opportunities[id];
  if (item.status !== 'open') return;
  const existing = store.get().intentions.find(record => record.source === id);
  openDialog('准备沟通意向', `<form data-form="intention"><div class="dialog-context">${esc(item.title)} · ${esc(item.organization)}</div>
    <p class="small muted" style="margin-top:12px">仅保存到本机，不会发送消息或投递简历。无需附上作品或实践记录。</p>
    <fieldset class="preference-options"><legend>可选：把待确认问题加入意向</legend>${contactQuestions[id].map((question, i) => `<label class="check"><input type="checkbox" name="contactQuestion" value="${i}"><span>${esc(question)}</span></label>`).join('')}</fieldset>
    <label class="field"><span>你想进一步确认什么？</span><textarea name="body" maxlength="4000" placeholder="补充自己的情况与具体问题，不必附上简历或任务记录。">${esc(existing?.body || '')}</textarea></label>
    <details><summary>保存内容预览</summary><p class="record-body" data-intention-preview>${esc(existing?.body || '尚未填写或选择问题。')}</p></details>
    <label class="check"><input type="checkbox" name="ack" required><span>我知道这是示例机会，本次只保存本地意向，没有真实申请或录用。</span></label>
    <p class="form-error" role="alert" hidden></p><div class="dialog-actions">${button('取消', 'close-dialog')}<button class="button primary" type="submit">保存本地意向 · 不发送</button></div></form>`, { id, existing });
}

function reportDialog(id) {
  openDialog('记录信息问题', `<form data-form="report"><p class="small muted">仅保留本地反馈，不会提交给平台或发布者。</p><label class="field"><span>问题描述</span><textarea name="body" maxlength="4000" required placeholder="例如：希望更清楚地说明来源、授权或有效期。"></textarea></label><p class="form-error" role="alert" hidden></p><div class="dialog-actions">${button('取消', 'close-dialog')}<button class="button primary" type="submit">保存反馈记录</button></div></form>`, { id });
}

function addRecord(field, record) {
  return persist(state => ({ ...state, [field]: [record, ...state[field].filter(item => item.id !== record.id)] }), field === 'intentions' ? '本地意向已保存，未发送。' : field === 'reports' ? '反馈已保存在本机，未提交。' : '私有草稿已保存在本机，未发布。可在“我的”继续编辑。');
}

function intentionBody(form) {
  const data = new FormData(form);
  const body = String(data.get('body') || '').trim();
  const questions = contactQuestions[dialogContext.id] || [];
  return [body, ...data.getAll('contactQuestion').map(index => questions[Number(index)]).filter(question => question && !body.includes(question))].filter(Boolean).join('\n');
}

function saveExploration(form, announce = false) {
  const id = form.dataset.id;
  if (!Object.hasOwn(directions, id)) return;
  const data = new FormData(form);
  const record = {
    skills: Object.fromEntries(learningPaths[id].map(skill => [skill.id, { status: data.get(`skill-${skill.id}`), note: data.get(`note-${skill.id}`) }])),
    decision: data.get('decision'), reason: data.get('reason'), nextAction: data.get('nextAction'),
    actionDone: data.has('actionDone'), updated: new Date().toISOString(),
  };
  const saved = persist(state => ({ ...state, explorations: { ...state.explorations, [id]: record } }), announce ? '探索记录已保存在本机，不公开。' : '');
  form.querySelector('[data-save-status]').textContent = saved ? '已保存在本机 · 不公开 · 无云同步' : '仅临时保留，写入失败；请先导出需要的记录。';
}

function downloadText(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function capturePreferences(form = main.querySelector('[data-form="preferences"]')) {
  if (!form || !ui.profileDraft) return;
  const data = new FormData(form);
  if (ui.preferenceStep === 1) ui.profileDraft.stage = data.get('stage') || '';
  else if (ui.preferenceStep === 2) ui.profileDraft.goal = data.get('goal') || '';
  else {
    ui.profileDraft.major = String(data.get('major') || '').trim();
    ui.profileDraft.interests = data.getAll('interests');
  }
}

function leavePreferences() {
  ui.profileDraft = null;
  ui.preferenceStep = 1;
  location.hash = ui.returnHash;
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    main.focus();
    return;
  }
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const { action } = trigger.dataset;
  if (action === 'jump-action') {
    focusRecordField('nextAction');
  } else if (action === 'preferences') {
    if (route.page === 'preferences') return;
    ui.returnHash = route.page === 'not-found' ? '#/discover' : location.hash || '#/discover';
    ui.profileDraft = structuredClone(store.get().profile);
    ui.preferenceStep = trigger.dataset.step === '3' ? 3 : 1;
    location.hash = '#/preferences';
  } else if (action === 'preference-back') {
    capturePreferences();
    ui.preferenceStep = Math.max(1, ui.preferenceStep - 1);
    render({ focus: true });
  } else if (action === 'preference-skip') {
    if (store.get().profile.status === 'new') {
      persist(state => ({ ...state, profile: { ...state.profile, status: 'skipped' } }), '已跳过设置，之后可随时修改。');
    }
    leavePreferences();
  } else if (action === 'scope') {
    const scope = trigger.dataset.id;
    if (scope !== 'all' && !Object.hasOwn(directions, scope)) return;
    persist(state => ({ ...state, profile: { ...state.profile, activeDirection: scope } }));
    render();
    main.querySelector(`[data-action="scope"][data-id="${scope}"]`)?.focus({ preventScroll: true });
  } else if (action === 'reset-filters') {
    if (trigger.dataset.page === 'peers') ui.peerType = 'all';
    else { ui.opportunityType = 'all'; ui.opportunityStatus = 'all'; }
    persist(state => ({ ...state, profile: { ...state.profile, activeDirection: 'all' } }));
    render({ focus: true });
  } else if (action === 'download-method') {
    downloadText(methodTemplate(), 'careerbridge-interview-workflow.md', 'text/markdown;charset=utf-8');
  } else if (action === 'plan-method') {
    persist(state => {
      const record = state.explorations.operations;
      return { ...state, explorations: { ...state.explorations, operations: {
        ...record, skills: { ...record.skills, workflow: { ...record.skills.workflow, status: 'learn' } }, updated: new Date().toISOString(),
      } } };
    }, '已加入本地待补点；不会自动标记为掌握。');
    render();
    main.querySelector('a[href="#/exploration/operations"]')?.focus({ preventScroll: true });
  } else if (action === 'edit-draft') {
    const record = store.get().drafts.find(item => item.id === trigger.dataset.id);
    if (record) composeQuestion(trigger, record);
  } else if (action === 'clear-exploration') {
    openDialog('清除此方向的探索记录？', `<p>将清除此方向的经历笔记、待补点、判断和下一步；不会删除任务输入、草稿、关注或另一方向的记录。</p><div class="dialog-actions">${button('取消', 'close-dialog')}${button('确认清除此方向', 'confirm-clear-exploration', '', true)}</div>`, { id: trigger.dataset.id });
  } else if (action === 'confirm-clear-exploration') {
    const id = dialogContext.id;
    persist(state => ({ ...state, explorations: { ...state.explorations, [id]: null } }), '此方向的本地探索记录已清除。');
    closeDialog();
    render({ focus: true });
  } else if (action === 'follow') {
    const id = trigger.dataset.id;
    const active = store.get().following.includes(id);
    persist(state => ({ ...state, following: active ? state.following.filter(item => item !== id) : [...state.following, id] }), active ? '已取消关注。' : '已关注，保存在本机。');
    render();
    main.querySelector('[data-action="follow"]')?.focus({ preventScroll: true });
  } else if (action === 'bookmark') {
    const key = trigger.dataset.key;
    persist(state => ({ ...state, bookmarks: state.bookmarks.includes(key) ? state.bookmarks.filter(item => item !== key) : [...state.bookmarks, key] }), '收藏状态已在本机更新。');
    render();
    main.querySelector('[data-action="bookmark"]')?.focus({ preventScroll: true });
  } else if (action === 'direction-tab') {
    ui.directionTab = trigger.dataset.tab;
    render();
    document.querySelector(`#tab-${ui.directionTab}`)?.focus({ preventScroll: true });
  } else if (action === 'compose') composeQuestion(trigger);
  else if (action === 'close-dialog') closeDialog();
  else if (action === 'intention') intentionDialog(trigger.dataset.id);
  else if (action === 'report') reportDialog(trigger.dataset.id);
  else if (action === 'task-step') {
    const step = Number(trigger.dataset.step);
    const saved = persist(state => ({ ...state, task: { ...state.task, step } }));
    render({ focus: true });
    if (step === 3 && !saved) notify('写入失败，判断仅临时保留，请先导出。');
  } else if (action === 'reference') {
    persist(state => ({ ...state, task: { ...state.task, reference: !state.task.reference } }));
    render();
    main.querySelector('[data-action="reference"]')?.focus({ preventScroll: true });
  } else if (action === 'delete-record') {
    openDialog('删除这条本地记录？', `<p>删除后无法恢复，其他记录不受影响。</p><div class="dialog-actions">${button('取消', 'close-dialog')}${button('确认删除', 'confirm-delete', '', true)}</div>`, { field: trigger.dataset.field, id: trigger.dataset.id });
  } else if (action === 'confirm-delete') {
    const { field, id } = dialogContext;
    persist(state => ({ ...state, [field]: state[field].filter(item => item.id !== id) }), '本地记录已更新。');
    closeDialog();
    render({ focus: true });
  } else if (action === 'export') {
    downloadText(JSON.stringify({ prototype: 'CareerBridge low fidelity', scope: 'Local private data, no messages sent', records: store.get() }, null, 2), 'careerbridge-local-records.json', 'application/json');
    notify('已准备本地记录导出。');
  } else if (action === 'clear') {
    openDialog('清除 CareerBridge 本地记录？', `<p>将移除本原型的偏好、探索记录、关注、收藏、草稿、判断与沟通意向，不影响个人网站其他数据。需要保留时请先导出。</p><div class="dialog-actions">${button('取消', 'close-dialog')}${button('确认清除', 'confirm-clear', '', true)}</div>`);
  } else if (action === 'confirm-clear') {
    const cleared = store.clear();
    syncStorageNotice();
    closeDialog();
    render({ focus: true });
    notify(cleared ? '本原型的本地记录已清除。' : '清除失败，原记录可能仍在。');
  }
});

document.addEventListener('input', event => {
  const field = event.target.dataset.taskField;
  if (field) persist(state => ({ ...state, task: { ...state.task, [field]: event.target.value } }));
  const form = event.target.closest('[data-form="exploration"]');
  if (form && event.target.matches('textarea, input[type="text"]')) {
    if (event.target.name === 'nextAction') form.elements.actionDone.checked = false;
    saveExploration(form);
  }
  const intention = event.target.closest('[data-form="intention"]');
  if (intention) intention.querySelector('[data-intention-preview]').textContent = intentionBody(intention) || '尚未填写或选择问题。';
});

document.addEventListener('change', event => {
  const form = event.target.closest('[data-form="exploration"]');
  if (form && event.target.matches('select, input[type="checkbox"]')) saveExploration(form);
  const filter = event.target.dataset.filter;
  if (filter === 'profileGoal') {
    persist(state => ({ ...state, profile: { ...state.profile, goal: event.target.value } }));
    render();
    main.querySelector('[data-filter="profileGoal"]')?.focus({ preventScroll: true });
  } else if (filter && Object.hasOwn(ui, filter)) {
    ui[filter] = event.target.value;
    render();
    document.querySelector(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
  }
});

document.addEventListener('keydown', event => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(tab);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click();
});

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === 'search') {
    const data = new FormData(form);
    location.hash = searchHref(String(data.get('query') || '').trim().slice(0, 120), String(data.get('scope') || 'all'));
    return;
  }
  if (form.dataset.form === 'exploration') {
    saveExploration(form, true);
    return;
  }
  if (form.dataset.form === 'preferences') {
    capturePreferences(form);
    if (ui.preferenceStep < 3) {
      ui.preferenceStep += 1;
      render({ focus: true });
    } else {
      const profile = sanitizeProfile({ ...ui.profileDraft, status: 'ready' });
      if (!profile.interests.includes(profile.activeDirection)) profile.activeDirection = 'all';
      persist(state => ({ ...state, profile }), '探索偏好已保存在本机，可随时切换。');
      leavePreferences();
    }
    return;
  }
  const data = new FormData(form);
  const now = new Date().toISOString();
  // HTTP intranet origins still provide getRandomValues, but not randomUUID.
  const id = window.crypto.randomUUID?.() ||
    Array.from(window.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  try {
    if (form.dataset.form === 'question') {
      const includeSource = data.has('includeSource');
      addRecord('drafts', makeDraft({
        kind: dialogContext.existing?.kind || 'question',
        title: data.get('title'), body: data.get('body'), direction: data.get('direction'),
        source: includeSource ? dialogContext.source : '', attachment: includeSource ? dialogContext.sourceTitle : '',
      }, dialogContext.existing?.id || id, now));
      closeDialog();
      if (route.page === 'me' || route.page === 'peers') render({ focus: true });
    } else if (form.dataset.form === 'reply') {
      const post = discussions[form.dataset.id];
      addRecord('drafts', makeDraft({ kind: 'reply', title: `回复：${post.title}`, body: data.get('body'), source: `discussion:${post.id}`, direction: post.direction }, id, now));
      form.reset();
    } else if (form.dataset.form === 'intention') {
      if (!data.has('ack')) throw new Error('请确认本次不会真实发送。');
      const item = opportunities[dialogContext.id];
      if (item.status !== 'open') throw new Error('该示例机会已经关闭。');
      addRecord('intentions', makeDraft({ kind: 'intention', title: item.title, body: intentionBody(form), source: item.id, direction: item.direction }, dialogContext.existing?.id || id, now));
      closeDialog();
      render({ focus: true });
    } else if (form.dataset.form === 'report') {
      const item = opportunities[dialogContext.id];
      addRecord('reports', makeDraft({ kind: 'report', title: `反馈：${item.title}`, body: data.get('body'), source: item.id, direction: item.direction }, id, now));
      closeDialog();
    }
  } catch (error) {
    const target = form.querySelector('[role="alert"]');
    target.textContent = error.message;
    target.hidden = false;
  }
});

dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
});
window.addEventListener('hashchange', () => {
  if (dialog.open) closeDialog();
  ui.directionTab = 'overview';
  render({ focus: true });
  window.scrollTo(0, 0);
});
if (!location.hash || location.hash === '#/' || location.hash === '#') {
  history.replaceState(null, '', '#/discover');
}
render();
