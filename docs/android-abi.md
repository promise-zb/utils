# 安卓 CPU 平台和手机型号

安装包里的平台名是 CPU 指令集，不是品牌。同一品牌的前后代经常不是同一个平台。下面每个平台最多列 20 个能核对到的手机型号，按这个手机自己的 CPU 归类。清单是例子，不是全部机型。

当前安装包只带 `arm64-v8a`。只含这个平台的包，可以装到下面第一张表里的手机上。

64 位 ARM 手机也能运行 32 位 ARM 程序，所以以前四个平台都打进包时，`armeabi-v7a` 那一份也会被 64 位手机用到。现在的包里没有这份额外文件。

`x86` 和 `x86_64` 的真手机很少。Intel 在 2016 年前后退出了手机芯片，这两个平台现在主要是电脑上的安卓模拟器。

## arm64-v8a

64 位 ARM。2015 年的旗舰开始使用，2017 年以后的新机几乎都是这个平台。当前安装包对应这一档。

| 型号 | CPU |
| --- | --- |
| 三星 Galaxy S6 | Exynos 7420 |
| 三星 Galaxy S6 edge | Exynos 7420 |
| 三星 Galaxy S7 | Exynos 8890 或骁龙 820 |
| 三星 Galaxy S8 | Exynos 8895 或骁龙 835 |
| 三星 Galaxy S10 | Exynos 9820 或骁龙 855 |
| 三星 Galaxy S21 | Exynos 2100 或骁龙 888 |
| 三星 Galaxy S24 | Exynos 2400 或骁龙 8 Gen 3 |
| Google Nexus 5X | 骁龙 808 |
| Google Nexus 6P | 骁龙 810 |
| Google Pixel | 骁龙 821 |
| Google Pixel 8 | Tensor G3 |
| 小米 Note 顶配版 | 骁龙 810 |
| 小米 14 | 骁龙 8 Gen 3 |
| 华为 Mate 8 | 麒麟 950 |
| 华为 P40 | 麒麟 990 |
| 一加 2 | 骁龙 810 |
| 一加 12 | 骁龙 8 Gen 3 |
| OPPO Find X7 | 天玑 9300 |
| vivo X100 | 天玑 9300 |
| 索尼 Xperia Z5 | 骁龙 810 |

## armeabi-v7a

32 位 ARM。这些手机的 CPU 不能执行 arm64 程序，装不上当前这个只含 `arm64-v8a` 的安装包。

| 型号 | CPU |
| --- | --- |
| 三星 Galaxy S3 | Exynos 4412 |
| 三星 Galaxy S4 | Exynos 5410 或骁龙 600 |
| 三星 Galaxy S5 | 骁龙 801 或 Exynos 5422 |
| 三星 Galaxy Note 3 | 骁龙 800 |
| 三星 Galaxy Note 4 | 骁龙 805；Exynos 版只开启了 32 位模式 |
| Google Nexus 4 | 骁龙 S4 Pro |
| Google Nexus 5 | 骁龙 800 |
| Google Nexus 6 | 骁龙 805 |
| LG G2 | 骁龙 800 |
| LG G3 | 骁龙 801 |
| 索尼 Xperia Z1 | 骁龙 800 |
| 索尼 Xperia Z2 | 骁龙 801 |
| HTC One M7 | 骁龙 600 |
| HTC One M8 | 骁龙 801 |
| 一加 One | 骁龙 801 |
| 小米手机 2S | 骁龙 600 |
| 小米手机 3 | 国行 Tegra 4，另一版骁龙 800 |
| 小米手机 4 | 骁龙 801 |
| 红米 Note（2014） | MT6592 |
| 魅族 MX3 | Exynos 5410 |

## x86

32 位 Intel Atom。能核对到的真手机不到 20 款。电脑上的 32 位安卓模拟器也用这个平台。

| 型号 | CPU |
| --- | --- |
| Lava XOLO X900 / Orange San Diego | Atom Z2460。欧洲销售名是 Orange San Diego |
| 联想 K800 | Atom Z2460 |
| 联想 K900 | Atom Z2580 |
| 摩托罗拉 RAZR i（XT890） | Atom Z2460 |
| 摩托罗拉 MT788 | Atom Z2480 |
| 华硕 ZenFone 4 A400CG | Atom Z2520 |
| 华硕 ZenFone 5 A500CG | Atom Z2560 |
| 华硕 ZenFone 5 A501CG | Atom Z2580 |
| 华硕 ZenFone 6 A600CG | Atom Z2580 |
| 中兴 Grand X IN | Atom Z2460 |
| 中兴 Geek V975 | Atom Z2580 |
| 宏碁 Liquid C1 | Atom Z2420 |
| MegaFon Mint | Atom Z2460 |

## x86_64

64 位 Intel Atom。能核对到的真手机不到 20 款。Android Studio 里常见的 x86_64 模拟器镜像用的是这个平台，装不上当前安装包。

| 型号 | CPU |
| --- | --- |
| 华硕 ZenFone 2 ZE550ML | Atom Z3560 |
| 华硕 ZenFone 2 ZE551ML | Atom Z3580 |
| 华硕 ZenFone 2 Deluxe ZE551ML | Atom Z3580 |
| 华硕 ZenFone 2 Deluxe 特别版 | Atom Z3590 |
| 华硕 ZenFone Zoom ZX550 | Atom Z3580 |
| 华硕 ZenFone Zoom ZX551ML | Atom Z3590 |
| 联想 P90 / K80 | Atom Z3560。K80 是国内销售名 |
