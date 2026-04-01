# 省级党政主官活动数据库 MVP

一个基于 `Next.js + TypeScript + Prisma + SQLite` 的中文事件数据库型网页应用，围绕 **2026 年 3 月省级党政主官活动** 建立“检索召回 -> 来源校验 -> 正文抽取 -> 事件抽取 -> 去重归并 -> 查询展示”的可运行 MVP。

当前目标：

- 覆盖 31 个省级行政区的主官名录与基础来源白名单
- 打通数据库、CLI、事件模型、查询页与详情页
- 用北京、广东、浙江、湖北、四川 5 个地区的真实风格样例数据演示完整链路

## 技术栈

- 前端：Next.js App Router + TypeScript + Tailwind CSS
- 后端：Next.js Route Handlers
- 数据库：SQLite
- ORM：Prisma
- 检索：可替换 Search Provider，默认 `mock`
- 页面抓取：Playwright + Cheerio
- CLI：Node + `tsx`

## 目录结构

```text
province-activity-mvp
├─ app
│  ├─ api
│  ├─ events/[id]
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components
├─ data
│  ├─ mock
│  └─ seeds
├─ lib
│  ├─ db
│  ├─ pipeline
│  ├─ search
│  ├─ utils
│  └─ prisma.ts
├─ prisma
│  ├─ schema.prisma
│  └─ seed.ts
├─ scripts
├─ .env
├─ package.json
└─ README.md
```

## 核心模型

Prisma 已实现以下核心表：

- `Region`
- `Leader`
- `SourceSite`
- `SearchTask`
- `CandidateUrl`
- `RawArticle`
- `Event`
- `EventLeader`
- `EventSource`

说明：

- `Event` 与 `EventSource` 分离，支持一事多源
- `dedupKey` 用作聚类和去重辅助键，而不是抓取前置唯一键
- `RawArticle.credibilityLevel` 保留来源级别，前端可直接筛选 A/B/C

## 已实现链路

### 1. 检索任务生成

命令：

```bash
npm run search:generate -- --month=2026-03
```

逻辑：

- 按 `日期 × 地区 × 主官` 生成搜索任务
- 每位主官每天生成 2 条查询模板
- Provider 抽象定义在 [lib/search/providers/base.ts](/D:/Research/202503-官员调研/province-activity-mvp/lib/search/providers/base.ts)

### 2. 候选链接入库

命令：

```bash
npm run candidates:ingest -- --month=2026-03 --provider=mock
```

逻辑：

- Search Provider 输出 `url/title/snippet/domain/rank`
- 结果先进入 `CandidateUrl`
- 使用 `source-matcher` 判断 A/B/C/D 与是否属于当前地区可信来源

### 3. 正文抓取

命令：

```bash
npm run fetch:articles
```

逻辑：

- 优先命中 mock 文章夹具
- 否则走 Playwright 抓取详情页
- 用 Cheerio 提取标题、发布时间、正文和来源名

### 4. 事件抽取

命令：

```bash
npm run extract:events
```

规则能力：

- 领导识别：姓名 + 职务 + 地区名录约束
- 日期识别：正文显式日期 > 标题/导语 > 发布时间 > 相对日期
- 活动类型分类：会议、调研、会见、讲话、安全生产、经济工作等
- 标准标题生成：生成便于检索的规范化事件标题

### 5. 去重归并

命令：

```bash
npm run dedup
```

去重因子：

- 同地区
- 同一天或相邻 1 天
- 领导重合
- 标题关键词重合
- 摘要前段相似
- 地点相似
- 活动类型相同或近似

归并后：

- 多来源保留在 `EventSource`
- 自动挑选 `primary source`
- 更新聚类用 `dedupKey`

## 一键演示流程

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:init
```

### 3. 导入地区、领导、来源 seed

```bash
npm run seed
```

### 4. 跑完整演示管道

```bash
npm run pipeline -- --month=2026-03
```

### 5. 启动网页

```bash
npm run dev
```

浏览器打开：

- [http://localhost:3000](http://localhost:3000)

## 单独 CLI 命令

```bash
npm run db:init
npm run seed
npm run search:generate -- --month=2026-03
npm run candidates:ingest -- --month=2026-03 --provider=mock
npm run fetch:articles
npm run extract:events
npm run dedup
npm run pipeline -- --month=2026-03
npm run dev
```

## 当前样例覆盖

已提供真实风格样例链路的地区：

- 北京
- 广东
- 浙江
- 湖北
- 四川

示例来源层级：

- A 级：省级政府门户
- B 级：省级官方媒体
- C 级：新华网地方频道
- D 级：商业聚合站，默认不参与事件生成

## 首页能力

首页支持：

- 按日期查询
- 按省份查询
- 按领导姓名查询
- 按职务查询
- 按活动类型筛选
- 按来源级别筛选

页面展示：

- 事件列表
- 事件详情页
- 基础统计区块

## 扩展到全量真实抓取的方式

### 第一层：扩展 Source Registry

- 在 [data/seeds/source-sites.ts](/D:/Research/202503-官员调研/province-activity-mvp/data/seeds/source-sites.ts) 为更多地区补充党委官网、政府官网、省级党报与广电域名
- 不需要改抽取主流程

### 第二层：接入真实搜索 Provider

- 参考 [lib/search/providers/base.ts](/D:/Research/202503-官员调研/province-activity-mvp/lib/search/providers/base.ts)
- 新建如 `bing.ts`、`sogou.ts`、`manual-import.ts`
- 只要返回统一结构即可接入现有管道

### 第三层：增加少量站点适配器

- 当前 `article-fetcher` 已支持通用抓取
- 对个别结构特殊站点，可在 [lib/pipeline/article-fetcher.ts](/D:/Research/202503-官员调研/province-activity-mvp/lib/pipeline/article-fetcher.ts) 增加 selector 适配
- 核心架构仍然是“检索驱动 + 来源校验 + 事件归并”

### 第四层：扩展到地级市

- `Region.parentId` 已预留层级结构
- 未来新增地级市时，Region、Leader、SourceSite 可继续复用
- 抽取与去重逻辑仍按“地区约束”工作

## 数据说明

- `Region` 已覆盖全部 31 个省级行政区
- `Leader` 已写入省级党政主官名录快照
- `SourceSite` 预置了全省级政府门户白名单，并补充了 5 个地区的官方媒体源
- Mock 数据用于演示工程链路，不代表最终生产库规模

## 后续建议

- 为每个地区补全党委官网与省级党媒域名，提高 A/B 级召回率
- 引入 `manual import` provider，方便人工批量导入搜索结果 CSV
- 在 `RawArticle` 上增加正文段落分块、导语抽取和版面信息
- 引入轻量相似度库或 embedding，提高跨站标题差异场景下的归并准确率
- 切换到 PostgreSQL 时，Prisma schema 基本可直接复用，仅需调整 `datasource`

## 备注

- 由于本项目当前默认使用 `mock provider`，你不需要先接真实搜索 API 就能演示完整闭环
- 如需真实联网抓取，请补充真实 Provider 并在可联网环境下运行 `Playwright`
