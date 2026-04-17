---
allowed-tools: mcp__marketing-harness__list_campaigns, mcp__marketing-harness__get_metrics, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__update_knowledge, mcp__marketing-harness__list_companies, mcp__marketing-harness__set_kpi_target
description: KPI 未達・パフォーマンス悪化キャンペーンの改善提案のみを抽出して提示する
---

`ads-optimizer` エージェントを起動し、**KPI 未達または前月比悪化しているキャンペーンの改善提案に絞って**実行してください。

引数: $ARGUMENTS

分析後に全体サマリーは省略し、以下の形式で改善提案のみ出力してください:

```
## 要対応キャンペーン

### [キャンペーン名]
- **問題**: [具体的な数値と目標値のギャップ]
- **原因**: [根本原因の仮説]
- **改善アクション**: [具体的に何をいつまでにやるか]
- **期待効果**: [改善後の予測数値]
```

ユーザーが承認したアクションを実行してください。
