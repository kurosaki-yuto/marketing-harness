---
allowed-tools: mcp__marketing-harness__list_companies, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__update_knowledge, mcp__marketing-harness__list_campaigns, mcp__marketing-harness__get_metrics
description: クライアントのビジネス状況をヒアリングし、広告→LP→メルマガ→決済の全ファネルを設計する
---

`funnel-architect` エージェントを起動してマーケティングファネルを設計してください。

引数: $ARGUMENTS

引数にクライアント名・ビジネスタイプ（EC / BtoB / サブスク 等）が含まれる場合はそこから設計を始めてください。
引数がない場合は、まずヒアリング（ビジネスモデル・商品・ターゲット・現状課題）から始めてください。

設計したファネルは `update_knowledge` でナレッジ DB に保存してください。
現在の marketing-harness でサポートする範囲（広告・SNS）と Phase2 予定（メルマガ・LP・決済）を明確に区別して提示してください。
