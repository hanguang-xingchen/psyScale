# psyScale — 开源心理学多量表评估

> 配置驱动的静态 Web 应用，即开即用，无需后端、无需构建工具。

**在线体验**：<https://hanguang-xingchen.github.io/psyScale/>

## 功能

- 支持 **PHQ-9**（抑郁症筛查）、**GAD-7**（广泛性焦虑）、**SCL-90**（症状自评，90 题 10 维度含雷达图）
- 前端即时计分，结果页提供 JSON 报告下载
- 多维度量表支持 SVG 可交互雷达图
- 纯静态部署，任何静态托管均可运行

## 快速开始

```bash
git clone https://gitea.hanguangxingchen.cyou/hanguang-xingchen/psyScale.git
# 将目录部署到任意静态服务器即可
```

## 新增量表

只需两步：

1. 在 `scales/` 下创建目录，添加 `basic.json`（规则声明）和 `items.csv`（题目数据）
2. 在 `scales/index.json` 中添加量表 ID

无需修改任何 JS 代码。详见 [thinking.md](thinking.md)。

## 技术栈

零框架、零依赖、零构建。纯 HTML + CSS + 原生 JS (ESM)。

## 许可证

本项目采用 [AGPL-3.0](LICENSE) 开源协议。
