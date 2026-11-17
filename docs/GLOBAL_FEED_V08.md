# 主动投喂 v0.8：macOS 全局右键双击

## 已提交
- `native/RightClickMonitor.swift`：使用 AppKit 的 `NSEvent.addGlobalMonitorForEvents(matching: .rightMouseDown)` 被动观察右键按下，向 stdout 输出位置与时间，不拦截其他应用事件
- `src/main.js`：开启主动投喂时尝试通过 `xcrun swiftc` 编译并启动监听辅助进程；430ms 内、36px 范围内两次右键触发菜单
- `src/feed-picker.html`：独立小窗口在鼠标附近显示食物选择菜单，跨应用可见
- `src/preload.js`：安全 IPC 确认/取消投喂
- 原有非全屏模式下临时扩大移动范围、追食、回原位置进食逻辑继续使用

## Mac 安装前提
1. 安装 Xcode Command Line Tools（命令 `xcode-select --install`）
2. 在 macOS「系统设置 → 隐私与安全性 → 输入监控」中允许实际运行该程序的应用/辅助程序；不同系统版本可能需要重启应用
3. 启动 `npm install && npm start`，在奶栗设置中打开「主动投喂」
4. 双击右键时原应用仍可能弹出自己的右键菜单：监听是被动的，不会吞掉系统右键事件

## 已知限制与待验收
- 尚未在 macOS 实机编译、授予权限或运行测试。部分系统可能限制全局鼠标监听或弹窗抢焦点。
- Swift 的 Cocoa 屏幕坐标与 Electron 坐标转换需在 Retina / 多显示器 / 负坐标布局下实测。
- 没有实现系统级屏幕覆盖层；食物落点是逻辑坐标，暂未渲染独立食物贴图。
- 奔跑、叼食、抢夺、回程和咀嚼仍为行为/Canvas 原型，正式像素逐帧素材未完成。
- 需要补充监听进程故障恢复、权限状态提示、追逐超时、移动取消与异常回家。
- macOS 全局监听不保证在锁屏、系统安全窗口或所有应用中生效。
