# threadsgo-axiang 主题仓库

## 店铺

- 店铺域名：`yefunliy.myshopify.com`
- 线上主题（截至 2026-11-11）：阿翔龙王归来2 v2.3（#189348872502）。发布新主题后 ID 会变，以 `--live` 查询结果为准。

## 常用命令

```bash
# 查看线上主题
shopify theme list --store yefunliy.myshopify.com --role live

# 拉取线上主题覆盖本地（会删除线上不存在的本地文件）
shopify theme pull --store yefunliy.myshopify.com --live --path .
```

## 约定

- 同步线上主题的提交信息：`同步线上主题 <主题名> (#<主题ID>)`
