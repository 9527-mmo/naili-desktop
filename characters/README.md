# 可替换角色包

每个角色一个独立目录，示例：`characters/naili/`。程序和鼠标交互不随角色变化。

## 格式
`manifest.json` 描述角色名称和动作。每个动作具有 `fps` 和 `frames`（相对角色目录的 PNG 文件路径）。

必备动作：`idle`、`walk`、`eat`、`sleep`、`play`、`pet`。帧图片建议 720×780、RGBA 透明背景、角色脚底锚点一致。

## 替换流程
1. 复制 `characters/_template` 为 `characters/<新角色ID>`
2. 把对应角色 PNG 动画帧放进动作目录
3. 修改 `manifest.json` 的角色名称、帧路径、播放 fps
4. 在 `characters/catalog.json` 注册新角色
5. 在页面中调用 `CharacterPacks.load('角色ID')`，加载失败时回退到程序化占位绘制

注意：模板只规定结构，不自动将任意一张照片变成完整动作。奶栗真实外观需要后续根据确认的参考照片制作。
