---
allowed-tools: mcp__marketing-harness__list_campaigns, mcp__marketing-harness__get_metrics, mcp__marketing-harness__list_knowledge, mcp__marketing-harness__update_knowledge, mcp__marketing-harness__list_companies
description: 現在のキャンペーンデータから新しい広告クリエイティブ案（コピー・画像指示・動画構成）を提案する
---

`creative-proposer` エージェントを起動して新しいクリエイティブ案を提案してください。

引数: $ARGUMENTS

引数にキャンペーン名・訴求軸・フォーマット（動画 / 静止画）の指定があればそれを考慮してください。
引数がない場合は直近 CTR が最も低いキャンペーンをメインターゲットとして提案してください。

最低 3 案・最大 6 案を提案し、各案は実際に制作・入稿できるレベルの具体性で書いてください。
勝ちパターンからの逆算と、新しい訴求軸の開拓をバランスよく含めてください。
