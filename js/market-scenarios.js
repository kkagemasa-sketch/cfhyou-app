// market-scenarios.js — 過去の暴落シナリオデータ（下落シミュレーション用）
// ベースは各暦年の年次リターン（%）。配列の要素=年数。配列終了後は通常の想定利回りに戻る。
// データ出典の目安: S&P Global, 日経新聞, 日銀為替レート, MUFJヒストリカル等
// 値は概算（お客様提示用。1桁目までで四捨五入）。

const MARKET_SCENARIOS = {
  // ====== 為替専用（USD/JPY 円高イベント） ======
  carter_1978: {
    label: 'カーター・ドルディフェンス',
    category: 'fx',
    startYear: 1977,
    description: '米ドル信認危機による急激な円高。290円→180円。',
    returns: {
      sp500:  [ -7,  6, 18],
      nikkei: [ -2, -7,  6],
      usdjpy: [-22, -20,  2]
    }
  },
  super_endaka_1995: {
    label: '1995 超円高',
    category: 'fx',
    startYear: 1994,
    description: '史上最高値水準の円高。100円→79円。',
    returns: {
      sp500:  [ 1, 37, 22],
      nikkei: [13, 1, -3],
      usdjpy: [-9, -13, 14]
    }
  },
  russia_ltcm_1998: {
    label: '1998 ロシア危機連動円高',
    category: 'fx',
    startYear: 1998,
    description: 'LTCM破綻に伴う急激な円高。147円→113円。',
    returns: {
      sp500:  [28, 21, -9],
      nikkei: [-9, 37, -27],
      usdjpy: [-12, 10,  13]
    }
  },
  usd_decline_2002: {
    label: '米IT不況後円高',
    category: 'fx',
    startYear: 2002,
    description: '米双子の赤字による緩やかな円高。134円→103円。',
    returns: {
      sp500:  [-22, 29, 11],
      nikkei: [-19, 25,  8],
      usdjpy: [ -10, -11,  -4]
    }
  },
  post_lehman_jpy_2007: {
    label: 'リーマン後円高',
    category: 'fx',
    startYear: 2007,
    description: '世界金融危機による円高。124円→87円。',
    returns: {
      sp500:  [  6, -37, 26],
      nikkei: [-11, -42, 19],
      usdjpy: [-6, -19, -3]
    }
  },
  tohoku_earthquake_2010: {
    label: '東日本大震災後円高',
    category: 'fx',
    startYear: 2010,
    description: '史上最高値76円。95→76円。',
    returns: {
      sp500:  [15,  2, 16],
      nikkei: [ -3, -17, 23],
      usdjpy: [-13, -4, 11]
    }
  },
  brexit_2015: {
    label: 'チャイナ/ブレグジット円高',
    category: 'fx',
    startYear: 2015,
    description: 'チャイナショック＋ブレグジット投票。125円→99円。',
    returns: {
      sp500:  [ 1, 12, 22],
      nikkei: [ 9,  0, 19],
      usdjpy: [  0, -3,  3]
    }
  },

  // ====== 株式中心（株+為替複合） ======
  stagflation_1980: {
    label: '1980-82 インフレ/金利ショック',
    category: 'stock',
    startYear: 1980,
    description: 'ボルカーショック後の景気後退。S&P500 −27%。',
    returns: {
      sp500:  [ 32, -5, 21],
      nikkei: [  8,  8,  5],
      usdjpy: [  5, 14,  6]
    }
  },
  black_monday_1987: {
    label: 'ブラックマンデー',
    category: 'stock',
    startYear: 1987,
    description: '1日で株式が世界同時暴落。S&P500 −33%（短期）。',
    returns: {
      sp500:  [ -22, 16,  31],
      nikkei: [  -18, 39, 29],
      usdjpy: [-15, -4,  4]
    }
  },
  japan_bubble_1989: {
    label: '日本バブル崩壊',
    category: 'stock',
    startYear: 1990,
    description: '日経3.8万円→8千円の長期下落。日経 −48%。',
    returns: {
      sp500:  [ -3,  30,  8],
      nikkei: [-39, -4, -27],
      usdjpy: [ -9,  9,  2]
    }
  },
  gulf_war_1990: {
    label: '湾岸戦争ショック',
    category: 'stock',
    startYear: 1990,
    description: 'サダム侵攻による株急落。S&P500 −20%。',
    returns: {
      sp500:  [ -3, 30,  8],
      nikkei: [-39, -4, -27],
      usdjpy: [ -9,  9,  2]
    }
  },
  asian_crisis_1997: {
    label: 'アジア通貨危機',
    category: 'stock',
    startYear: 1997,
    description: 'タイ・韓国発の通貨危機。日経 −28%。',
    returns: {
      sp500:  [ 33, 28, 21],
      nikkei: [-21, -9, 37],
      usdjpy: [ 12, -12, 10]
    }
  },
  dotcom_2000: {
    label: 'ITバブル崩壊',
    category: 'stock',
    startYear: 2000,
    description: 'ナスダック −78%、S&P500 3年連続下落 −49%。',
    returns: {
      sp500:  [-9, -12, -22],
      nikkei: [-27, -24, -19],
      usdjpy: [11, -12, -10]
    }
  },
  lehman_2008: {
    label: 'リーマンショック',
    category: 'stock',
    startYear: 2008,
    description: '世界同時金融危機。S&P500 −37%。',
    returns: {
      sp500:  [-37, 26, 15,  2, 16],
      nikkei: [-42, 19, -3, -17, 23],
      usdjpy: [-19, -3, -13, -4, 11]
    }
  },
  euro_debt_2011: {
    label: '欧州債務危機',
    category: 'stock',
    startYear: 2011,
    description: 'ギリシャ危機。日経 −22%。',
    returns: {
      sp500:  [  2, 16, 32],
      nikkei: [-17, 23, 57],
      usdjpy: [ -4, 11, 21]
    }
  },
  china_2015: {
    label: 'チャイナショック',
    category: 'stock',
    startYear: 2015,
    description: '上海株急落。日経 −28%。',
    returns: {
      sp500:  [ 1, 12, 22],
      nikkei: [ 9,  0, 19],
      usdjpy: [  0, -3,  3]
    }
  },
  covid_2020: {
    label: 'コロナショック',
    category: 'stock',
    startYear: 2020,
    description: 'パンデミック発生。S&P500 一時 −34%（短期）。',
    returns: {
      // 簡略化: 1年目は crash を強調（Q1-34% → 年末+18%回復）
      sp500:  [-30, 29, -18],
      nikkei: [-20, 5, -9],
      usdjpy: [ -5, 11, 13]
    }
  },
  inflation_2022: {
    label: '2022インフレショック',
    category: 'stock',
    startYear: 2022,
    description: 'インフレ・利上げによる株安＋円安。',
    returns: {
      sp500:  [-18, 26, 25],
      nikkei: [ -9, 29, 19],
      usdjpy: [ 13,  6, 11]
    }
  },
  summer_crash_2024: {
    label: '2024年夏急落',
    category: 'stock',
    startYear: 2024,
    description: '日銀利上げ＋米雇用統計で8月急落。日経 −27%（短期）。',
    returns: {
      sp500:  [ -5, 15],
      nikkei: [-15, 10],
      usdjpy: [ -8,  3]
    }
  }
};

// 指数の選択肢（証券ごとに割り当て）
const INDEX_OPTIONS = [
  { key: 'sp500',  label: 'S&P500（米国株）' },
  { key: 'nikkei', label: '日経平均（日本株）' },
  { key: 'usdjpy', label: 'USD/JPY（外貨建て保険）' },
  { key: 'none',   label: '指数に紐付けない（通常計算）' }
];

// プリセットのカテゴリ表示用
const SCENARIO_CATEGORIES = {
  fx:    { label: '💱 為替専用（ドル建て保険向け）', order: 1 },
  stock: { label: '📈 株式（複合シナリオ、為替も連動）', order: 2 }
};
