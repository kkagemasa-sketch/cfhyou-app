// constants.js — 定数テーブル・設定値

const TAX=[
  [200,168],[250,210],[300,245],[350,284],[400,322],[450,360],
  [500,399],[550,433],[600,471],[650,508],[700,541],[750,575],
  [800,607],[850,642],[900,674],[950,707],[1000,739],[1050,772],
  [1100,801],[1150,828],[1200,857],[1300,919],[1400,973],[1500,1025],[2000,1301]
];

// 住民税控除上限（万円）— 2024年以降入居は9.75万円
const JUMIN_CTRL_MAX = 9.75;

const LCTRL_TABLE = {
  // 2024〜2025年入居（令和6年度改正）
  '2024_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[3000,13], new_general:[0,0],    used_eco:[2000,10], used_other:[2000,10] },
  '2024_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[4000,13], new_general:[0,0],    used_eco:[2000,10], used_other:[2000,10] },
  '2025_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[3000,13], new_general:[0,0],    used_eco:[2000,10], used_other:[2000,10] },
  '2025_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[4000,13], new_general:[0,0],    used_eco:[2000,10], used_other:[2000,10] },
  // 2026〜2030年入居（令和8年度税制改正 閣議決定済み・法案審議中（2026年3月末成立見込み））
  '2026_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[2000,13], new_general:[0,0],    used_eco:[3500,13], used_other:[2000,10] },
  '2026_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[3000,13], new_general:[0,0],    used_eco:[4500,13], used_other:[2000,10] },
  '2027_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[2000,13], new_general:[0,0],    used_eco:[3500,13], used_other:[2000,10] },
  '2027_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[3000,13], new_general:[0,0],    used_eco:[4500,13], used_other:[2000,10] },
  '2028_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[2000,10], new_general:[0,0],    used_eco:[3500,13], used_other:[2000,10] },
  '2028_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[2000,10], new_general:[0,0],    used_eco:[4500,13], used_other:[2000,10] },
  '2029_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[0,0],     new_general:[0,0],    used_eco:[3500,13], used_other:[2000,10] },
  '2029_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[0,0],     new_general:[0,0],    used_eco:[4500,13], used_other:[2000,10] },
  '2030_general': { new_long:[4500,13], new_zeh:[3500,13], new_eco:[0,0],     new_general:[0,0],    used_eco:[3500,13], used_other:[2000,10] },
  '2030_kosodate':{ new_long:[5000,13], new_zeh:[4500,13], new_eco:[0,0],     new_general:[0,0],    used_eco:[4500,13], used_other:[2000,10] },
};

const TEATE_TABLE = {
  age_0_2:   { rank1: 15000, rank2: 15000, rank3plus: 30000 }, // 0〜2歳
  age_3_18:  { rank1: 10000, rank2: 10000, rank3plus: 30000 }, // 3〜18歳
  // rank = 年上側から数えた第何子か（rank3plus = 第3子以降）
};

const REP_TABLE = [
  [5,120],[10,240],[15,320],[20,400],[25,500],
  [30,600],[35,700],[40,800],[45,900],[60,900],[999,1000]
];

const PROP_TAX_RELIEF = {
  mansion_general: 5,   // マンション（一般）: 5年間
  kodate_general:  3,   // 戸建て（一般）: 3年間
  kodate_choki:    5,   // 戸建て（長期優良）: 5年間
};

const EDU_TABLE = {
  // elem: インデックス0,1=未使用, 2〜7=小1〜小6
  // 公立平均33.6万/年 → 学年差を考慮（1年は入学準備等で高め、6年は修学旅行等で高め）
  // 私立1年は入学金・制服等で220.3万と突出して高い
  elem:{
    public: [0,0, 39,31,31,33,32,36],   // 小1〜6（公立）合計202万 ※1年は入学準備費込み
    private:[0,0,220,168,168,172,169,201]  // 小1〜6（私立）合計1098万 ※1年は入学費用込み
  },
  // mid: インデックス0〜2=中1〜中3
  // 公立平均54.2万、私立平均155.7万
  mid:{
    public: [57,53,53],    // 中1〜3（公立）※1年は制服等入学費用込み
    private:[165,151,151]  // 中1〜3（私立）※1年は入学金・制服等込み
  },
  // high: インデックス0〜2=高1〜高3
  // 公立平均59.6万、私立平均102.6万
  high:{
    public: [70,57,52],    // 高1〜3（公立）※1年は最高70万、就学支援金控除前
    private:[110,100,98]   // 高1〜3（私立）
  },
  univ:{
    nat_h:[175,112,112,112], nat_b:[290,164,164,164],
    plit_h:[226,166,166,166], plit_b:[355,225,225,225],
    psci_h:[261,199,199,199], psci_b:[389,257,257,257],
    med_h:[583,445,445,445,445,445], med_b:[711,503,503,503,503,503],
    senmon_h:[150,130], senmon_b:[260,200],
    none:[]
  }
};
// EDUはコード全体からEDU_TABLEとして参照（既存コードとの互換エイリアス）
const EDU = EDU_TABLE;

// 修繕積立金 標準段階単価
function repFund(sqm,yr){let u=120;for(let i=0;i<REP_TABLE.length-1;i++){if(yr<=REP_TABLE[i][0]){u=REP_TABLE[i][1];break}if(yr<REP_TABLE[i+1][0]){u=REP_TABLE[i+1][1];break}}return Math.round(sqm*u*12/10000)}

// ===== Excel出力共通定数 =====
const C={
  navy:'FF1e3a5f', navyD:'FF0f2744', navyL:'FF2d5282', blue:'FF2d7dd2',
  redL:'FFfc5b4a', red:'FFd63a2a', green:'FF14b027', white:'FFFFFFFF', black:'FF1a202c',
  incBg:'FFfbfdff', incFg:'FF1a3a5f', incCat:'FF4a90d9',
  expBg:'FFfffaf9', expFg:'FF8b1a10', expCat:'FFfc5b4a',
  ageBg:'FFe8f4fc', ageBgL:'FFcce8f8', ageFg:'FF3a6a8a', ageFgD:'FF1a4a6a',
  evBg:'FFfffcf7', evFg:'FF8a5a30', evHdr:'FFffe8cc', evHdrFg:'FF7a3a00',
  finBg:'FFf0f8ff', finFg:'FF1a4a7a', finHdrBg:'FF1a4a7a',
  loanBg:'FFf8fafb', muted:'FF5a6a7e', zero:'FFbec8d4',
  border:'FFd0d8e4', borderH:'FF6b8cae',
};
const bdr={style:'thin',color:{rgb:C.border}};
const bdrH={style:'thin',color:{rgb:C.borderH}};
const baseBorder={top:bdr,right:bdr,bottom:bdr,left:bdr};

const eduColors={
  hoiku:{bg:'FFffedf6',fg:'FF880044'},
  elem: {bg:'FFeaf6ea',fg:'FF1a5c20'},
  mid:  {bg:'FFfffcda',fg:'FF5a4000'},
  high: {bg:'FFf3eeff',fg:'FF3a008a'},
  univ: {bg:'FFffd8a0',fg:'FF6b2000'},
};

const _W_ROWS  = ['wInc','pW','wRPay','wAge'];
const _ROW_CLS = { incT:'rinct', expT:'rexpt', bal:'rbal', sav:'rsav', lBal:'rloan', totalAsset:'rttl', finAsset:'rfin' };

const _STATIC_FIELDS=['client-name','husband-age','wife-age','h-death-age','w-death-age',
  'house-price','down-payment','house-cost','cost-type','loan-yrs','loan-type',
  'loan-h-amt','loan-h-yrs','loan-h-type','rate-h-base','loan-w-amt','loan-w-yrs','loan-w-type','rate-w-base',
  'delivery-year','rent-before',
  'zaikei-h-bal','zaikei-h-monthly','zaikei-h-end','zaikei-w-bal','zaikei-w-monthly','zaikei-w-end',
  'rate-base','sqm','mgmt-fee','mgmt-net','rep-unit','rep-manual-base','choki',
  'retire-age','retire-pay','retire-pay-age','pension-h','pension-h-start','pension-h-receive',
  'h-gross-monthly','h-gross-bonus',
  'w-retire-age','w-retire-pay','w-retire-pay-age','pension-w','pension-w-start','pension-w-receive',
  'w-gross-monthly','w-gross-bonus',
  'lc-food','lc-water','lc-gas','lc-elec','lc-fuel','lc-comm','lc-misc',
  'lc-pocket','lc-ins-m','lc-other-m','lc-other-m2','lc-other-m3',
  'lc-other-m-name','lc-other-m2-name','lc-other-m3-name','lc-other-m4-name',
  'lc-other-m4',
  'lc-travel','lc-social','lc-clothes','lc-ins-y','lc-medical','lc-home','lc-car-tax',
  'lc-other-y','lc-other-y2','lc-other-y3','lc-other-y4',
  'lc-other-y-name','lc-other-y2-name','lc-other-y3-name','lc-other-y4-name',
  'parking','park-from-age','park-to-age','mg-park-h-from-age','mg-park-h-to-age','mg-park-w-from-age','mg-park-w-to-age','prop-tax','furn-cycle','furn-cost',
  'cash-h','cash-w','cash-joint','moving-cost','furniture-init',
  'lctrl-year','lctrl-type','lctrl-household',
  'dc-h-employer','dc-h-matching','dc-h-other-pension','dc-h-rate','dc-h-receive-age','dc-h-method',
  'ideco-h-job','ideco-h-monthly','ideco-h-rate',
  'dc-w-employer','dc-w-matching','dc-w-other-pension','dc-w-rate','dc-w-receive-age','dc-w-method',
  'ideco-w-job','ideco-w-monthly','ideco-w-rate',
  'pi-name','pi-company','pi-address','pi-tel','pi-email','pi-notes'];

const PI_STORAGE_KEY='cf_print_info';

// ===== IndexedDB データベース =====
const DB_NAME='CFTableApp';
const DB_VERSION=1;
const STORE_NAME='slots';
const AUTOSAVE_KEY='__autosave__';
