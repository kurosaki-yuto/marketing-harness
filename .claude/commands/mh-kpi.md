---
allowed-tools: mcp__marketing-harness__list_campaigns, mcp__marketing-harness__get_metrics, mcp__marketing-harness__set_kpi_target, mcp__marketing-harness__list_companies
description: 対話的な KPI 設定ウィザード。ビジネスタイプを確認しながら適切な目標値・閾値を設定する
---

KPI 設定ウィザードを開始してください。以下のステップに従って進めてください。

引数: $ARGUMENTS

## ステップ 1: 対象キャンペーンの確認

`list_campaigns` でキャンペーン一覧を取得し、どのキャンペーンの KPI を設定するかユーザーに確認してください。
引数にキャンペーン名が含まれる場合はそれを使用してください。

## ステップ 2: ビジネスタイプのヒアリング

以下のいずれかを確認:
- EC（商品単価を確認）
- BtoB リード獲得（受注単価・粗利を確認）
- サブスク（月額・解約率を確認）
- その他

## ステップ 3: 目標値の提案

`kpi-design` スキルの業種別 KPI 目安を参照して目標値を提案:

```
推奨目標値（業種・規模から算出）:
- 目標 CPA: ¥X,XXX
- 目標 ROAS: XXX%
- 目標 CTR: X.X%
- 目標 CPC: ¥XXX

警告閾値（目標値の 1.3 倍）:
- 警告 CPA: ¥X,XXX
```

ユーザーが数値を調整できるように提示すること。

## ステップ 4: KPI 設定の実行

ユーザーが承認した数値で `set_kpi_target` を呼び出してください。

設定完了後: 「閾値を超えたとき ALERT_WEBHOOK_URL に通知が届きます」と案内してください。
