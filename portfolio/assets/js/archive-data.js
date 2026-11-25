import { visualContent, extraProjects, existingContent } from './project-content.js';

// Null fields are intentionally unpublished; views never invent project results.
export const collections = [
  { id: 'vibe', index: '01', title: 'Vibe Coding', en: 'IDEAS INTO INTERFACES', color: '#9cb8ed', tags: ['产品', '交互', '代码'], covers: ['p21_1.jpg', 'p22_1.jpg', 'p23_0.jpg'] },
  { id: 'visual', index: '02', title: '视觉设计', en: 'IDENTITY / SPACE / MOTION', color: '#efad95', tags: ['品牌', '导视', '影像'], covers: ['p27_0.jpg', 'p08_0.jpg', 'p10_2.jpg'] },
  { id: 'internship', index: '03', title: '实习实践', en: 'AI WORKFLOWS & DATA', color: '#b7cdb7', tags: ['Skill', '数据', '工作流'], covers: ['skill-08.jpg', 'ill-05.jpg', 'photo-01.jpg'] },
  { id: 'about', index: '04', title: '关于我', en: 'A LITTLE ABOUT ME', color: '#e9d98f', tags: ['经历', '简历', '联系'], covers: ['covers/meiyu.webp','covers/career.webp','streetsignal/dashboard.jpg'] },
];
export const projects = [
  {
    id: 'streetsignal', collection: 'vibe', title: 'StreetSignal', displayLines: ['STREET', 'SIGNAL'],
    subtitle: '区域穿着趋势观察台', en: 'REGIONAL STYLE OBSERVATORY', type: '概念产品',
    cover: 'streetsignal/dashboard.jpg', images: [],
    description: '将街头单品观察组织为区域风格信号，为服装企划提供可核查的选款假设。',
    status: '可交互概念演示', url: 'projects/streetsignal/#overview',
    sections: ['项目背景', '产品流程', '交互与实现', '边界与下一步'],
    body: [
      { title: '项目背景', text: '热门街区的穿搭，能否为服装品牌理解地域风格提供补充信号？StreetSignal 面向商品企划与区域买手，将单张街拍的印象转化为带有城市、温度和周期条件的比较任务。目前为个人概念探索，尚无真实客户访谈、成交或采购意向证据。' },
      { title: '产品流程', text: '观察单品 → 按城市、温度、周期比较 → 核查有效样本分母与周度变化 → 形成区域试款假设 → 用实际销售反馈验证。穿着频率不等于购买意愿，趋势变化也不能直接当作采购比例。' },
      { title: '交互与实现', text: '已完成前端交互演示：三段街拍素材的单品标注与离线位置跟踪；三个城市、三个温度区间、4/8 周周期切换；五类服装元素比较、周度明细、Markdown 简报和 CSV 导出，以及 50 秒产品短片。衣物语义为人工标注，位置来自离线 CSRT 跟踪，模拟统计独立于视频生成。' },
      { title: '边界与下一步', text: '尚未接入真实服装识别、摄像头、天气或真实城市人群数据，也未完成商业验证。下一阶段先访谈买手与商品企划，以适当授权的小规模样本核查质量，再验证实际选款任务。素材来源及公开使用前的核查事项保留在项目说明中。' }
    ]
  },
  { id: 'globe', collection: 'vibe', title: '全球新闻沙盘', subtitle: '地理信息与新闻可视化', displayLines: ['全球新闻', '沙盘'], en: 'WORLD NEWS GLOBE', type: '信息可视化', cover: 'p21_1.jpg', images: ['p21_1.jpg', 'p21_2.jpg', 'p21_0.jpg'], description: '以地理位置组织新闻信息的产品探索。', sections: ['项目背景', '核心流程', '交互设计', '实现与复盘'], body: null, url: null },
  { id: 'career', collection: 'vibe', title: 'CareerBridge', subtitle: '简历诊断与求职匹配', displayLines: ['CAREER', 'BRIDGE'], en: 'CAREER & RESUME', type: 'AI 应用', cover: 'p22_1.jpg', images: ['p22_1.jpg'], description: '围绕简历诊断与求职匹配的界面探索。', sections: ['项目背景', '用户路径', '核心界面', '实现与复盘'], body: null, url: null },
  { id: 'sleep', collection: 'vibe', title: 'SleepWell', subtitle: '分层声音与休息体验', displayLines: ['SLEEP', 'WELL'], en: 'SOUND & REST', type: '交互体验', cover: 'p23_0.jpg', images: ['p23_0.jpg'], description: '声音分层与白噪音体验。', sections: ['项目背景', '声音交互', '核心界面', '实现与复盘'], body: null, url: null },
  { id: 'signage', collection: 'visual', title: '上理校园导视', subtitle: '上海理工大学导视系统', displayLines: ['上理校园', '导视'], en: 'CAMPUS WAYFINDING', type: '空间导视', cover: 'p08_0.jpg', images: ['p08_0.jpg', 'p06_1.jpg', 'p07_0.jpg'], description: '校园空间中的信息、图形与方向。', sections: ['项目背景', '视觉系统', '应用与落地', '设计复盘'], body: null },
  { id: 'anniversary', collection: 'visual', title: '上理 118', subtitle: '118 周年校庆视觉系统', displayLines: ['上理', '118'], en: 'ANNIVERSARY IDENTITY', type: '活动视觉', cover: 'p10_2.jpg', images: ['p10_2.jpg', 'p10_1.jpg', 'p11_1.jpg'], description: '从校园图形到纪念物料的视觉延展。', sections: ['项目背景', '视觉系统', '物料应用', '设计复盘'], body: null },
  { id: 'meiyu', collection: 'visual', title: '咦？美遇', subtitle: '美育品牌识别与应用', displayLines: ['咦？', '美遇'], en: 'ART & EDUCATION', type: '品牌设计', cover: 'p27_0.jpg', images: ['p27_0.jpg', 'p27_2.jpg', 'p28_2.jpg'], description: '围绕美育的品牌图形与应用。', sections: ['品牌背景', '图形语言', '品牌应用', '设计复盘'], body: null },
  { id: 'film', collection: 'visual', title: '挑战杯', subtitle: '角色设定与动态影像', displayLines: ['挑战杯', 'IP / 影像'], en: 'CHARACTER & FILM', type: 'IP 与影像', cover: 'p16_0.jpg', images: ['p16_0.jpg', 'p17_0.jpg', 'p19_0.jpg'], description: '角色、场景与动态影像的视觉探索。', sections: ['项目背景', '角色设定', '影像作品', '设计复盘'], body: null },
{"id": "design-loop", "collection": "internship", "title": "Design Loop", "subtitle": "场景化海报 Skill 与输出对照", "en": "INTERNSHIP", "type": "生成工作流", "description": "展示主题为创作需求分类、工作流设计与输出复核。审阅版保留项目入口。", "displayLines": ["Design Loop"], "cover": "covers/design-loop.svg", "images": [], "sections": ["项目概述"], "body": [{"title": "项目概述", "text": "展示主题为创作需求分类、工作流设计与输出复核。审阅版保留项目入口。"}]},
{"id": "illustration", "collection": "internship", "title": "插画数据生产", "subtitle": "画风、题材与生成规则", "en": "INTERNSHIP", "type": "数据工作流", "description": "展示主题为画风分类、条件组合与生成质量判断。审阅版保留项目入口。", "displayLines": ["插画数据生产"], "cover": "covers/illustration.svg", "images": [], "sections": ["项目概述"], "body": [{"title": "项目概述", "text": "展示主题为画风分类、条件组合与生成质量判断。审阅版保留项目入口。"}]},
{"id": "photography", "collection": "internship", "title": "人像摄影数据生产", "subtitle": "场景、人物与摄影语言", "en": "INTERNSHIP", "type": "数据工作流", "description": "展示主题为摄影条件组织与人物、环境关系的质量判断。审阅版保留项目入口。", "displayLines": ["人像摄影数据生产"], "cover": "covers/photography.svg", "images": [], "sections": ["项目概述"], "body": [{"title": "项目概述", "text": "展示主题为摄影条件组织与人物、环境关系的质量判断。审阅版保留项目入口。"}]},
{"id": "model-boundaries", "collection": "internship", "title": "模型能力边界研究", "subtitle": "从对照实验到有条件的选型判断", "en": "INTERNSHIP", "type": "美学评测", "description": "展示主题为同条件比较、失败样例与策略验证。审阅版保留项目入口。", "displayLines": ["模型能力边界研究"], "cover": "covers/model-boundaries.svg", "images": [], "sections": ["项目概述"], "body": [{"title": "项目概述", "text": "展示主题为同条件比较、失败样例与策略验证。审阅版保留项目入口。"}]},
];
for (const content of visualContent) Object.assign(projects.find(p => p.id === content.id), content);
for (const [id, content] of Object.entries(existingContent)) Object.assign(projects.find(p => p.id === id), content);
projects.push(...extraProjects);
const projectOrder = ['streetsignal','globe','career','sleep','wardrobe','signage','anniversary','fuxing-island','institute','dinghai','meiyu','buyu','fish','crowd','film','changbai','design-loop','illustration','photography','model-boundaries'];
projects.sort((a,b)=>projectOrder.indexOf(a.id)-projectOrder.indexOf(b.id));

const career = projects.find(project => project.id === 'career');
career.url = 'projects/careerbridge/';
career.status = '早期界面归档 / 附现行低保真';
career.sections.push('现行原型');
career.body.push({title:'现行原型',text:'后续低保真以岗位工作样本为首屏，提供材料、处理过程、产物与可选练习。内容为示例，记录仅保存在本地浏览器。'});
export const profile = {
  "name": "曾慧婷",
  "en": "Zeng Huiting",
  "location": "上海",
  "title": "视觉设计 / AI / Vibe Coding",
  "bio": "从视觉传达出发，探索交互产品和多模态 AI 应用。",
  "experience": [
    {
      "title": "个人经历",
      "text": "视觉传达设计背景，具备用户运营、视觉设计、多模态 AI 美学研究和个人原型实践经历。"
    },
    {
      "title": "能力与方法",
      "text": "通过原型表达想法，以业务场景、工作流程和可验证的输出组织设计。"
    }
  ]
};
export const projectCovers = Object.fromEntries(projects.map(p => [p.id, p.collection === "internship" ? p.cover : p.id === "streetsignal" ? p.cover : `covers/${p.id}.webp`]));
