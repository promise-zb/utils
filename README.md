# local-utils

本机用的小工具。一个工具一个目录，网页和手机从首页进同一个工具。

## 工具

| 工具         | 路径                | 做什么                                                           | 代码               |
| ------------ | ------------------- | ---------------------------------------------------------------- | ------------------ |
| 图纸面积计算 | `/tools/floor-area` | 识别图纸上的长度并计算面积。没有长度时提示「没有长度，无需计算」 | `tools/floor-area` |
| 签名助手     | `/tools/sign`       | 给 PDF 手写签名。只在本机处理，不上传。Word 需先另存为 PDF       | `tools/sign`       |

更细的说明在 [docs/floor-area.md](docs/floor-area.md) 和 [docs/sign.md](docs/sign.md)。

## 运行

```bash
pnpm install
pnpm dev:web
```

浏览器打开 http://localhost:5173 。首页是工具列表。

手机端：

```bash
pnpm dev:app
```

用 Expo Go 扫码。图纸识别第一次会下载中文语言包，签名预览第一次会下载 PDF 库，这两步需要联网。

打包后的网页在 `version/`。在项目根目录执行 `pnpm dlx serve version` 后用打印出来的地址访问。

安卓安装包在 `version/local-utils-1.0.0.apk`（10.4MB，只含 64 位 ARM）。传到手机后直接安装。系统若拦截，到设置里允许安装未知来源的应用。包名是 `dev.zhangbo.localutils`。手机上如果已经装过以前的 74MB 版本，先卸载再装。装好后第一次做图纸识别会下载中文语言包，第一次打开签名会下载 PDF 库，这两步需要联网。体积是怎么减下来的，见 [docs/apk.md](docs/apk.md)。
