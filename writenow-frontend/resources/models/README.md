# Bundled models (optional)

该目录用于 **打包时** 携带本地 LLM 模型（GGUF）。默认不提交/不存放大文件到 git；安装包构建时可通过脚本下载并放入此目录，然后由 electron-builder 作为 `extraResources` 打入安装包的 `process.resourcesPath/models`。

## How to bundle (packaging-time)

在 `writenow-frontend/` 目录执行：

```bash
WN_BUNDLE_LOCAL_LLM_MODEL=1 npm run package
```

可选指定模型 ID：

```bash
WN_BUNDLE_LOCAL_LLM_MODEL=1 WN_BUNDLE_LOCAL_LLM_MODEL_ID=qwen2.5-0.5b-instruct-q4_k_m npm run package
```

> Why: 这可以让离线用户在启用本地续写时无需下载模型；模型会在需要时从 `process.resourcesPath/models` 按需复制到 `app.getPath("userData")/models`。

