# QianJi Screenshot Importer - Project Status

## 当前项目目标

QianJi Screenshot Importer 是一个专门为钱迹设计的账单截图导入工具。

目标用户主要在 iPhone、Android 浏览器或 PWA 中使用。用户上传支付宝或微信账单截图后，系统完成 OCR 识别、交易提取、重复提示、AI 分类、用户审核，并生成符合钱迹导入格式的 CSV 文件。

核心目标是让用户在手机上约 10 秒内完成账单导入。

## 已完成内容

当前完成到 OCR Phase：已接入 MiniMax-M3 多模态 OCR 和 MiniMax 文本分类。

已完成：

- 初始化 Next.js 15 项目配置
- 创建 TypeScript 严格模式配置
- 创建 TailwindCSS 基础样式
- 创建 PWA 基础 manifest 和 icon
- 创建核心交易类型定义
- 创建 Mock 交易数据
- 创建 Zustand 导入会话 store
- 创建上传页面
- 创建审核页面
- 创建导出预览页面
- 创建 Mock 测试页面
- 创建移动端优先的基础 UI 组件
- 创建 OCR API route，并已接入 MiniMax-M3 多模态
- 创建分类 API route，并已接入 MiniMax-M3 文本分类
- 创建图片文件校验和 FormData 组装工具
- 创建重复检测工具
- 创建钱迹 CSV 映射工具的基础函数
- 创建 IndexedDB 商户分类缓存模块
- 创建 `classifyWithCache(merchant)` 分类管线
- Mock 数据接入分类缓存写入流程
- 上传流程预留 OCR 成功后的分类管线入口
- 导出页接入钱迹 CSV 预览和下载
- 创建 `lib/minimax.ts`
- `/api/classify` 已调用真实 MiniMax 文本分类封装
- MiniMax 分类结果已增加 JSON Schema 校验，非法内容回退为 `其它 / 其它`
- MiniMax 分类请求已增加 15 秒超时和最多 2 次重试
- 分类流程已增加 `cache hit`、`cache miss`、`api success`、`api fail` 调试日志
- Mock 测试页已增加“清空缓存”按钮，用于验证 IndexedDB 命中流程
- 分类 schema 已新增 `餐饮 / 外卖`
- 已验证 `美团外卖`、`饿了么`、`肯德基宅急送` 均返回 `餐饮 / 外卖`，第二次请求命中 IndexedDB 缓存
- `/api/ocr` 已保持 FormData 上传并接入 MiniMax-M3 多模态
- OCR 返回标准交易结构 `{ merchant, amount, date, account, type }`
- OCR schema 已新增 `type: income | expense`
- OCR type 规则已加入：金额 `+` 为收入，金额 `-` 为支出，`微信红包-来自xxx` 为收入，`转账-转给xxx` 为支出，`余额宝-收益发放` 为收入
- OCR 单图失败不会阻断整体流程，会返回 `warnings` 并继续处理其它图片
- Phase 5 端到端验证通过：两张真实截图 OCR 共 13 条，收入 3 条、支出 10 条，CSV 已正确输出收入/支出类型
- Phase 6 已修分类规则，当前按钱迹常用分类优化为：`转账-转给` -> `转出 / 其它`，`微信红包-来自` -> `收入 / 红包收入`，`余额宝-收益发放` -> `收入 / 理财收益`
- Phase 6 已修支付宝相对日期：`今天 / 昨天 / 前天` 根据上传日期转换真实日期
- Phase 6 端到端验证通过：支付宝截图中的 `今天` 已转换为 `2026-06-09`，转账/红包/余额宝规则均命中
- 已优化钱迹导入分类准确率：分类 schema 已切换为用户常用钱迹分类，减少 `其它 / 其它`
- 已新增共享 keyword 分类规则，规则优先级高于 MiniMax 分类结果
- MiniMax 返回非法分类时，会先按 merchant 执行 keyword fallback，再兜底为 `其它 / 其它`
- 上传 OCR 后默认的 `其它 / 其它` 不再作为分类缓存 fallback，避免提前写入低质量缓存

## 已创建文件列表

```text
package.json
next.config.mjs
tsconfig.json
next-env.d.ts
postcss.config.mjs
tailwind.config.ts
.eslintrc.json
.prettierrc
.gitignore
.env.example

app/globals.css
app/layout.tsx
app/page.tsx
app/review/page.tsx
app/export/page.tsx
app/mock/page.tsx
app/api/ocr/route.ts
app/api/classify/route.ts

components/app-shell.tsx
components/button.tsx
components/upload-zone.tsx
components/transaction-table.tsx

lib/types.ts
lib/mock-data.ts
lib/utils.ts
lib/dedupe.ts
lib/csv.ts
lib/image.ts
lib/category-rules.ts
lib/category-cache.ts
lib/classification.ts
lib/minimax.ts

store/import-store.ts

public/manifest.json
public/icon.svg

PROJECT_STATUS.md
ARCHITECTURE.md
```

## 已确认架构决策

- 不把 OCR 识别和 AI 分类放在同一个 Prompt 中。
- 采用两阶段架构：
  - 第一阶段：截图 -> MiniMax Vision -> 提取交易记录 JSON
  - 第二阶段：merchant -> MiniMax LLM -> 分类
- OCR 上传不使用 Base64。
- 图片上传采用 `File -> FormData -> POST /api/ocr`，降低移动端内存占用。
- 分类缓存不使用 LocalStorage。
- 分类缓存直接使用 IndexedDB。
- IndexedDB 表名为 `merchant_category_cache`。
- 分类查询顺序为：
  - merchant
  - 本地 keyword 规则
  - IndexedDB 缓存
  - 未命中调用 MiniMax 分类 API
  - MiniMax 返回非法分类时先走 keyword fallback
  - 写回 IndexedDB
- 重复检测不自动取消勾选。
- 重复记录只设置 `possibleDuplicate = true`。
- 默认保持 `selected = true`，由用户决定是否导入。
- API Key 只保存在服务端环境变量，不暴露给浏览器。
- 前端使用 Zustand 管理当前导入会话。
- 钱迹 CSV 使用 UTF-8 BOM。

## 当前实现状态

当前代码是 OCR Phase 接入后的状态。

可用内容：

- 页面骨架可导航：
  - `/`
  - `/review`
  - `/export`
  - `/mock`
- Mock 页面可以载入测试交易到 Zustand store。
- 审核页面可以展示、编辑、选择、全选、取消全选、删除交易。
- 重复检测工具会标记 `possibleDuplicate`，但不取消勾选。
- 上传组件会校验图片类型，并按 FormData 方式组织文件。
- `/api/ocr` 已接入 MiniMax-M3 多模态，接收 FormData 图片上传。
- `/api/classify` 已接入 MiniMax 分类封装。
- `lib/csv.ts` 已有钱迹 CSV 映射、BOM 生成和下载函数。
- IndexedDB 已实现 `merchant_category_cache`。
- `classifyWithCache(merchant)` 已实现缓存优先查询。
- Mock 页面载入数据时会把现有分类写入 IndexedDB 缓存。
- 上传组件已接入 `/api/ocr` 成功后的交易转换和分类管线。
- 导出页已支持 CSV 预览和下载 `qianji_import.csv`。
- `/api/classify` 已接入 `classifyMerchant(merchant)`。
- 缺少 MiniMax API Key 或 API 返回非法内容时，会回退 `其它 / 其它`，不阻断前端流程。
- 当前 `.env.local` 已配置 MiniMax 文本分类：`MINIMAX_BASE_URL=https://api.minimaxi.com/v1`，`MINIMAX_TEXT_MODEL=MiniMax-M3`。
- 当前 `.env.local` 已配置 `MINIMAX_VISION_MODEL=MiniMax-M3`。
- 同一个商户连续分类两次时，第二次可命中 IndexedDB 缓存。

未完成内容：

- 已安装依赖并生成 `package-lock.json`。
- 已运行 dev server 做本地验证，验证后已停止。
- 已在真实 MiniMax API Key 环境中验证文本分类可用。
- 已使用真实微信账单和支付宝账单截图做端到端验证；仍需继续优化相对日期和少量分类兜底问题。
- 尚未完善 README。
- 尚未做 PWA service worker 验证。

## 已知问题

- 当前 TypeScript 检查和 lint 均通过。
- `next lint` 在 Next 15 中可能需要改为 ESLint CLI，后续应验证并调整。
- `next-pwa` 与 Next 15 兼容性需要在 Phase 4 验证。
- `/api/ocr` 当前失败 fallback 为返回空交易数组和 warnings，不会 500 阻断整个批次。
- 2026-06-09 OCR 实际截图验证未完成：工作区、Downloads、Desktop 未找到微信支付截图、支付宝账单截图或银行通知截图样本；Pictures 的 Photos Library 无权限读取。
- `/api/ocr` 路由已启动验证：multipart/form-data 无 `images` 字段时返回 `400 {"error":"请上传账单截图"}`。
- `/api/ocr` 直接空 POST 非 multipart 请求会在 `request.formData()` 抛 TypeError 并记录 500；真实 FormData 文件上传不受此路径影响，但后续可补 400 防御。
- 由于缺少真实截图样本，本轮未触发 MiniMax Vision 调用，merchant/amount/date/account 准确率暂无法评估。
- 未命中 IndexedDB 且没有 fallback 分类时，`classifyWithCache` 会调用 `/api/classify`；API 失败时会返回兜底分类。
- Mock 数据可以跑通缓存、去重、审核、CSV 下载闭环，因为 Mock 数据自带分类作为缓存 fallback。

## 后续任务

Phase 3 范围：

- 接入 MiniMax OCR
- 实现分类缓存
- 实现 CSV 导出

执行顺序已调整为：

1. `lib/category-cache.ts` 已完成
2. `classifyWithCache(merchant)` 已完成
3. 上传流程接入分类管线已完成
4. 钱迹 CSV 生成与下载已完成
5. `/api/classify` 接 MiniMax，已完成
6. `/api/ocr` 接 MiniMax Vision，已完成

后续建议：

- 用真实支付宝/微信截图验证 OCR 准确率
- 继续减少分类 `其它 / 其它`
- 根据更多真实截图样本优化 OCR prompt

## MiniMax 接入计划

环境变量：

```text
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_VISION_MODEL=MiniMax-M3
MINIMAX_TEXT_MODEL=MiniMax-M3
MINIMAX_TIMEOUT_MS=15000
MINIMAX_RETRIES=2
```

OCR API：

- Route：`POST /api/ocr`
- Request：`multipart/form-data`
- 字段：`images`
- 每张图片作为 `File` 上传。
- 服务端读取 `File.arrayBuffer()`。
- 服务端按 MiniMax Vision API 要求转换图片输入。
- 返回统一交易 JSON。

OCR Prompt：

```text
你是钱迹账单截图导入助手。
请从支付宝或微信账单截图中识别交易记录。
只返回严格 JSON 数组，不要 Markdown，不要解释。

字段：
platform: "wechat" 或 "alipay"
merchant: 商户名称
amount: 数字
datetime: "YYYY-MM-DD HH:mm:ss"
type: "income" 或 "expense"
```

分类 API：

- Route：`POST /api/classify`
- Request：`{ "merchant": string }`
- Response：`{ "category": string, "subcategory": string }`
- 只负责分类，不接收截图，不处理 OCR。

分类 Prompt：

```text
你是钱迹账单导入分类助手。
根据商户名称判断最适合的钱迹分类。
只返回严格 JSON，不要 Markdown，不要解释，不要返回其它字段。

可选分类：
餐饮: 三餐, 零食, 烟酒
日用百货: 其它
营养保健: 其它
育儿服务: 其它
婴儿用品: 其它
婴儿食品: 其它
厨房电器: 其它
服饰装扮: 其它
母婴用品: 其它
转出: 其它
交通: 停车费, 充电, 配件
学习: 其它
运动: 其它
旅行: 其它
娱乐: 其它
医疗: 产检, 药品, 就诊, 疫苗, 住院
电器数码: 其它
请客送礼: 其它
爱车养车: 其它
文化休闲: 其它
住房: 日用品, 水电煤, 房贷, 房租, 家具, 家电, 厨房
收入: 红包收入, 理财收益, 收红包, 结婚收礼, 寿辰收礼, 乔迁收礼, 其它
其它: 其它

未知商户返回：
{"category":"其它","subcategory":"其它"}
```

## CSV 导出计划

CSV 文件：

- 文件名：`qianji_import.csv`
- 编码：UTF-8 BOM
- 只导出 `selected === true` 的交易

字段顺序：

```text
时间
分类
二级分类
类型
金额
账户1
账户2
备注
```

映射规则：

- `platform = wechat` -> `账户2 = 微信账户`
- `platform = alipay` -> `账户2 = 支付宝账户`
- `type = income` -> `类型 = 收入`
- `type = expense` -> `类型 = 支出`
- `备注 = 平台中文名 + "-" + merchant`
- 时间格式输出为 `YYYY/MM/DD`
- 金额保留两位小数

Phase 3 第 1-4 步已完成：

- 导出页下载按钮
- CSV 生成错误提示
- 空记录禁止下载
- 下载后保留当前审核状态

## IndexedDB 计划

数据库建议：

```text
database: qianji_screenshot_importer
version: 1
objectStore: merchant_category_cache
keyPath: merchant
```

结构：

```ts
interface MerchantCategoryCache {
  merchant: string;
  category: string;
  subcategory: string;
  updatedAt: string;
}
```

Phase 3 已实现基础能力：

- `getMerchantCategory(merchant)`
- `setMerchantCategory(record)`
- `classifyWithCache(merchant)`

查询流程：

```text
merchant
-> 本地 keyword 规则
-> IndexedDB merchant_category_cache
-> 命中直接返回
-> 未命中 POST /api/classify
-> MiniMax 返回非法分类时先执行 keyword fallback
-> 写回 IndexedDB
-> 返回分类结果
```

Phase 4 可扩展：

- 缓存过期策略
- 批量预热
- 导入 / 导出分类规则
- 用户手动修改分类后回写缓存

## PWA 计划

Phase 4 范围：

- 验证 `next-pwa` 与 Next 15 的兼容性
- 生成 service worker
- 配置离线 fallback
- 优化 manifest
- 增加 iOS 安装体验相关 meta
- 验证移动端 PWA 启动页
- 缓存静态资源
- 避免缓存 API 响应中的敏感内容

PWA 原则：

- API Key 不进入浏览器缓存。
- OCR 和分类接口不做持久缓存。
- 仅缓存静态 UI 资源。
- 用户交易数据当前只存在 Zustand 内存和 IndexedDB 分类缓存中。
