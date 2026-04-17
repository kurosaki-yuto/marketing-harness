---
allowed-tools: mcp__marketing-harness__list_social_accounts, mcp__marketing-harness__schedule_social_post, mcp__marketing-harness__list_social_posts, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__update_knowledge
description: 指定週の SNS 投稿計画を立案し、承認後に自動予約する
---

`sns-planner` エージェントを起動して SNS 投稿計画を立案してください。

引数: $ARGUMENTS

引数に週や日付（例: 来週、2026-04-20 週）が含まれる場合はその週を対象にしてください。
引数がない場合は来週（今日から 7 日間）の計画を作成してください。

計画を提示した後、ユーザーの確認・修正を受けてから `schedule_social_post` で予約を実行してください。
メディア URL（画像・動画）が未確定の投稿はドラフトとして保存してください。
