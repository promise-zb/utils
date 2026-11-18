# 安卓安装包体积

安装包是 `version/local-utils-1.0.0.apk`。优化前 74MB，优化后 10.4MB。包名仍是 `dev.zhangbo.localutils`，版本号是 2。手机上如果已经装过 74MB 那一版，先卸载再装这一版。重新生成原生工程时调试签名会换掉，签名不一致时系统不允许覆盖安装。

这个包只包含 64 位 ARM（`arm64-v8a`）。各平台对应哪些手机，见 [android-abi.md](android-abi.md)。

## 体积从哪来

优化前把安装包拆开，原生库是原样放进去的，没有再压缩：

| 内容                                 | 占用   |
| ------------------------------------ | ------ |
| x86 原生库（模拟器）                 | 19.0MB |
| x86_64 原生库（模拟器）              | 18.3MB |
| arm64-v8a 原生库（手机）             | 17.8MB |
| armeabi-v7a 原生库（旧的 32 位手机） | 12.4MB |
| Java 字节码                          | 2.6MB  |
| JS 包                                | 1.6MB  |
| 资源表和其他                         | 约 2MB |

手机实际只用 arm64 那一份。另外三份 CPU 架构占了大约 50MB。

## 改了哪

要提交的配置在 `app/app.json`。依赖加在 `app/package.json` 的 `expo-build-properties`。`app/android/` 在 `.gitignore` 里，生成出来的 Gradle 文件不会出现在 git 记录中。

`app/app.json` 里新增的是这一段：

```json
[
  "expo-build-properties",
  {
    "android": {
      "buildArchs": ["arm64-v8a"],
      "enableMinifyInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true,
      "enableBundleCompression": true,
      "useLegacyPackaging": true,
      "gifEnabled": false,
      "networkInspector": false
    }
  }
]
```

执行 `expo prebuild` 之后，这些值写进 `app/android/gradle.properties`：

```properties
reactNativeArchitectures=arm64-v8a
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
android.enableBundleCompression=true
expo.useLegacyPackaging=true
expo.gif.enabled=false
EX_DEV_CLIENT_NETWORK_INSPECTOR=false
```

同一份 `app.json` 里，`android.versionCode` 从 1 改成了 2。

## 做了什么

1. **只打 arm64-v8a。** `buildArchs` 设为 `["arm64-v8a"]`。x86、x86_64、armeabi-v7a 不再打进包里。
2. **压缩原生库。** `useLegacyPackaging` 设为 `true`。以前 `.so` 按原始大小放进安装包，arm64 一份就要 17.8MB。现在打进包里会压缩，arm64 原生库从 17.5MB 压到 5.9MB。安装时系统会解出来，第一次安装稍慢一点，装好后的运行方式和以前一样。
3. **压缩 JS 包。** `enableBundleCompression` 设为 `true`。`index.android.bundle` 从 1.6MB 压到 0.7MB。启动时多一次解压，这个应用感觉不出来。
4. **去掉用不到的资源和 GIF 解码。** 发布包本来就开了 R8（`enableMinifyInReleaseBuilds`）。这次再加上 `enableShrinkResourcesInReleaseBuilds`，资源表从 1.2MB 降到 0.7MB。`gifEnabled` 设为 `false`，删掉约 0.3MB 的 GIF 解码库。图纸和签名都不用 GIF。WebP 留着，手机相册里的照片经常是 WebP，关掉后图片会显示不出来。WebP 解码库压缩后大约 0.2MB。
5. **关掉网络检查。** `networkInspector` 设为 `false`。这是开发时看请求用的，安装包里不需要。

优化后安装包里主要是这些：

| 内容         | 压缩后 |
| ------------ | ------ |
| arm64 原生库 | 5.9MB  |
| Java 字节码  | 2.4MB  |
| JS 包        | 0.7MB  |
| 资源         | 1.2MB  |

## 重新打包

在项目根目录：

```bash
pnpm --filter @local/app exec expo prebuild --platform android --no-install
cd app/android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../../version/local-utils-1.0.0.apk
```

命令行里的 Java 11 编不过这个工程，要用 Android Studio 自带的 JDK 21。
