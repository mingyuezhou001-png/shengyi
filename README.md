# 声译

[![CI](https://github.com/mingyuezhou001-png/shengyi/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mingyuezhou001-png/shengyi/actions/workflows/ci.yml)

面向手机浏览器的中英文实时翻译网页。支持中文→英文、英文→中文、连续语音识别、临时识别文本、译文自动朗读、手动输入翻译和本轮记录清空。

## 使用

1. 使用 Safari 打开已发布页面，允许麦克风权限。
2. 选择翻译方向，点击“开始同传”。
3. 如果浏览器不支持语音识别，使用“手动输入”。
4. 在 Safari 的分享菜单中选择“添加到主屏幕”，可获得接近 App 的入口。

## 本地开发

```bash
npm install
npm run dev
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

构建结果为纯静态 `dist/` 目录，可部署到静态网站托管服务，不需要 Node.js 后端或数据库。

## 实现与限制

- React + TypeScript + Vite 纯前端实现。
- 语音识别使用浏览器 Speech Recognition 能力，朗读使用 Speech Synthesis；可用性取决于设备、iOS 与浏览器版本，并需要联网。
- 翻译由浏览器直接调用 [MyMemory](https://mymemory.translated.net/)，无需 API Key。匿名免费额度为每天 5,000 字符，服务可用性和翻译质量由第三方服务决定。
- 待翻译文本会发送至 MyMemory，请勿输入密码或其他敏感信息。不保存录音，不持久化翻译历史；刷新页面会清空记录。
- 错误状态提供人工重试，不自动重复请求翻译服务。

## 开源

本项目采用 [MIT License](LICENSE)，允许使用、修改和再分发。
