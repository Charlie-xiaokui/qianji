# QianJi Screenshot Importer - Architecture

## 整体架构图

```text
Mobile Browser / PWA
  |
  | File[] screenshots
  v
Upload Page
  |
  | File -> FormData
  v
POST /api/ocr
  |
  | server-side MiniMax Vision request
  v
OcrTransaction[]
  |
  | map to internal Transaction, add id, selected, empty category fields
  v
Zustand Import Store
  |
  | mark possibleDuplicate
  v
Classification Pipeline
  |
  | merchant lookup
  v
IndexedDB merchant_category_cache
  |
  | cache miss
  v
POST /api/classify
  |
  | server-side MiniMax LLM request
  v
CategoryResult
  |
  | write cache and update store
  v
Review Page
  |
  | selected transactions
  v
Export Page
  |
  | PapaParse / Blob / UTF-8 BOM
  v
qianji_import.csv
```

## OCR 流程

OCR 和分类必须分离。

OCR 只负责从截图中提取交易记录，不负责判断分类。

流程：

```text
用户选择图片
-> 校验文件类型 jpg / jpeg / png / webp
-> File[] 组装为 FormData
-> POST /api/ocr
-> 服务端读取 File
-> 调用 MiniMax Vision API
-> 校验 JSON
-> 返回 OcrTransaction[]
-> 前端映射为内部 Transaction
```

`POST /api/ocr` 输入：

```text
Content-Type: multipart/form-data
images: File[]
```

`POST /api/ocr` 输出：

```ts
{
  transactions: OcrTransaction[];
  warnings: string[];
}
```

OCR 返回结构：

```ts
interface OcrTransaction {
  merchant: string;
  amount: number;
  date: string;
  account: string;
  type: "income" | "expense";
}
```

OCR fallback：

- 单张图片失败时返回空记录并写入 `warnings`
- 多图批量上传时，失败图片不阻断其它图片
- 全部失败时返回 `transactions: []` 和 `warnings`

OCR type 规则：

- 金额前有 `+` -> `income`
- 金额前有 `-` -> `expense`
- `微信红包-来自xxx` -> `income`
- `转账-转给xxx` -> `expense`
- `余额宝-收益发放` -> `income`

相对日期规则：

- 支付宝截图中的 `今天 / 昨天 / 前天` 需要根据上传日期转换成真实日期
- 当前上传日期按 `Asia/Singapore` 时区生成并传入 OCR prompt

## 分类流程

分类只接收商户名称。

分类 Prompt 可缓存，相同商户不重复请求 MiniMax。

流程：

```text
Transaction.merchant
-> 查询 IndexedDB merchant_category_cache
-> 命中：返回 category/subcategory
-> 未命中：POST /api/classify
-> MiniMax LLM 返回 category/subcategory
-> 写入 IndexedDB
-> 更新 Zustand 中对应交易
```

当前实现状态：

- IndexedDB 缓存模块已实现。
- `classifyWithCache(merchant)` 已实现。
- Mock 数据会用自身已有分类作为 fallback 写入缓存。
- `/api/classify` 已接入 MiniMax 文本分类封装。
- MiniMax 分类结果使用本地 JSON Schema 校验，非法内容回退为 `其它 / 其它`。
- MiniMax 分类请求 15 秒超时，最多重试 2 次。
- `/api/ocr` 已接入 MiniMax-M3 多模态。

`POST /api/classify` 输入：

```ts
{
  merchant: string;
}
```

`POST /api/classify` 输出：

```ts
{
  category: string;
  subcategory: string;
}
```

分类参考：

```text
餐饮: 早餐, 午餐, 晚餐, 饮品, 外卖
交通: 打车, 公交, 地铁
购物: 日用品, 电商
娱乐: 游戏, 电影
医疗: 药品, 医院
住房: 房租, 水电
教育: 课程, 书籍
收入: 工资, 奖金, 转账收入
其它: 其它
```

未知商户返回：

```json
{
  "category": "其它",
  "subcategory": "其它"
}
```

## 去重流程

去重只做提示，不自动排除记录。

唯一 key：

```text
merchant + amount + datetime-minute
```

示例：

```text
蜜雪冰城_18.00_2026-04-05T12:33
```

流程：

```text
Transaction[]
-> 按顺序生成 transactionKey
-> 第一次出现：possibleDuplicate = false
-> 再次出现：possibleDuplicate = true
-> selected 默认仍为 true
```

行为要求：

- 不自动取消勾选
- 不自动删除
- UI 显示“疑似重复”
- 用户手动决定是否导入

## CSV 生成流程

CSV 只导出用户勾选的交易。

流程：

```text
Zustand transactions
-> filter selected === true
-> 钱迹字段映射
-> PapaParse unparse
-> 添加 UTF-8 BOM
-> Blob
-> 下载 qianji_import.csv
```

当前实现状态：

- `lib/csv.ts` 已实现钱迹字段映射、UTF-8 BOM 和下载。
- `/export` 页面已接入 CSV 预览和下载按钮。
- 空记录会禁止下载并提示错误。

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

```text
datetime -> 时间，格式 YYYY/MM/DD
category -> 分类
subcategory -> 二级分类
income -> 收入
expense -> 支出
amount -> 金额，保留两位小数
账户1 -> 空
wechat -> 账户2 = 微信账户
alipay -> 账户2 = 支付宝账户
备注 -> 平台中文名 + "-" + merchant
```

示例：

```csv
时间,分类,二级分类,类型,金额,账户1,账户2,备注
2026/04/05,餐饮,饮品,支出,18.00,,微信账户,微信-蜜雪冰城
```

## 数据结构定义

```ts
type Platform = "wechat" | "alipay";
type TransactionType = "income" | "expense";

interface OcrTransaction {
  merchant: string;
  amount: number;
  date: string;
  account: string;
}

interface Transaction {
  id: string;
  platform: Platform;
  merchant: string;
  amount: number;
  datetime: string;
  type: TransactionType;
  category: string;
  subcategory: string;
  possibleDuplicate?: boolean;
  selected?: boolean;
  note?: string;
  sourceFile?: string;
}

interface CategoryResult {
  category: string;
  subcategory: string;
}

interface MerchantCategoryCache {
  merchant: string;
  category: string;
  subcategory: string;
  updatedAt: string;
}
```

## API 设计

### POST /api/ocr

职责：

- 接收截图文件
- 调用 MiniMax Vision
- 返回交易 JSON
- 不做分类
- 不写缓存

Request：

```text
multipart/form-data
images: File[]
```

Response：

```ts
{
  transactions: OcrTransaction[];
  warnings: string[];
}
```

常见 fallback：

```ts
{
  transactions: [];
  warnings: ["example.png: 未识别到账单"];
}
```

### POST /api/classify

职责：

- 接收 merchant
- 调用 MiniMax LLM
- 返回分类
- 不接收截图
- 不处理 OCR
- 不直接访问 IndexedDB，因为 IndexedDB 在浏览器端
- API 失败或返回非法内容时回退 `其它 / 其它`

Request：

```ts
{
  merchant: string;
}
```

Response：

```ts
{
  category: string;
  subcategory: string;
}
```

常见错误：

```ts
{
  error: "分类失败";
}
```

## 缓存设计

分类缓存使用 IndexedDB，不使用 LocalStorage。

数据库：

```text
qianji_screenshot_importer
```

Object store：

```text
merchant_category_cache
```

Key：

```text
merchant
```

Record：

```ts
{
  merchant: string;
  category: string;
  subcategory: string;
  updatedAt: string;
}
```

读取策略：

```text
merchant
-> get from IndexedDB
-> found: return cached category
-> missing: call /api/classify
-> write result to IndexedDB
-> return category
```

写入时机：

- MiniMax 分类 API 成功返回后
- 后续可在用户手动修改分类后写回缓存

缓存优势：

- 相同商户无需重复分类
- 成本更低
- 响应更快
- 分类 Prompt 与 OCR Prompt 解耦
- 后续可替换为本地规则库

当前已实现文件：

```text
lib/category-cache.ts
lib/classification.ts
lib/minimax.ts
```

已实现函数：

```ts
getMerchantCategory(merchant)
setMerchantCategory(record)
classifyWithCache(merchant, fallback?)
classifyTransactionsWithCache(transactions)
classifyMerchant(merchant)
```

调试日志：

```text
[classify] cache hit: <merchant>
[classify] cache miss: <merchant>
[classify] api success: <merchant> <category>/<subcategory>
[classify] api fail: <merchant> <reason>
```

确定性分类规则：

- merchant 以 `转账-转给` 开头 -> `转账 / 转出`
- merchant 以 `微信红包-来自` 开头 -> `收入 / 红包收入`
- merchant 包含 `余额宝-收益发放` -> `收入 / 理财收益`

## 状态管理设计

使用 Zustand 管理当前导入会话。

Store：

```ts
type ImportState = {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  selectAll: (selected: boolean) => void;
  clear: () => void;
};
```

状态流：

```text
Upload Page
-> OCR 成功
-> setTransactions
-> markDuplicates
-> classifyWithCache
-> updateTransaction category fields
-> Review Page
-> 用户编辑
-> Export Page
-> CSV
```

当前 UI 接入：

- `/mock` 载入 Mock 数据时进入分类缓存管线。
- `/` 上传成功后已预留 OCR 结果进入分类缓存管线。
- `/review` 负责编辑和选择交易。
- `/export` 负责预览和下载钱迹 CSV。

Zustand 只保存当前会话交易数据。

当前不持久化交易明细。

IndexedDB 只负责商户分类缓存，后续 Phase 4 可以扩展为：

- IndexedDB 保存导入历史
- iCloud 同步
- 用户分类规则学习
- 本地数据库恢复未完成会话
