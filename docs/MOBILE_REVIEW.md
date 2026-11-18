> **最新工序**：以 [REVIEW_WORKFLOW.md](./REVIEW_WORKFLOW.md) 为准。先上传候选素材到临时审核区、网页审核，失败删除，通过后进入正式素材库。

# 奶栗手机审核台

手机审核网页源码：`docs/index.html`，独立静态 HTML，无需 Electron 或服务器后端。

## GitHub Pages 发布（一次性）
1. 打开 https://github.com/9527-mmo/naili-desktop/settings/pages
2. Build and deployment → Source 选择 **Deploy from a branch**
3. Branch 选择 `main`，文件夹选择 `/docs`，点击 Save
4. 等 GitHub Pages 构建完成后，在手机浏览器打开 `https://9527-mmo.github.io/naili-desktop/`

注意：上述网址是**预期发布地址**，在仓库 Pages 未启用且部署成功前，不代表已可访问。

## 手机功能
- 适配窄屏，木屋倒计时三项数据预览。
- 六个动作预览按钮，暂停和 0.5× / 1× / 2× 倍速。
- 对每个动作标记「通过」「需修改」「待定」及填写意见。
- 浏览器 localStorage 本机保存审核记录；可复制文字或导出 JSON 供回传。
- 没有账号系统或远程同步；更换手机、清除浏览器数据会丢失本地审核，建议及时导出。
- 所有金额与倒计时均为演示数值，不读取真实工资设置。
- 预览是简化技术造型，**不是** Mac Electron 实机录屏、不是正式 Gen 1 PNG 动画资产。

## 维护
审核网页与桌面 Electron 分离，发布静态网页不会影响桌面宠物功能。正式 PNG 逐帧审核应在图片生成上传后扩展此页。
