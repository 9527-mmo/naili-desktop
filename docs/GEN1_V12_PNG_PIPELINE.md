# Gen 1 v1.2 顶部像素动画生成与接入

本阶段新增原创 128×128 透明 PNG 动画的可复现生成器，**不是从带背景和文字的审核图中裁切**。

## 生成素材
```bash
python3 -m pip install Pillow
python3 scripts/generate_gen1_roof.py
npm install
npm start
```

生成路径：`characters/naili/gen1-roof/`，包含 `manifest.json` 和四个子目录：

| 动作 | 帧数 | 播放时间 |
| --- | ---: | ---: |
| roofSit | 6 | 1800ms |
| roofLie | 8 | 2600ms |
| roofStretch | 8 | 1250ms |
| roofWake | 6 | 950ms |

加载器：`src/gen1-roof-loader.js`。动画尺寸、名称、路径和文件数量经过检查，图片加载失败时自动使用 Canvas 过渡姿态。

**美术限制**：这批程序生成的 PNG 是原创的低分辨率技术占位素材，体现棕金色、白额带、奶白围脖、同色尾巴等角色识别点，但还没有达到前一张概念审核图的完整美术细节。正式美术需要在相同的 128×128 画布和脚底基准上替换每帧。

**交付边界**：GitHub 当前提交的是生成器和加载器，不是已生成的 PNG 二进制文件。要让加载器使用新帧，需运行生成器并将输出素材添加到仓库或本地工作树。

**测试**：需要 Mac 实机验证 PNG 透明度、实际脚底位置、跨窗口顶部站位、手动互动唤醒、动画过渡和资源占用。
