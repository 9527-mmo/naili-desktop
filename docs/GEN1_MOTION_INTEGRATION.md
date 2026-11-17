# Gen 1 v1.1 PNG 动画接入测试

## 当前代码
- `src/gen1-motion-loader.js` 从 `characters/naili/gen1-motion/manifest.json` 加载并校验行走/奔跑/转身 PNG。
- `src/renderer.js` 优先渲染对应 Gen 1 序列；其他动作继续使用原 Canvas。采用 `imageSmoothingEnabled=false` 最近邻绘制。
- `src/index.html` 设置面板内增加「行走」「奔跑」「转身」测试按钮。
- `src/animation-controller.js` 已登记 `turn` 状态。

## 素材安装（重要）
**当前 GitHub 仓库只提交了程序接入代码，28 张 PNG 尚未上传到 GitHub。** 需要从本次聊天提供的 `naili_gen1_program_test_pack.zip` 下载素材，将压缩包内容解压至仓库根目录，形成：

```text
characters/naili/gen1-motion/
  manifest.json
  walk/walk_000.png ... walk_007.png
  run/run_000.png ... run_011.png
  turn/turn_000.png ... turn_007.png
```

然后在 Mac 终端进入项目目录执行：
```bash
npm install
npm start
```

打开设置，点击 Gen 1 动画测试按钮；如未安装素材，自动回退 Canvas。按 F12 或 Cmd+Option+I 打开开发者工具，检查 `Gen 1 motion frames ready` 或 `Gen 1 motion fallback`。

## 验收
1. 逐帧透明背景无黑边、无杂色
2. 行走/奔跑/转身播放正常，循环不卡顿
3. 角色不变形、不漂移，脚底锚点一致
4. 鼠标跟随时仍可移动，其他行为保持 Canvas 回退
5. Mac M1 Max 运行时检查 CPU/帧率、Retina 清晰度和多显示器表现

## 限制
- 当前素材为用户通过的**技术帧**，并非完整高精度美术最终稿。
- 目前仅有 28 张，尚未覆盖待机/投喂/如厕等动作。
- 尚未在 Mac 上进行运行验收，不能宣称实机测试通过。
