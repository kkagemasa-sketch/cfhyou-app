# Firestore ルール（cfhyou-shared）

- `firestore.rules` … いま反映中のルール（2026-11-19 反映、ruleset 2dc57ccc-cb33-4b5c-b839-b4cd65771276）
  - 同期のメンバー名簿 `syncMembers/{メール小文字}` を追加。users/{uid} は「管理者 or 名簿で使用中のメンバー」の本人だけ
  - マンション共有 `mansions` は変更なし
- `rules-backup-2026-11-19.txt` … 変更前のルール（ruleset 949eb6bd-d534-4711-b3bd-5c1763ab30dd）
  - 戻すとき: Firebase コンソール → Firestore → ルール → 履歴 から 2026-11-02 の版を選んで公開
