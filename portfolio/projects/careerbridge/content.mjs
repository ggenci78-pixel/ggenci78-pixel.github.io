export const workSamples = {
  product: {
    title: '收到用户反馈后，产品经理实际要做什么？',
    summary: '从三条反馈到一页问题说明，看看需求文档之前的工作。',
    context: '你在一个校园二手交易项目里协助产品工作。同事发现有人收藏商品却不联系卖家，请你先整理问题，而不是马上给出改版方案。',
    inputTitle: '收到的材料',
    input: ['用户 A：“我收藏了，但不知道在哪里联系卖家。”', '用户 B：“我看到联系按钮了，但点了之后会不会直接打电话？”', '业务观察：收藏后继续联系较少，暂无分步骤数据。'],
    steps: ['逐条保留原话，把“找不到入口”和“担心联系流程”分开。', '区分已知事实与可能的解释，标出证据缺口。', '把问题和待确认项交给同事讨论，再决定是否写方案。'],
    outputTitle: '一页问题说明',
    output: [['已知', 'A 找不到入口；B 看到了按钮，但担心会直接拨号。'], ['待核实', '两种顾虑各出现多少次？联系后实际发生什么？'], ['下一步', '核对页面和联系流程，补充分步骤数据与访谈。']],
    ai: 'AI 可以初步归类反馈；人要核对原话、出处与误合并，不能让它补出不存在的数据。',
    question: '为什么不能收到反馈就直接改按钮？',
    discussion: 'feedback',
  },
  operations: {
    title: '访谈结束后，用户运营怎样整理用户的顾虑？',
    summary: '从零散原话到沟通记录，看 AI 能帮什么、哪些判断仍要自己做。',
    context: '你在一个校园二手交易项目里协助用户沟通。访谈结束后，需要把用户对联系卖家的顾虑整理给团队，作为后续核实与沟通的依据。',
    inputTitle: '收到的材料',
    input: ['访谈 01：“我看到了联系按钮，但不知道点了以后会发生什么。”', '访谈 02：“我担心自己的电话号码会被对方看到。”'],
    steps: ['保留脱敏原话与编号，不先改写用户的意思。', '按“流程预期”“隐私顾虑”初步归类，每项回指原话。', '人工检查分类，把没有依据的判断留为待确认。'],
    outputTitle: '一次沟通记录',
    output: [['流程预期', '访谈 01：不清楚点击联系后的步骤。'], ['隐私顾虑', '访谈 02：担心号码可见性；需核实实际规则。'], ['下一步', '核对产品流程与隐私规则，再准备沟通说明。']],
    ai: 'AI 可以按主题整理有编号的脱敏文本；人要检查引用、漏项与推断。少量访谈不能代表所有用户。',
    question: '怎样把整理访谈的步骤沉淀成可复用流程？',
    discussion: 'ai-method',
  },
};

export const directions = {
  product: {
    id: 'product', title: '产品经理', subtitle: '从用户问题到可讨论的方案',
    intro: '理解问题、判断优先级，和设计、技术、运营一起推进。这里先看一段新人可能遇到的工作。',
    tasks: ['整理用户反馈，区分现象与假设', '补充证据，和同事明确问题', '写清方案边界与验收条件'],
    limits: ['这段体验没有涵盖长期规划、跨团队协调或上线压力。', '不同公司的岗位分工不同；体验结果不能判断职业适合度。'],
    entry: '进入条件需要逐条核实：招聘对象、经验要求、城市、到岗时间。专业背景不自动等于具备或缺少岗位能力。',
    discussionIds: ['feedback', 'workday'], opportunityIds: ['successor'],
  },
  operations: {
    id: 'operations', title: '用户运营', subtitle: '理解人群，让反馈进入后续行动',
    intro: '围绕特定人群设计沟通、收集反馈并持续跟进。与产品经理有交集，但关注点和产物可能不同。',
    tasks: ['划分目标用户，明确沟通对象', '设计沟通问题，记录顾虑和反馈', '复盘触达与反馈，不只看表面热度'],
    limits: ['这里只提供方向概览和方法讨论，没有完整的运营任务体验。', '运营也包含持续维护、重复执行与临时协调。'],
    entry: '先核实具体岗位的业务、人群、执行强度与技能要求，不只根据职位名称作判断。',
    discussionIds: ['ai-method'], opportunityIds: ['referral'],
  },
};

export const discussions = {
  feedback: {
    id: 'feedback', direction: 'product', type: '提问', author: '小林 · 示例学生', role: '视觉设计背景，正在了解产品工作',
    title: '只有几条用户反馈，什么时候才能写需求？',
    excerpt: '我能整理反馈，但还不确定哪些是事实、哪些只是自己的解释。',
    paragraphs: ['材料里有人说“找不到入口”，也有人说“不知道联系卖家以后会发生什么”。这两句可以合并成一个问题吗？',
      '我现在的想法是先改联系按钮，但怕太早进入方案。想请教：开始写方案之前，至少还应该确认什么？'],
    task: 'feedback',
    replies: [
      { author: '阿岚 · 示例从业者', relation: '产品工作经历为构造示例，未经身份核验', text: '先分开记录两条原话。一个可能是可发现性，另一个可能是信任或流程预期。它们也可能同时发生，当前材料还不能下结论。' },
      { author: '阿岚 · 示例从业者', relation: '参考思路，不是唯一答案', text: '你可以先写一页“已知事实、待验证假设、想补的证据”，再和同事讨论。暂时不必写完整需求文档。' },
    ],
  },
  workday: {
    id: 'workday', direction: 'product', type: '经历', author: '阿岚 · 示例实习生', role: '桥边工作室（虚构）· 产品实习',
    title: '产品实习的一天，不全是在写需求文档',
    excerpt: '反馈整理、核对页面状态、跟进问题，也会占据不少时间。',
    paragraphs: ['在这个构造案例里，上午先整理反馈，把不清楚的描述向同事问明白；下午核对页面状态，再更新一页问题说明。',
      '能接触问题分析，并不代表能够独立决定产品方向。重复核对、等待反馈和整理记录也是工作的一部分。',
      '下面的继任信息只用于展示：任职者怎样补充工作背景，不代表存在真实岗位或公司授权。'],
    opportunity: 'successor',
    replies: [{ author: '小林 · 示例学生', relation: '示例讨论', text: '这比只看到“负责需求分析”具体多了。我还想知道新人写的东西通常由谁检查。' }],
  },
  'ai-method': {
    id: 'ai-method', direction: 'operations', type: '方法', author: '小周 · 示例运营同学', role: '方法示例 · 最近整理 2026-11-03',
    title: '用 AI 整理访谈记录，哪些步骤还得自己检查？',
    excerpt: '先保存原话和出处，再做归类；不让模型替用户补充没有说过的话。',
    paragraphs: ['适用任务：少量已获授权且完成脱敏的访谈记录归类。输入是带编号的原话，输出是主题、原话引用和仍不明确的地方。',
      '先让 AI 给出初步分类，再人工对照原话，检查误合并、漏项和无依据推断。不能根据几段访谈推断所有用户的比例。',
      '重复使用时可以整理成模板或 Skill。没有实测过的准确率、节省时间和效果不写成结论。'],
    workflow: {
      input: '已获授权、脱敏并逐条编号的访谈原话。不上传客户身份、联系方式或保密业务材料。',
      output: '主题、原话编号、无法判断项、人工复核记录。',
      steps: ['保留只读原文副本，为每条原话编号。', '尝试按主题归类；每一项必须回指原话，没有依据的判断留空。', '人工逐项检查漏项、误合并和无依据推断。', '记录本次失败情况，再决定是否复用流程。'],
      checks: ['输出中的引用能否在原文找到？', '有没有把少数人的看法写成所有用户的比例？', '有歧义的内容是否进入“无法判断”，而非被强行归类？'],
    },
    replies: [{ author: '阿岚 · 示例同伴', relation: '示例补充', text: '建议单独保留“无法判断”一类。归类完整不等于分析正确。' }],
  },
};

export const opportunities = {
  successor: {
    id: 'successor', direction: 'product', type: '实习继任', status: 'open',
    title: '产品实习生 · 继任', organization: '桥边工作室（虚构）', author: '阿岚 · 示例现任实习生',
    conditions: [['地点', '上海 · 线下（示例）'], ['到岗', '2026 年 12 月起（示例）'], ['投入', '每周 3 天，至少 3 个月（示例）'], ['待遇', '未提供']],
    work: ['整理反馈并保留原始出处', '核对页面状态、补充问题说明', '和带教同事讨论需要验证的假设'],
    limits: '不独立决定产品方向；不保证参与完整上线。任务与节奏随具体团队变化。',
    source: '此处演示现任实习生的工作自述。真实发布前，应核查发布者与岗位关系、公开授权和申请渠道。',
    discussion: 'workday', question: 'feedback',
  },
  referral: {
    id: 'referral', direction: 'operations', type: '内推', status: 'closed',
    title: '用户运营实习 · 内推', organization: '小岛项目组（虚构）', author: '小周 · 示例分享者',
    conditions: [['地点', '远程（示例）'], ['到岗', '本轮已结束（示例）'], ['投入', '以正式职位说明为准'], ['待遇', '未提供']],
    work: ['整理用户反馈', '协助沟通和活动复盘'], limits: '内推不等于通过筛选；此示例已关闭，没有真实内推码。',
    source: '演示信息已失效时的关闭状态，不提供可复制的内推码或申请入口。', discussion: 'ai-method',
  },
};

export const material = [
  { id: 'a', label: '用户 A 的原话', text: '我收藏了，但不知道在哪里联系卖家。' },
  { id: 'b', label: '用户 B 的原话', text: '我看到联系按钮了，但点了之后会不会直接打电话？' },
  { id: 'c', label: '业务观察', text: '收藏之后继续联系的情况较少。没有分步骤数据，也没有代表性样本。' },
];

// These are illustrative task clues, not a validated occupational competency model.
export const learningPaths = {
  product: [
    { id: 'clarify', title: '澄清用户问题', transfer: '访谈、调研或客户沟通中，保留原话和出处的经验。', evidence: '一份区分事实、假设与待补证据的记录。', href: '#/task/feedback', action: '尝试反馈整理', question: '怎样判断哪些反馈能合并，哪些还要继续核实？' },
    { id: 'scope', title: '表达方案与边界', transfer: '设计说明、项目汇报中，解释对象、目标与限制的经验。', evidence: '能说清楚要解决谁的问题、这次不做什么。', href: '#/discussion/feedback', action: '看看需求前怎么问', question: '一页问题说明需要包含什么，什么时候才进入方案？' },
    { id: 'collaborate', title: '跟进与协作', transfer: '小组项目里核对进展、记录问题、向他人确认的经验。', evidence: '一份带负责人、待确认项和下一步的项目记录。', href: '#/discussion/workday', action: '了解实习中的协作', question: '新人写的东西由谁检查，怎样跟进反馈？' },
  ],
  operations: [
    { id: 'audience', title: '理解沟通对象', transfer: '社团、活动或服务工作中，听取不同参与者需求的经验。', evidence: '能说明哪些是用户原话、哪些只是自己的推测。', href: '#/discussion/ai-method', action: '看访谈整理方法', question: '整理访谈时，怎样保留不同用户的真实顾虑？' },
    { id: 'workflow', title: '把重复工作整理成流程', transfer: '整理表格、访谈或活动记录时，发现重复步骤的经验。', evidence: '写出输入、输出、步骤、人工检查点与不适用情况。', href: '#/discussion/ai-method', action: '试用流程模板', question: '哪些整理步骤可以交给 AI，哪些必须人工检查？' },
    { id: 'review', title: '复盘与后续行动', transfer: '做完活动后，对照目标记录结果与局限的经验。', evidence: '保留证据、没有结论的部分，以及下一次要验证什么。', href: '#/direction/operations', action: '回看运营工作范围', question: '没有代表性数据时，复盘能下哪些结论？' },
  ],
};

export const glossary = [
  ['需求文档', '通常用来对齐问题、目标、方案边界和验收条件。格式随团队变化，不是把几条反馈直接改写成一份标准答案。'],
  ['事实与假设', '事实能够指向具体材料；假设是有待验证的解释。先区分两者，再决定还要补什么证据。'],
  ['验收条件', '事先约定怎样判断这次交付达到要求。例如页面在指定状态下应出现什么，而不只是“体验更好”。'],
  ['Skill / 工作流', '这里指可复用的任务步骤与检查要求，不是只写一条提示词，也不代表模型可以自动处理所有例外。'],
];

export const contactQuestions = {
  successor: ['目前是否仍开放，是否经团队同意公开？', '新人由谁带教，哪些工作可以实际参与？', '到岗安排、待遇和正式申请渠道分别是什么？'],
  referral: ['这轮机会是否已经结束？'],
};

export function searchContent(query, scope = 'all') {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const documents = [
    ...Object.values(directions).map(item => ({
      id: `direction:${item.id}`, direction: item.id, title: item.title, kind: '方向概览',
      description: workSamples[item.id].summary, text: [item.intro, workSamples[item.id].title, ...workSamples[item.id].input, ...workSamples[item.id].steps, ...workSamples[item.id].output.flat(), workSamples[item.id].ai, ...item.tasks, ...learningPaths[item.id].map(skill => `${skill.title} ${skill.transfer} ${skill.evidence}`)].join(' '), href: `#/direction/${item.id}`,
    })),
    ...Object.values(discussions).map(item => ({
      id: `discussion:${item.id}`, direction: item.direction, title: item.title, kind: item.type,
      description: item.excerpt, text: item.paragraphs.join(' '), href: `#/discussion/${item.id}`,
    })),
    ...Object.values(opportunities).map(item => ({
      id: `opportunity:${item.id}`, direction: item.direction, title: item.title,
      kind: item.status === 'open' ? '示例机会 · 开放' : '示例机会 · 已关闭',
      description: item.organization, text: [item.type, ...item.work, ...item.conditions.flat()].join(' '), href: `#/opportunity/${item.id}`,
    })),
    { id: 'task:feedback', direction: 'product', title: '先把问题说清楚', kind: '体验任务', description: '整理收藏后未联系卖家的反馈，区分事实与假设。', text: material.map(item => item.text).join(' '), href: '#/task/feedback' },
  ];
  return documents.filter(item => (scope === 'all' || item.direction === scope) && terms.every(term => `${directions[item.direction].title} ${item.title} ${item.description} ${item.text}`.normalize('NFKC').toLocaleLowerCase().includes(term)));
}

export function methodTemplate() {
  const method = discussions['ai-method'];
  return [
    `# ${method.title}`, '', '构造方法样例；未经真实从业者校对。不包含用户私有记录。', '',
    `输入：${method.workflow.input}`, `输出：${method.workflow.output}`, '',
    ...method.workflow.steps.map((step, i) => `${i + 1}. ${step}`), '',
    '## 复核清单', ...method.workflow.checks.map(check => `- [ ] ${check}`), '',
    '## 本次尝试', '工具与版本：', '尝试日期：', '出错或不适用的情况：', '下一次修改：',
  ].join('\n');
}
