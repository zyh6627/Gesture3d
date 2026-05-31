# 🖐️ Gesture 3D Interaction

通过摄像头实时捕捉手部动作，识别 7 种手势，直接操控 Three.js 3D 场景。纯前端实现，无需安装，开箱即用。

## ✨ 功能

- 📷 **摄像头手势识别** — 基于 MediaPipe Hands，实时检测手部 21 个关键点
- 🎮 **3D 场景交互** — 手势操控 Three.js 场景：旋转、缩放、抓取、拖拽物体
- 🖐️ **7 种手势** — 握拳、张开、捏合、双指、指向、赞、踩
- 🎨 **可视化叠加** — 摄像头画面实时显示手部骨骼关键点
- ⌨️ **键盘辅助** — `R` 重置场景，`F` 全屏

## 🎮 手势对照

| 手势 | 操作 |
|:---:|------|
| ✌️ 双指 | 移动手部 → 旋转 3D 场景 |
| ✊ 握拳 | 抓取 3D 物体 |
| 🤏 捏合 | 拖拽物体 / 双手缩放 |
| 🖐️ 张开 | 释放物体 |
| 👆 指向 | 悬停高亮物体 |
| 👍 赞 | 放大场景 |
| 👎 踩 | 缩小场景 |

## 🛠 技术栈

- [MediaPipe Hands](https://mediapipe.dev/) — 手部 21 点关键点检测
- [Three.js](https://threejs.org/) — 3D 渲染引擎
- 原生 JavaScript (ES Modules)，零依赖构建

## 🚀 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/zyh6627/Gesture3d.git
cd Gesture3d

# 2. 启动本地服务器（任选一种）
python -m http.server 3000

# 3. 浏览器打开
# http://localhost:3000
```

> ⚠️ 必须通过 HTTP 服务器访问，直接双击 index.html 会因 CORS 限制无法加载。

## 📁 项目结构

```
Gesture3d/
├── index.html              # 主入口
├── css/
│   └── style.css           # 暗色主题 UI
└── js/
    ├── camera.js           # 摄像头采集
    ├── handDetector.js     # MediaPipe 手部检测
    ├── gestureRecognizer.js # 手势分类器
    ├── scene3d.js          # Three.js 3D 场景
    └── main.js             # 主调度 & 手势映射
```

## 🌐 浏览器要求

Chrome / Edge / Firefox 最新版本，需摄像头权限。
