# Ephone Android App 构建指南

## 使用 Android Studio 构建 APK

### 步骤 1: 打开项目
1. 打开 Android Studio
2. 选择 **File → Open**
3. 导航到 `D:\AIs\k\Ephone\-k--main\android-app` 文件夹
4. 点击 **OK** 打开项目

### 步骤 2: 等待 Gradle 同步
- Android Studio 会自动开始 Gradle 同步
- 等待右下角的进度条完成
- 如果提示更新 Gradle 或 SDK，按提示操作即可

### 步骤 3: 构建 APK

#### 方法 A: 构建 Debug APK（推荐，更快）
1. 菜单选择 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 等待构建完成
3. 点击右下角弹出的 **locate** 链接
4. APK 位于: `app/build/outputs/apk/debug/app-debug.apk`

#### 方法 B: 构建 Release APK（需要签名）
1. 菜单选择 **Build → Generate Signed Bundle / APK**
2. 选择 **APK**
3. 创建或选择密钥库（首次需要创建）
4. 选择 **release** 构建类型
5. 点击 **Finish**

### 步骤 4: 安装到手机
1. 将生成的 APK 文件传输到手机
2. 在手机上打开 APK 文件进行安装
3. 如果提示"未知来源"，请在设置中允许安装

## 常见问题

### Q: Gradle 同步失败
A: 检查网络连接，可能需要配置代理或使用国内镜像

### Q: SDK 版本不匹配
A: 打开 SDK Manager，安装 SDK 34 (Android 14)

### Q: 构建失败提示 Java 版本
A: 确保使用 JDK 17 或更高版本

## 项目结构
```
android-app/
├── app/
│   ├── src/main/
│   │   ├── assets/          ← Web 文件 (html, js, css)
│   │   ├── java/            ← Android 代码
│   │   ├── res/             ← 资源文件
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## 自定义图标
如需更换应用图标，替换以下文件：
- `app/src/main/res/drawable/ic_launcher_foreground.xml`
- `app/src/main/res/drawable/ic_launcher_background.xml`

或使用 Android Studio 的 **Asset Studio**:
1. 右键 `res` 文件夹
2. 选择 **New → Image Asset**
3. 选择你的图标图片
