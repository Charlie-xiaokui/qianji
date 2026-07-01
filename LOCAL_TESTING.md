# 本地开发与测试流程

本文档用于建立 QianJi Screenshot Importer 的标准验证流程：

```text
本地开发 -> 本地验证 -> 手机验证 -> 正式发布
```

目标是避免每次修改都先提交 GitHub、登录阿里云 ECS、重启 PM2 才能测试。绝大多数改动应先在本地和手机真机完成验证，确认可用后再发布到服务器。

## 一、启动本地开发环境

进入项目目录：

```bash
cd ~/qianji
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

本机浏览器访问：

```text
http://localhost:3000
```

说明：

- 修改代码后自动热更新
- 无需 GitHub
- 无需服务器
- 无需 PM2

## 二、手机真机测试

目标是在不部署服务器的情况下，用手机真实验证：

- OCR
- 分类
- 审核页
- CSV 导出
- Safari 下载
- 夸克浏览器下载
- 钱迹导入兼容性

### 获取本机 IP

Mac：

```bash
ipconfig getifaddr en0
```

例如返回：

```text
192.168.1.23
```

### 手机访问

确保：

- 手机和电脑连接同一个 Wi-Fi
- 本地开发服务已启动
- 开发服务使用 `0.0.0.0` 启动

手机浏览器打开：

```text
http://192.168.1.23:3000
```

即可直接测试本地开发版本。

## 三、本地验证清单

每次修改后必须先完成本地验证，再考虑提交和发布。

### UI / CSS 健康检查

每次修改 UI 后必须先运行：

```bash
rm -rf .next
npm run check:css
npm run typecheck
npm run build
```

CSS 健康检查会确认：

- `app/layout.tsx` 保留 `import "./globals.css";`
- `app/globals.css` 包含 `@tailwind base;`、`@tailwind components;`、`@tailwind utilities;`
- `tailwind.config.ts` 的 `content` 覆盖 `app`、`components`、`lib`、`store`

禁止删除或修改 `app/layout.tsx` 中的：

```ts
import "./globals.css";
```

如果页面突然变成原生 HTML 链接和按钮样式，不要继续改 OCR、分类、CSV、支付宝导入等业务逻辑，先按本文档的「CSS 丢失排查流程」处理。

### OCR

验证：

- 上传微信截图
- 上传支付宝截图
- 能正常识别账单
- OCR 失败时页面不崩溃
- 未识别到记录时有明确提示

重点检查字段：

- 商户
- 金额
- 日期
- 账户来源
- 收入 / 支出类型

### 分类

验证：

- 一级分类
- 二级分类

是否符合钱迹分类体系。

重点检查：

- 餐饮美食
- 日用百货
- 婴儿食品
- 育儿服务
- 红包收入
- 转出
- 医疗
- 交通
- 电器数码

避免大量出现：

```text
其它 / 其它
```

如果出现较多 `其它 / 其它`，优先检查：

- 本地 keyword 规则是否覆盖
- MiniMax 分类 prompt 是否允许对应分类
- MiniMax 返回结果是否被 schema 校验拦截
- IndexedDB 中是否缓存了旧分类

### 审核页

验证：

- 记录列表显示正常
- 可以勾选 / 取消勾选
- 可以全选 / 取消全选
- 可以编辑金额
- 可以编辑分类和二级分类
- 可以删除记录
- 疑似重复只提示，不自动取消勾选
- 账户单选项显示正常

账户选择：

- 汪一波账户
- 戴冠宇账户

导出前确认已选择正确账户。

### CSV 导出

验证：

- 文件名为 `qianji_import.csv`
- UTF-8 BOM 正常
- Excel 打开无乱码
- WPS 打开无乱码
- CSV 表头顺序正确

表头必须为：

```text
时间,分类,二级分类,类型,金额,账户1,账户2,备注
```

字段重点检查：

- `分类` 列应为 `收入` / `支出` / `转账`
- `二级分类` 列应为钱迹分类名，例如 `电器数码`、`日用百货`、`婴儿食品`、`红包收入`
- `类型` 列应为 `收入` / `支出`
- `账户1` 默认为空
- `账户2` 应为审核页选择的账户
- `备注` 保留来源和商户，例如 `微信-MiniMax`、`支付宝-天猫`

### 浏览器下载

验证浏览器：

- Safari
- Chrome
- Edge
- 夸克浏览器

确认：

- 能正常下载 CSV
- 下载管理中可见文件
- 文件名正确
- 文件内容不是网页 HTML
- 文件可以被 Excel / WPS 打开

当前项目下载方式：

- 前端不再使用 `Blob + URL.createObjectURL + a.click`
- 下载按钮通过后端 `/api/export-csv` 返回真实 attachment 文件
- 响应头包含 `Content-Disposition: attachment; filename="qianji_import.csv"`

### 钱迹导入

验证：

- 能成功导入
- 一级分类正确
- 二级分类正确
- 账户字段正确
- 收入 / 支出方向正确
- 金额正确
- 日期正确
- 备注可读

如果钱迹导入后分类异常，优先检查 CSV 预览中的：

- `分类`
- `二级分类`
- `类型`
- `账户2`

## 四、正式发布流程

仅在本地验证、手机真机验证、CSV 验证、钱迹导入验证全部通过后执行。

### 本地提交

```bash
git add .
git commit -m "描述本次修改"
git push
```

确认出现：

```text
main -> main
```

### 服务器更新

登录 ECS：

```bash
ssh xxx
```

进入项目目录：

```bash
cd ~/qianji
```

拉取最新代码：

```bash
git pull
```

如果出现：

```text
Updating xxxx..yyyy
Fast-forward
```

表示更新成功。

### 构建

```bash
npm run build
```

确认看到：

```text
Compiled successfully
Generating static pages
Finalizing page optimization
```

### 重启

```bash
pm2 restart qianji
```

### 检查运行状态

```bash
pm2 list
```

确认：

```text
qianji online
```

### 发布后回归

正式环境至少验证：

- 首页可打开
- 上传页可用
- 审核页可用
- 导出页可下载 CSV
- 手机浏览器可访问
- PM2 状态为 online

## 五、推荐工作流

正确流程：

```text
开发
↓
本地浏览器测试
↓
手机真机测试
↓
CSV 验证
↓
钱迹导入验证
↓
git commit
↓
git push
↓
服务器 git pull
↓
npm run build
↓
pm2 restart qianji
```

禁止流程：

```text
改一点代码
↓
直接 push
↓
直接上服务器测试
```

这样效率太低，也更容易把未验证的问题发布到正式环境。

## 六、故障排查

### CSS 丢失排查流程

现象：

- 页面变成原生 HTML 样式
- Tailwind 的按钮、卡片、输入框样式全部丢失
- 页面功能可能还在，但视觉样式明显不对

优先处理顺序：

1. 停止正在运行的 `next dev`。
2. 清理 Next.js 缓存：

```bash
rm -rf .next
```

3. 运行 CSS 健康检查：

```bash
npm run check:css
```

4. 运行构建验证：

```bash
npm run typecheck
npm run build
```

5. 重新启动本地服务：

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

6. 打开并确认以下页面样式恢复：

```text
http://localhost:3000
http://localhost:3000/review
http://localhost:3000/export
http://localhost:3000/mock
```

如果仍然异常，继续检查：

- `app/layout.tsx` 是否仍然 import `./globals.css`
- `app/globals.css` 是否仍然包含 Tailwind 三条指令
- `tailwind.config.ts` 的 `content` 是否覆盖 `app`、`components`、`lib`、`store`
- `postcss.config.mjs` 是否仍然启用 `tailwindcss` 和 `autoprefixer`
- 最近修改是否把组件 `className` 删除，或把页面改成纯 HTML 标签
- 浏览器是否缓存了旧 chunk 或旧 service worker
- PWA 缓存是否需要清理站点数据后重试

原则：

- 样式丢失时，优先排查 CSS / Tailwind / PWA 缓存
- 不要在样式链路未恢复前继续改业务逻辑
- 不要通过重写业务组件来掩盖全局 CSS 未加载的问题

### git pull 卡住

执行：

```bash
git pull --verbose
```

查看详细日志。

也可以检查网络和远端连接：

```bash
git remote -v
```

### PM2 状态异常

查看：

```bash
pm2 list
pm2 logs qianji
```

常见检查点：

- 进程是否为 `online`
- 是否启动了正确目录
- 环境变量是否存在
- 构建产物是否最新

### 端口占用

查看：

```bash
lsof -i :3000
```

结束：

```bash
kill -9 PID
```

如果是 PM2 管理的线上服务，优先使用：

```bash
pm2 restart qianji
```

不要随意 kill 线上 Node 进程。

### 本地手机无法访问

检查：

- 是否同一 Wi-Fi
- 是否使用 `0.0.0.0` 启动
- 是否被 macOS 防火墙拦截
- 是否访问正确 IP
- 是否访问了正确端口 `3000`
- 是否使用了 `localhost`，手机不能用电脑的 `localhost`

### OCR 或分类失败

检查本地环境变量：

```bash
cat .env.local
```

重点确认：

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`
- `MINIMAX_TEXT_MODEL`
- `MINIMAX_VISION_MODEL`

注意不要把 API Key 提交到 GitHub。

### CSV 下载异常

检查：

- `/api/export-csv` 是否返回 200
- 响应头是否包含 `Content-Disposition`
- CSV 是否以 UTF-8 BOM 开头
- 浏览器下载管理中是否出现 `qianji_import.csv`
- 夸克浏览器是否把文件保存到了默认下载目录

### 钱迹导入异常

检查 CSV 内容：

- `分类` 是否为 `收入` / `支出` / `转账`
- `二级分类` 是否为钱迹可识别的分类名
- `类型` 是否为 `收入` / `支出`
- `账户2` 是否为审核页选择的账户
- 日期是否为 `YYYY/MM/DD`
- 金额是否保留两位小数

## 七、发布原则

- 本地没验证，不发布
- 手机没验证，不发布
- CSV 没导入钱迹验证，不发布
- 不把服务器当测试环境
- 不把 GitHub 当临时保存按钮
- 每次发布前运行 `npm run typecheck`
- 每次发布前运行 `npm run build`
