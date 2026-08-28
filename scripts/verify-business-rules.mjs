import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

function resolveProjectModule(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return path.join(root, `${specifier.slice(2)}.ts`);
  }

  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(fromFile), specifier);
    if (existsSync(resolved)) return resolved;
    if (existsSync(`${resolved}.ts`)) return `${resolved}.ts`;
    if (existsSync(`${resolved}.tsx`)) return `${resolved}.tsx`;
  }

  return undefined;
}

function requireTs(file) {
  if (moduleCache.has(file)) return moduleCache.get(file).exports;

  const source = readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: file
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(file, module);

  const localRequire = (specifier) => {
    const projectModule = resolveProjectModule(specifier, file);
    return projectModule ? requireTs(projectModule) : require(specifier);
  };

  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function transaction(patch = {}) {
  return {
    id: "test-1",
    platform: "alipay",
    merchant: "余额宝-收益发放费用",
    amount: 0.01,
    datetime: "2026-07-01 00:00:00",
    type: "income",
    category: "收入",
    subcategory: "其它",
    selected: true,
    note: "支付宝-余额宝-收益发放费用",
    ...patch
  };
}

const { applyAccountSelectionDefaults } = requireTs(path.join(root, "lib/account-selection.ts"));
const {
  getDefaultSelection,
  matchCategoryRule,
  normalizeRuleText
} = requireTs(path.join(root, "lib/category-rules.ts"));
const { toQianjiRows } = requireTs(path.join(root, "lib/csv.ts"));

assert(normalizeRuleText(null) === "", "null 应归一化为空字符串");
assert(normalizeRuleText(undefined) === "", "undefined 应归一化为空字符串");
assert(normalizeRuleText("  ABC  def  ") === "abc def", "英文大小写和连续空格应归一化");
assert(normalizeRuleText("A－B—C–D") === "a-b-c-d", "全角和长连接符应统一为半角 -");
assert(normalizeRuleText("A\n\t　B") === "a b", "换行、制表符、中文全角空格应归一化");

const wangDefault = applyAccountSelectionDefaults("汪一波账户", [transaction()])[0];
assert(wangDefault.selected === false, "汪一波账户：余额宝-收益发放费用应默认未勾选");

const wangTouched = applyAccountSelectionDefaults("汪一波账户", [transaction({ selected: true, selectionTouched: true })])[0];
assert(wangTouched.selected === true, "汪一波账户：用户手动勾选后不应再次自动取消");

const daiDefault = applyAccountSelectionDefaults("戴冠宇账户", [transaction()])[0];
assert(daiDefault.selected === true, "戴冠宇账户：余额宝-收益发放费用应默认保持勾选");

assert(
  getDefaultSelection(transaction(), "汪一波账户").selected === false,
  "getDefaultSelection 应匹配汪一波账户余额宝费用规则"
);
assert(
  getDefaultSelection(transaction(), "戴冠宇账户").selected === true,
  "getDefaultSelection 不应匹配戴冠宇账户余额宝费用规则"
);

for (const text of ["杭州城市通交通卡有限公司", "支付宝-杭州城市通交通卡有限公司", "杭州城市通交通卡有限公司 充值"]) {
  const matched = matchCategoryRule(transaction({ merchant: text, note: text }));
  assert(matched?.category === "交通", `${text} 应分类为交通`);
  assert(matched?.subcategory === "交通卡充值", `${text} 应分类为交通卡充值`);
  assert(matched?.ruleId === "hangzhou-city-pass-recharge", `${text} 应命中杭州城市通规则`);
}

for (const text of ["杭州城市生活服务有限公司", "杭州交通有限公司"]) {
  assert(matchCategoryRule(transaction({ merchant: text, note: text })) === null, `${text} 不应命中杭州城市通规则`);
}

for (const source of ["alipay", "wechat", "ocr"]) {
  const matched = matchCategoryRule(
    transaction({
      merchant: "杭州城市通交通卡有限公司",
      note: `${source}-杭州城市通交通卡有限公司`,
      platform: source === "ocr" ? "alipay" : source,
      source
    })
  );
  assert(matched?.ruleId === "hangzhou-city-pass-recharge", `${source} 来源应命中同一杭州城市通规则`);
}

const trafficCategory = matchCategoryRule("杭州城市通交通卡有限公司");
assert(trafficCategory?.category === "交通", "杭州城市通交通卡有限公司应分类为交通");
assert(trafficCategory?.subcategory === "交通卡充值", "杭州城市通交通卡有限公司应分类为交通卡充值");

const [csvRow] = toQianjiRows([
  transaction({
    merchant: "杭州城市通交通卡有限公司",
    type: "expense",
    category: trafficCategory.category,
    subcategory: trafficCategory.subcategory,
    note: "支付宝-杭州城市通交通卡有限公司"
  })
]);
assert(csvRow["二级分类"] === "交通卡充值", "钱迹 CSV 二级分类应保持交通卡充值");

console.log("Business rule verification passed.");
