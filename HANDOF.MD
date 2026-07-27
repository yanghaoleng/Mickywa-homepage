# HANDOF

## 当前任务

- 目标：排查线上打开先转圈、再失败、最后突然载入的问题，并推送部署。
- 结论：`Schedule.jsx` 把日历请求状态作为整页渲染门槛；当 `/schedule-snapshot.json`、`/api/schedule` 或上游 iCloud 慢于 5 秒时，会显示全屏 loading/watchdog 失败态。
- 处理：已取消全屏 loading/error 对正文的阻塞，静态内容直接渲染，日历数据后台同步。
- 部署分支：统一使用 `origin/master`，匹配生产保护脚本 `yanghaoleng/Mikey-index@master`，避免旧仓库 remote 或旧分支触发部署。

## 后续建议

- 部署后重点检查生产首屏：标题、找我耍卡片和静态链接应立即出现，不再先显示全屏转圈或失败按钮。
- 如仍有短暂空日历，继续检查生产环境 `/schedule-snapshot.json` 的 CDN 命中和响应时间。
