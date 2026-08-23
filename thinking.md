# psyScale — 设计思路

## 项目定位

静态托管的心理学多量表评估 Web 应用。用户打开网页即可答题、即时查看评分和解读，无需后端、无需登录、无需构建工具。

## 核心设计原则

### 1. 配置驱动，逻辑通用

量表的所有可变信息（题目、选项、分值、维度归属、结果解读）都放在配置文件中。JS 代码只负责"读取配置 → 渲染界面 → 收集答案 → 计算分数 → 展示结果"，不硬编码任何量表特有的逻辑。

**目标**：增加一个新量表 = 创建一个目录 + 编写两个配置文件，无需修改任何 JS 代码。

### 2. 数据与逻辑彻底解耦

```
basic.json  →  量表是谁、怎么算分、分数怎么解读（声明层）
items.csv   →  每题长什么样、选项是什么、各得几分（数据层）
scale.html  →  答题界面骨架（展示层）
scorer.js   →  计分引擎（逻辑层）
```

- JSON 只管"规则"，不管具体题目
- CSV 只管"题目数据"，不管怎么计分
- HTML 只管"页面结构"，不管业务逻辑
- JS 只管"怎么运行"，不管量表内容

### 3. 为后端校验预留接口

当前版本前端直接计分（`scorer.js`）。未来接入后端时，只需将计分调用改为 API 请求，量表 HTML、答题引擎、结果页均无需修改。

## 文件结构

```
psyScale/
├── index.html              # 主页：量表列表入口
├── scale.html              # 量表答题页（所有量表共用）
├── result.html             # 结果展示页（所有量表共用）
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── index.js            # 主页逻辑：加载量表列表、渲染卡片
│   ├── scale-runner.js     # 通用答题引擎：渲染题目、收集答案
│   ├── scorer.js           # 计分引擎：根据配置计算分数
│   └── result.js           # 结果页逻辑：读取结果数据、展示解读
└── scales/
    ├── phq9/
    │   ├── basic.json      # PHQ-9 全局声明
    │   └── items.csv       # PHQ-9 题目数据
    ├── gad7/
    │   ├── basic.json
    │   └── items.csv
    └── scl90/
        ├── basic.json
        │   └── ...（每个量表一个子目录）
```

## 量表发现机制

主页通过读取 `scales/index.json`（维护量表 ID 列表）动态发现所有可用量表，然后加载每个量表的 `meta.json` 或 `basic.json` 中的轻量信息生成卡片。

## 页面间通信

| 页面跳转 | 传参方式 |
|---|---|
| index → scale | URL 参数：`scale.html?scale=phq9` |
| scale → result | `sessionStorage` 存完整结果 JSON，URL 仅带 `scale` |

## 数据格式详解

### basic.json（全局声明层）

```json
{
  "id": "phq9",                    // 量表唯一标识
  "title": "PHQ-9 抑郁症筛查量表",  // 中文展示名
  "titleEn": "Patient Health...",   // 英文原名
  "description": "...",             // 简介
  "instruction": "...",             // 答题指引
  "author": "Spitzer et al.",       // 作者
  "year": 1999,                     // 年份
  "language": "zh-CN",              // 语言

  "source": {                       // 数据源声明
    "type": "csv",                  // 数据来源类型
    "file": "items.csv",            // 文件名
    "optionPrefix": "opt_",         // CSV 选项列前缀
    "valuePrefix": "val_",          // CSV 分值列前缀
    "dimensions": false             // 是否多维度量表
  },

  "scoring": {                      // 计分规则
    "type": "sum",                  // sum=总分, dimensionSum=多维度
    "missingValuePolicy": "warn"    // 未答题策略
  },

  "interpretation": [               // 分数解读表
    { "min": 0, "max": 4, "level": "轻微", "color": "#4caf50", "advice": "..." }
  ]
}
```

### items.csv（题目数据层）

```csv
q_id,text,dimension,opt_0,opt_1,opt_2,opt_3,val_0,val_1,val_2,val_3
1,做事时提不起兴趣或没有乐趣,,完全没有,有几天,一半以上天数,几乎每天,0,1,2,3
```

| 字段 | 说明 |
|---|---|
| `q_id` | 题目序号（从 1 开始） |
| `text` | 题目文本 |
| `dimension` | 维度名称（单维度量表留空，多维度填写归属） |
| `opt_N` | 第 N 个选项的文本 |
| `val_N` | 第 N 个选项的分值（反向题直接填翻转后的值） |

**选项数量不固定**：`opt_0`~`opt_N` 和 `val_0`~`val_N` 的数量由 `basic.json` 的 `source.optionPrefix/valuePrefix` 动态识别，不强制列数。

**反向计分**：不单独标记 reverse，直接在 `val_*` 中体现翻转后的分值。

## 计分引擎工作原理

### 单维度（sum）

```
总分 = Σ 各题选中选项对应的 val
```

### 多维度（dimensionSum）

```
按 dimension 列分组：
  躯体化维度分 = Σ 躯体化题的 val
  焦虑维度分 = Σ 焦虑题的 val

因子均分 = 维度分 / 该维度题目数
```

然后查 `interpretation` 表得出每个维度的等级和解读。

## 扩展路径

### 近期（当前版本）

- 3-5 个常见量表（PHQ-9、GAD-7、SAS 等）
- 前端计分，即时出结果
- 无持久化

### 未来

- 后端校验：`scorer.js` 替换为 API 调用，其余不变
- 结果持久化：接入数据库，支持历史记录和趋势
- PDF 报告导出
- 更多量表（SCL-90、MMPI、EPQ 等）

## SCL-90 维度与题目映射

SCL-90 共 90 题，分为 9 个症状维度：

| 维度 | 题目数 | 因子均分阈值 |
|---|---|---|
| 躯体化 | 12 | ≥2 为异常 |
| 强迫症状 | 10 | ≥2 为异常 |
| 人际敏感 | 9 | ≥2 为异常 |
| 抑郁 | 13 | ≥2 为异常 |
| 焦虑 | 10 | ≥2 为异常 |
| 敌对 | 6 | ≥2 为异常 |
| 恐怖 | 7 | ≥2 为异常 |
| 偏执 | 6 | ≥2 为异常 |
| 精神病性 | 7 | ≥2 为异常 |
| 其他（睡眠、饮食等） | 7 | — |

> 具体题目归属见 `scales/scl-90/items.csv` 的 `dimension` 列。
