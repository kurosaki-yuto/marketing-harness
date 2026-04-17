---
allowed-tools: mcp__marketing-harness__list_campaigns, mcp__marketing-harness__get_metrics, mcp__marketing-harness__list_companies, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__set_kpi_target, mcp__marketing-harness__update_knowledge
description: 広告パフォーマンスを分析し、問題キャンペーンの特定と改善提案を行う
---

`ads-optimizer` エージェントを起動して広告パフォーマンス分析を実行してください。

引数: $ARGUMENTS

引数にキャンペーン名や企業名が含まれる場合はその対象に絞って分析してください。
引数がない場合は全キャンペーンを対象とした直近 30 日の分析を行ってください。

分析後、改善アクションを提案し、ユーザーの承認を得てから KPI 設定の更新やナレッジ保存を実行してください。
