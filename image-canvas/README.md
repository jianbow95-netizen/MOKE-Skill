# 三十 · 生图画布

私人无限画布：参考图、文字、提示词、画幅与内置 ChatGPT 生图任务。

## 使用

1. 打开画布并登录，上传图片或拖入画布。
2. 选中图片并点「作为参考」，填写提示词和画幅，提交任务。
3. 点「处理任务」，复制指令到已连接此画布插件的 ChatGPT 对话。
4. ChatGPT 领取任务、查看参考图、调用会话内置 imagegen，保存真实生成结果。画布每 6 秒刷新。

**生成由 ChatGPT 会话中的智能体执行。网站自己不会调用模型，也不会在关闭对话后自行唤醒智能体。**未处理的任务保持「待处理」，不会假装正在生成。此版本没有第三方生成 API、API Key 配置、Cookie 转发、会员额度代理或视频接口。

## 源码

- `page.html`：无依赖的网页画布。
- `worker/server.js`：R2 素材与任务持久化，原子状态更新，MCP 工具。
- `scripts/assemble.mjs`：将网页和服务器组装为单个 Worker 模块。
- `scripts/test.mjs`：认证、并发领取、防重复、真实图片回传、取消任务、图片校验与项目迁移测试。
- `scripts/build.sh`、`scripts/validate-artifact.mjs`：Sites Worker 构建与验证。

```sh
node scripts/assemble.mjs
node scripts/test.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

部署需提供 R2 `BUCKET` 绑定、站点身份验证以及 MCP 接入。Sites 私人站点使用平台身份请求头验证调用者；独立部署时必须设置可信身份网关，不能将此 Worker 直接作为公开匿名网站部署。

## ChatGPT 工具协议

`canvas_list_tasks` → `canvas_claim_task` → 按 refs 顺序 `canvas_read_asset` → 内置 `image_gen` → `canvas_complete_image`。

- 图片返回支持 PNG/JPEG/WebP 的 Base64 或内置工具返回的受限 OpenAI HTTPS 图片地址。
- 任务领取返回 30 分钟凭证，完成时必须提交相同凭证。
- 生图错误使用 `canvas_fail_task`；禁止虚构结果。
- 单张图片最多 15 MB，画布最多 500 个画面，最多 10 张参考图。
- R2 条件写保证并发更新不会互相覆盖；同一任务 ID 可重复提交而不重复创建。
- 项目导出包含真实素材，导入追加画面并重映射素材 ID。

## 数据

素材、画面位置、提示词、任务与结果保存在私人站点 R2 中。GitHub 仅保存程序源码，参考图与生成图片不会上传至 GitHub。此应用本身不收取生成费用；会话内的生图受账户实际使用限制约束。
