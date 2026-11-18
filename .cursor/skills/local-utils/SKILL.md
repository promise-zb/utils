---
name: local-utils
description: >-
  Conventions for the local-utils pnpm monorepo: tool directories, web and app
  routing, packages, oxlint, oxfmt, TypeScript style, floor-area, and PDF sign.
  Use when adding or changing a tool, editing web/, app/, packages/, tools/,
  docs/, backend/, or utils/wasm/, or when the user mentions 工具, monorepo,
  图纸面积, 签名, pnpm, or project conventions.
---

# local-utils

动手前先看 [docs/index.md](../../../docs/index.md)。改面积计算时再看 [docs/floor-area.md](../../../docs/floor-area.md)。改签名时再看 [docs/sign.md](../../../docs/sign.md)。

## 每次都要遵守

- 用 pnpm workspace。工具链只用 Vite、pnpm、oxlint、oxfmt、TypeScript。不要引入 ESLint、Prettier、Jest。
- 一个工具一个目录：`tools/<id>/src` 放两端共用逻辑，`tools/<id>/web` 和 `tools/<id>/app` 放页面。
- 用户没明确说只做一端时，web 和 app 都要能跑，并接到路由。
- 工具登记在 `packages/shared` 的 `tools`。网页路由在 `web/src/App.tsx`，手机路由在 `app/App.tsx`。
- 网页通用组件只放 `packages/web/`，手机通用组件只放 `packages/app/`。不要为单个工具再包一层。
- 后端以后用 Go，只放 `backend/`。现在不要提前写后端。
- wasm 只放 `utils/wasm/`，没有需要就不要加封装。
- 文档只放 `docs/`。
- 代码保持直接。不要过度封装，不要为了一处调用抽 hook、context、工厂。
- 不要使用 TypeScript `enum`。状态、文案用单个字段的常量映射，例如 `areaStatus`、`areaMessage`、`roomName`。
- 组件默认导出函数。props 用一个 interface，默认值写在解构里。调用处保持短，由父组件决定是否渲染。参照 `packages/web/src/Modal.tsx`。

```tsx
{
  notice && result ? (
    <Modal
      title="计算结果"
      contentText={result.message}
      cancelFn={() => setNotice(false)}
      successFn={() => setNotice(false)}
      confirmText="知道了"
    />
  ) : null
}
```

## 改完

跑 `pnpm test`、`pnpm lint`、`pnpm fmt`。网页有界面变化时用浏览器点一遍路由和该工具。
