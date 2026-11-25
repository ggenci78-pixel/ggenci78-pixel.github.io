import { learningPaths } from './content.mjs';

export const STORAGE_KEY = 'careerbridge-lofi-v1';
export const skillStatuses = { unknown: '还不了解', learn: '想补一补', evidence: '有相关经历' };
export const explorationDecisions = { undecided: '继续了解，暂未决定', continue: '想进一步尝试', pause: '暂缓这个方向' };
export const emptyExploration = id => ({
  skills: Object.fromEntries(learningPaths[id].map(skill => [skill.id, { status: 'unknown', note: '' }])),
  decision: 'undecided', reason: '', nextAction: '', actionDone: false, updated: '',
});
export const profileStages = {
  student: '在校学生',
  graduate: '应届／毕业待就业',
  professional: '已有工作经验',
};
export const profileGoals = {
  explore: '了解岗位',
  practice: '补知识、做实践',
  opportunity: '寻找实习或工作机会',
  transition: '探索跨专业／转岗',
};
export const emptyProfile = () => ({
  status: 'new', stage: '', goal: '', major: '', interests: [], activeDirection: 'all',
});
export const emptyState = () => ({
  profile: emptyProfile(),
  explorations: { product: emptyExploration('product'), operations: emptyExploration('operations') },
  following: [], bookmarks: [], drafts: [], intentions: [], reports: [],
  task: { facts: '', unknown: '', next: '', step: 1, reference: false },
});
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const knownDirections = new Set(['product', 'operations']);
const bookmarkKeys = new Set(['discussion:feedback', 'discussion:workday', 'discussion:ai-method', 'opportunity:successor', 'opportunity:referral']);
const unique = values => [...new Set(values)];

export function sanitizeExploration(raw, id) {
  const result = emptyExploration(id);
  if (!raw || typeof raw !== 'object') return result;
  for (const skill of learningPaths[id]) {
    const saved = raw.skills?.[skill.id];
    result.skills[skill.id] = {
      status: Object.hasOwn(skillStatuses, saved?.status) ? saved.status : 'unknown',
      note: text(saved?.note, 1000),
    };
  }
  result.decision = Object.hasOwn(explorationDecisions, raw.decision) ? raw.decision : 'undecided';
  result.reason = text(raw.reason, 2000);
  result.nextAction = text(raw.nextAction, 500);
  result.actionDone = !!result.nextAction.trim() && raw.actionDone === true;
  result.updated = text(raw.updated, 50);
  return result;
}

export function nextStepFor(state, id) {
  const record = state.explorations[id];
  if (record.decision === 'pause') return { title: '这个方向已暂缓', reason: '这是你自己的选择，可以随时重新考虑。', href: `#/exploration/${id}?focus=decision`, label: '回看探索记录' };
  if (record.nextAction.trim() && !record.actionDone) return { title: record.nextAction, reason: '你在探索记录里留下的下一步。', href: `#/exploration/${id}?focus=action`, label: '继续我的行动' };
  const skill = learningPaths[id].find(item => record.skills[item.id].status === 'learn');
  if (skill) return { title: skill.title, reason: '你将这个知识点标记为“想补一补”。', href: skill.href, label: skill.action };
  if (id === 'product' && (state.task.facts || state.task.unknown || state.task.next)) return {
    title: '回看反馈整理任务', reason: '这里保留了你写过的判断，不需要重新开始。', href: '#/task/feedback', label: '继续实践',
  };
  if (state.profile.goal === 'practice') return id === 'product'
    ? { title: '从反馈整理试起', reason: '按你选择的“补知识、做实践”目标。', href: '#/task/feedback', label: '尝试一个任务' }
    : { title: '把访谈整理变成流程', reason: '按你选择的“补知识、做实践”目标。', href: '#/discussion/ai-method', label: '查看方法与模板' };
  if (state.profile.goal === 'opportunity') return { title: '先核实工作和进入条件', reason: '按你选择的“寻找实习或工作机会”目标，不以任务作为申请门槛。', href: `#/direction/${id}`, label: '查看方向与相关机会' };
  if (state.profile.goal === 'transition') return { title: '从已有经历找可迁移的部分', reason: '按你选择的“探索跨专业／转岗”目标，不根据专业自动判断能力。', href: `#/exploration/${id}`, label: '整理经历与待补点' };
  return { title: '先了解工作，再决定是否尝试', reason: '还未留下下一步，可以先看看任务、产物与限制。', href: `#/direction/${id}`, label: '了解这个方向' };
}

export function sanitizeProfile(raw) {
  const profile = emptyProfile();
  if (!raw || typeof raw !== 'object') return profile;
  profile.status = ['new', 'ready', 'skipped'].includes(raw.status) ? raw.status : 'new';
  profile.stage = Object.hasOwn(profileStages, raw.stage) ? raw.stage : '';
  profile.goal = Object.hasOwn(profileGoals, raw.goal) ? raw.goal : '';
  profile.major = text(raw.major, 80);
  profile.interests = unique((Array.isArray(raw.interests) ? raw.interests : []).filter(id => knownDirections.has(id)));
  profile.activeDirection = knownDirections.has(raw.activeDirection) ? raw.activeDirection : 'all';
  return profile;
}

export function sanitizeState(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  state.profile = sanitizeProfile(raw.profile);
  for (const id of knownDirections) state.explorations[id] = sanitizeExploration(raw.explorations?.[id], id);
  state.following = unique((Array.isArray(raw.following) ? raw.following : []).filter(id => knownDirections.has(id)));
  state.bookmarks = unique((Array.isArray(raw.bookmarks) ? raw.bookmarks : []).filter(id => bookmarkKeys.has(id)));
  for (const field of ['drafts', 'intentions', 'reports']) {
    const items = Array.isArray(raw[field]) ? raw[field].slice(0, 100) : [];
    state[field] = items.filter(item => item && typeof item === 'object').map(item => ({
      id: text(item.id, 100), kind: text(item.kind, 30), title: text(item.title, 200),
      body: text(item.body), source: text(item.source, 100), direction: knownDirections.has(item.direction) ? item.direction : 'product',
      attachment: text(item.attachment, 200), updated: text(item.updated, 50),
    })).filter(item => item.id && item.body);
  }
  const task = raw.task && typeof raw.task === 'object' ? raw.task : {};
  state.task = {
    facts: text(task.facts), unknown: text(task.unknown), next: text(task.next),
    step: [1, 2, 3].includes(task.step) ? task.step : 1, reference: task.reference === true,
  };
  return state;
}

export function createStore(storage) {
  let state = emptyState();
  let notice = '';
  try {
    if (!storage) throw new Error('Storage unavailable');
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) state = sanitizeState(JSON.parse(saved));
  } catch {
    notice = '本地存储读取不可用或旧记录已损坏。本次可继续操作，请导出需要保留的记录。';
  }
  return {
    get: () => state,
    notice: () => notice,
    update(change) {
      const candidate = typeof change === 'function' ? change(state) : change;
      state = sanitizeState(candidate);
      try {
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        notice = '';
        return true;
      } catch {
        notice = '无法写入本地存储。本次记录仅临时保留，关闭页面会丢失，请先导出。';
        return false;
      }
    },
    clear() {
      try {
        if (!storage) throw new Error('Storage unavailable');
        storage.removeItem(STORAGE_KEY);
        state = emptyState();
        notice = '';
        return true;
      } catch {
        notice = '无法清除本地存储。原记录可能仍在，请检查浏览器设置后重试。';
        return false;
      }
    },
  };
}

export function resolveRoute(hash) {
  let url;
  try {
    url = new URL((hash || '#/discover').replace(/^#/, ''), 'https://careerbridge.local/');
  } catch { return { page: 'not-found' }; }
  if (url.origin !== 'https://careerbridge.local') return { page: 'not-found' };
  const parts = url.pathname.replace(/^\//, '').split('/');
  const [page, id] = parts;
  if (page === 'search' && parts.length === 1) return {
    page, query: (url.searchParams.get('q') || '').slice(0, 120),
    scope: knownDirections.has(url.searchParams.get('scope')) ? url.searchParams.get('scope') : 'all',
  };
  if (['discover', 'peers', 'opportunities', 'me', 'preferences'].includes(page) && parts.length === 1) return { page };
  if (page === 'direction' && knownDirections.has(id) && parts.length === 2) return { page, id };
  if (page === 'exploration' && knownDirections.has(id) && parts.length === 2) {
    const focus = url.searchParams.get('focus');
    return { page, id, ...(['action', 'decision'].includes(focus) ? { focus } : {}) };
  }
  if (page === 'discussion' && ['feedback', 'workday', 'ai-method'].includes(id) && parts.length === 2) return { page, id };
  if (page === 'opportunity' && ['successor', 'referral'].includes(id) && parts.length === 2) return { page, id };
  if (page === 'task' && id === 'feedback' && parts.length === 2) return { page, id };
  return { page: 'not-found' };
}

export function makeDraft({ kind = 'question', title, body, source = '', direction = 'product', attachment = '' }, id, updated) {
  if (!body?.trim()) throw new Error('请写下具体内容。');
  if (kind === 'question' && !title?.trim()) throw new Error('请填写问题标题。');
  return {
    id, kind, title: (title || '回复草稿').trim().slice(0, 200), body: body.trim().slice(0, 4000),
    source, direction, attachment, updated,
  };
}
