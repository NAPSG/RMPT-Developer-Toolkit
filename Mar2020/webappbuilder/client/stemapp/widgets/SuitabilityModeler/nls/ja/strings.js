define({
  "_widgetLabel": "適合性モデラー",
  "general": {
    "clear": "消去",
    "cancel": "キャンセル",
    "save": "実行",
    "saveAs": "エクスポート"
  },
  "saveModel": {
    "save": "エクスポート",
    "title": "タイトル: ",
    "summary": "サマリー: ",
    "description": "説明: ",
    "tags": "タグ: ",
    "folder": "フォルダー: ",
    "homeFolderPattern": "{username} (ホーム)",
    "failed": "エクスポートできません。"
  },
  "util": {
    "colorRamp": {
      "1": "極めて低い",
      "2": "非常に低い",
      "3": "低",
      "4": "やや低い",
      "5": "中",
      "6": "やや高い",
      "7": "高",
      "8": "非常に高い",
      "9": "極めて高い",
      "low": "低",
      "high": "高",
      "tipPattern": "{label} ({value})",
      "flipCaption": "反転"
    }
  },
  "wro": {
    "caption": "適合性モデラー",
    "browsePrompt": "加重オーバーレイ サービス",
    "selectLayersCaption": "レイヤーの選択",
    "selectLayers": "レイヤー",
    "designModelCaption": "モデルの設計",
    "designModel": "モデルの設計",
    "transparency": "透過表示",
    "visible": "表示",
    "total": "合計",
    "unableToLoad": "モデルを読み込めません。",
    "projectNotOpen": "プロジェクトが開いていません。",
    "readMore": "詳細",
    "validation": {
      "validating": "整合チェックしています...",
      "invalidItemCaption": "加重オーバーレイ サービスの警告",
      "notAnImageService": "このアイテムはイメージ サービスではありません。",
      "notAWroService": "このアイテムは加重オーバーレイ サービスではありません。",
      "undefinedUrl": "このアイテムの URL が定義されていません。",
      "inaccessible": "サービスにアクセスできません。",
      "generalError": "アイテムを開けません。",
      "missingFieldPattern": "{field} は必須フィールドです。",
      "notAllowRasterFunction": "[allowRasterFunction] を [true] に設定する必要があります。",
      "notNearestResampling": "[defaultResamplingMethod] を [最近隣内挿法] に設定する必要があります。",
      "notIsWeightedOverlayProp": "主要プロパティの [IsWeightedOverlay] を [true] に設定する必要があります。",
      "invalidLink": "URL が無効です。 選択したレイヤーのサイトを開けませんでした。",
      "unexpectedError": "予期しない状態が発生しました。",
      "rangeMessage": "値は ${0} ～ ${1} の間でなければなりません",
      "rangeMessage100": "値は 0 ～ 100 の間でなければなりません",
      "maxLayers": "サービスで許可されているレイヤーの最大数は ${0} です。新しいレイヤーを追加するには、レイヤーを削除する必要があります。",
      "notFound": "加重オーバーレイ サービスでレイヤー ${0} が見つかりません",
      "wroServiceNotDefined": "モデルに加重オーバーレイ サービスが定義されていません。",
      "overlayLayerOutputInvalid": "オーバーレイ レイヤー [${0}] の再分類範囲 [${1}] の出力値がない、または無効です",
      "overlayLayerInputInvalid": "オーバーレイ レイヤー [${0}] の再分類範囲 [${1}] の入力最小値/最大値がない、または無効です",
      "overlayLayerRangesMissing": "オーバーレイ レイヤー [${0}] に再分類範囲がありません",
      "overlayLayerWeight": "オーバーレイ レイヤーの加重を合計 100 にする必要があります",
      "overlayLayerRequired": "少なくとも 1 つのオーバーレイ レイヤーが必要です",
      "overlayLayerNotDefined": "オーバーレイ レイヤーが定義されていません",
      "requiresColormap": "このラスター関数にはカラーマップが必要ですが、モデルに有効なカラーマップ定義がありません",
      "createModelError": "モデルの作成中にエラーが発生しました",
      "invalidModel": "モデルが有効ではありません",
      "imageServiceNotDefined": "イメージ サービス レイヤーが定義されていません",
      "imageLayerNotDefined": "イメージ サービス レイヤーが定義されていません",
      "histogramNotDefined": "加重オーバーレイ ヒストグラム関数が定義されていません。"
    },
    "colorRampLabel": {
      "Green Yellow Red": "緑 黄 赤",
      "Red Yellow Green": "赤 黄 緑",
      "Yellow to Dark Red": "黄から濃い赤",
      "Dark Red to Yellow": "濃い赤から黄",
      "Light Gray to Dark Gray": "ライト グレーからダーク グレー",
      "Dark Gray to Light Gray": "ダーク グレーからライト グレー",
      "Light Brown to Dark Brown": "ライト ブラウンからダーク ブラウン",
      "Dark Brown to Light Brown": "ダーク ブラウンからライト ブラウン",
      "Full Spectrum - Bright Red to Blue": "フル スペクトル - 明るい赤から青",
      "Full Spectrum - Bright Blue to Red": "フル スペクトル - 明るい青から赤",
      "Partial Spectrum - Yellow to Blue": "部分スペクトル - 黄から青",
      "Partial Spectrum - Blue to Yellow": "部分スペクトル - 青から黄",
      "Yellow-Green to Dark Blue": "黄緑から濃い青",
      "Dark Blue to Yellow-Green": "濃い青から黄緑",
      "Cold to Hot Diverging": "寒色から暖色に分散",
      "Hot to Cold Diverging": "暖色から寒色に分散",
      "Surface - Low to High": "サーフェス - 低から高",
      "Surface - High to Low": "サーフェス - 高から低"
    }
  },
  "tabs": {
    "layers": "レイヤー",
    "model": "モデル",
    "chart": "チャート"
  },
  "chart": {
    "prompt": "機能",
    "working": "更新しています...",
    "polygonTool": "ポリゴンを描画",
    "freehandPolygonTool": "フリーハンド ポリゴンの描画",
    "selectTool": "レイヤーから選択",
    "panTool": "Pan",
    "clearButton": "解除",
    "noModelLayer": "モデルなし",
    "noSubjectLayers": "マップにポリゴン レイヤーがありません。",
    "tipPattern": "${category} - ${label}: ${percent}%",
    "tipPattern2": "${category}: ${percent}%",
    "labelPattern": "${category} - ${label}"
  }
});