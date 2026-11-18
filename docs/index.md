# local-utils

pnpm monorepo。一个工具一个目录，网页和手机用路由进到同一个工具。

## 目录

```
web/                 Vite + React
app/                 Expo（React Native）
tools/<id>/          工具。src 放两端共用的逻辑，web/ 和 app/ 放各自页面
packages/shared/     工具登记
packages/web/        网页通用组件
packages/app/        手机通用组件
utils/wasm/          需要 wasm 时再放
backend/            以后的 Go 后端
docs/                文档
```

## 命令

```bash
pnpm install
pnpm dev:web
pnpm dev:app
pnpm test
pnpm lint
pnpm fmt
```

手机端用 Expo Go 扫码。识别图纸、签名预览第一次需要联网，分别下载中文语言包和 PDF 库。

安卓安装包的体积说明在 [apk.md](apk.md)。四个 CPU 平台和对应手机型号在 [android-abi.md](android-abi.md)。

## 新增工具

1. 在 `packages/shared/src/index.ts` 的 `tools` 里加一项。
2. 建 `tools/<id>/`，纯逻辑放 `src/`，页面放 `web/index.tsx` 和 `app/index.tsx`。
3. `web/src/App.tsx` 和 `app/App.tsx` 的 `pages` 里接上路由。
4. 用户没说只做一端时，web 和 app 都要能用。
