---
allowed-tools: mcp__marketing-harness__get_report_data, mcp__marketing-harness__save_report, mcp__marketing-harness__get_metrics, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__update_knowledge, mcp__marketing-harness__list_companies, mcp__marketing-harness__list_campaigns
description: 指定月の月次広告レポートを生成する（エグゼクティブサマリー・KPI 表・改善提案を含む）
---

`report-writer` エージェントを起動して月次レポートを作成してください。

引数: $ARGUMENTS

引数に月（例: 2026-04）が含まれる場合はその月のレポートを作成してください。
引数がない場合は先月のレポートを作成してください。

レポートは Markdown 形式で出力し、改善提案はナレッジ DB に保存してください。
