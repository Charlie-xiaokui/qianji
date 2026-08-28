# Business Rules

本文档说明 QianJi Screenshot Importer 的业务规则系统。后续新增商户分类规则或默认勾选规则时，优先修改：

```text
lib/category-rules.ts
```

不要把业务规则写进 OCR、支付宝导入、微信导入、Review 组件或 CSV 导出逻辑。

## 规则结构

`lib/category-rules.ts` 里维护两类规则：

- `businessCategoryRules`：高优先级固定分类规则，优先于缓存和 AI。
- `keywordFallbackRules`：原有 keyword fallback，作为 AI 后的兜底补救。
- `defaultSelectionRules`：审核页默认勾选规则，只影响 `selected` 初始值。

分类规则和默认选择规则分开执行，互不混用。

## 分类执行顺序

当前分类顺序为：

```text
固定业务规则
-> 已确认的本地分类缓存
-> AI / MiniMax 分类
-> keyword fallback
-> 其它 / 其它
```

规则命中后不会继续调用 AI。AI 返回结果必须通过 `CATEGORY_OPTIONS` schema 校验；非法结果不会写入缓存。`其它 / 其它` 不会过早写入缓存。

CSV 导出阶段不重新分类，只使用 Review 页面最终确认的 `category/subcategory`。

## 文本匹配

所有规则统一使用：

```ts
normalizeRuleText(value)
getTransactionSearchText(transaction)
```

`normalizeRuleText` 会处理：

- `null` / `undefined`
- 前后空格
- 连续空格
- 换行
- 制表符
- 中文全角空格
- 英文大小写
- `-` / `－` / `—` / `–` 连接符统一

`getTransactionSearchText` 会统一组合交易中的可识别文本，例如：

- `merchant`
- `title`
- `description`
- `remark`
- `counterparty`
- `transactionTarget`
- `originalCategory`
- `rawCategory`
- `rawText`
- `sourceDescription`
- 支付宝交易名称 / 交易对象
- 微信商品说明 / 交易对方
- OCR 原始识别文本
- `note`
- `paymentMethod`
- `status`
- `sourceFile`

后续规则不要自己在组件或解析器里拼文本。

## 新增分类规则

在 `businessCategoryRules` 或 `keywordFallbackRules` 中追加配置：

```ts
{
  id: "example-merchant-rule",
  description: "某商户分类规则",
  enabled: true,
  priority: 500,
  match: {
    includesAny: ["某商户", "某交易关键词"]
  },
  result: {
    category: "餐饮",
    subcategory: "三餐"
  }
}
```

`result.category/subcategory` 必须存在于 `CATEGORY_OPTIONS`，否则规则不会生效。

## 新增默认选择规则

在 `defaultSelectionRules` 中追加配置：

```ts
{
  id: "example-selection-rule",
  description: "某账户下某交易默认不选中",
  enabled: true,
  priority: 500,
  accounts: ["汪一波账户"],
  match: {
    includesAny: ["某交易关键词"]
  },
  selected: false
}
```

默认选择规则只在以下时机执行：

- 一批交易首次进入审核页面
- 用户切换导入账户
- 新导入一批交易时，对新记录执行

如果用户手动勾选或取消勾选，`selectionTouched` 会被标记，后续默认规则不会覆盖用户选择。

## Priority

`priority` 数字越大，优先级越高。

同类规则会按 `priority` 从高到低匹配，第一条命中后立即返回。建议：

- `1000`：强固定业务规则，例如指定商户必须归类
- `700-900`：账户默认勾选规则
- `100-500`：普通 keyword fallback

避免多个高优先级规则同时匹配同一交易。

## 匹配条件

分类规则和默认选择规则都支持：

- `includesAny`：包含任一关键词
- `includesAll`：必须同时包含多个关键词
- `exactAny`：归一化后完全等于任一文本
- `excludesAny`：包含任一排除词则不匹配
- `sources`：限定来源，支持 `alipay`、`wechat`、`ocr`

示例：

```ts
match: {
  includesAny: ["服装", "衣服"],
  excludesAny: ["宝宝", "婴儿"],
  sources: ["alipay", "wechat"]
}
```

## 当前固定规则

杭州城市通交通卡有限公司：

```ts
{
  id: "hangzhou-city-pass-recharge",
  description: "杭州城市通交通卡有限公司归类为交通卡充值",
  enabled: true,
  priority: 1000,
  match: {
    includesAny: ["杭州城市通交通卡有限公司"]
  },
  result: {
    category: "交通",
    subcategory: "交通卡充值"
  }
}
```

汪一波账户余额宝收益发放费用默认不导出：

```ts
{
  id: "wang-yibo-yuebao-fee-unselected",
  description: "汪一波账户下余额宝收益发放费用默认不导出",
  enabled: true,
  priority: 1000,
  accounts: ["汪一波账户"],
  match: {
    includesAny: ["余额宝-收益发放费用"]
  },
  selected: false
}
```

## 调试日志

开发环境中，规则命中会输出简洁日志：

```text
[rules] category matched: hangzhou-city-pass-recharge
[rules] selection matched: wang-yibo-yuebao-fee-unselected
```

生产环境默认不输出。日志只包含 `ruleId` 和必要来源，不打印完整交易原文，避免泄露隐私。

## 常见错误

### 配置了不存在的分类

`result.category/subcategory` 必须存在于 `CATEGORY_OPTIONS`。如果新增了新的二级分类，需要先更新 schema。

### 匹配词过短导致误命中

不要使用过短关键词，例如单字或过于宽泛的词。优先使用完整商户名或更明确的交易描述。

### 多条规则优先级冲突

如果多条规则都能命中同一交易，只有 priority 最高的第一条生效。新增规则前先检查已有规则。

### 把业务规则写进 React 组件

Review 页面只负责展示和用户交互。默认勾选、分类规则都应放在 `lib/category-rules.ts`。

### render 时重复覆盖用户勾选

默认选择规则不能在 render、分类修改、金额修改、商户编辑时重复执行。当前只在 `setTransactions` 和 `setAccount2` 中通过 `applyAccountSelectionDefaults` 执行，并尊重 `selectionTouched`。

### CSV 导出阶段再次分类

CSV 导出不能调用 keyword rule 或 AI。它只校验 Review 页面最终分类是否合法，然后按钱迹格式输出。
