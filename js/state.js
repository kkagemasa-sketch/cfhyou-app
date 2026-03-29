// state.js — グローバル状態変数

let finAssetVisible=true;

// ===== 状態 =====
let ST={type:'mansion'};
let cCnt=0,rCnt=0,lsCnt=0,lvCnt=0;
let charts={};
let timer=null;
let rTab='cf';
let cfOverrides={};// CF表手動上書き {rowKey: {colIndex: value}}

let indicatorTimer=null;
let _lastInputHash='';

let downType='own'; // 'own'=自己資金 / 'gift'=住宅資金贈与

let _lctrlDedMode='auto';

let repMode='auto', repStepCnt=0;

let repAutoStepCnt=0;

let otherMemberCnt=0;

let repairCnt=1;

let insSavCnt=0, secCnt=0;

let carOwn=true;
let carCnt=0;

let parkOwn=true;

let pairLoanMode=false;

let retirePayOn=true;

let wRetirePayOn=true;

let hIncomeCnt=0, wIncomeCnt=0;

let otherIncomeCnt=0;

let _cfActive     = null; // {rowKey, fromAge, toAge, stepId?} | null
let _cfBlurTimer  = null;
let _cfScrollTimer= null;
let _needsScrollAfterRender = false; // 次のrender後にスクロールが必要かどうか

let extraCnt = 0;

let _db=null;

let _autoSaveTimer=null;

let _amtObserverTimer=null;

let mgTarget='h'; // h=ご主人, w=奥様
let mgDansin=true, mgDansinH=true, mgDansinW=true;
let mgSurvMode='auto';
let mgInsCnt=1;

let mgCarOn=true, mgParkOn=true;

let _mgLCStepCount=1;

let _loanPrepayId=0;

let _isPairLoan=false;

let _lpRateCntA=0,_lpRateCntB=0;

let _ppType='term'; // 'term'=期間短縮型, 'reduce'=返済額軽減型

let scenarioCnt=1;
let scenarios=[{id:1,name:'プラン1',data:null}];
let activeScenarioId=1;

let _undoStack=[];
