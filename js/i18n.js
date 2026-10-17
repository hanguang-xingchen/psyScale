// i18n.js — 多语言支持（路径感知）

const LANG = window.location.pathname.includes('/zh-TW/') ? 'zh-TW' : 'zh-CN';

const STRINGS = {
  'zh-CN': {
    // scale-runner.js
    questionProgress: '第 {current} 题 / 共 {total} 题',
    nextQuestion: '下一题',
    submit: '提交',
    unansweredAlert: '还有 {n} 题未作答（第 {qids} 题），请完成所有题目后再提交。',
    noResultTitle: '暂无结果',
    noResultText: '暂无结果数据，请先完成量表答题',
    goToAnswer: '去答题',

    // result.js
    totalScore: '总分',
    totalItems: '题目数',
    meanScore: '因子均分',
    dimCount: '维度数',
    dimension: '维度',
    level: '等级',
    disclaimer: '本结果仅供参考，不构成医学诊断。如有疑虑请咨询专业人士。',

    // index.js
    timeJustNow: '刚刚',
    timeMinutesAgo: '{n} 分钟前',
    timeHoursAgo: '{n} 小时前',
    timeDaysAgo: '{n} 天前',
    resumeDialogTitle: '继续未完成的答题',
    resumeTimeLabel: '上次答题：{time}',
    btnResume: '继续答题',
    btnAbandon: '放弃',

    // scorer.js
    unknownScoring: '未知计分类型: {type}'
  },

  'zh-TW': {
    // scale-runner.js
    questionProgress: '第 {current} 題 / 共 {total} 題',
    nextQuestion: '下一題',
    submit: '送出',
    unansweredAlert: '還有 {n} 題未作答（第 {qids} 題），請完成所有題目後再送出。',
    noResultTitle: '尚無結果',
    noResultText: '目前沒有結果資料，請先完成量表答題',
    goToAnswer: '開始答題',

    // result.js
    totalScore: '總分',
    totalItems: '題目數',
    meanScore: '因子均分',
    dimCount: '維度數',
    dimension: '維度',
    level: '等級',
    disclaimer: '本結果僅供參考，不構成醫學診斷。如有疑慮請諮詢專業人士。',

    // index.js
    timeJustNow: '剛剛',
    timeMinutesAgo: '{n} 分鐘前',
    timeHoursAgo: '{n} 小時前',
    timeDaysAgo: '{n} 天前',
    resumeDialogTitle: '繼續未完成的答題',
    resumeTimeLabel: '上次答題：{time}',
    btnResume: '繼續答題',
    btnAbandon: '放棄',

    // scorer.js
    unknownScoring: '未知的計分類型: {type}'
  }
};

export function t(key, params) {
  const lang = STRINGS[LANG] || STRINGS['zh-CN'];
  let str = lang[key] || STRINGS['zh-CN'][key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
  }
  return str;
}
