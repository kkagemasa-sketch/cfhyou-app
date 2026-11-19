# Firestore ルール（cfhyou-shared）

- `firestore.rules` … いま反映中のルール（2026-11-19 反映、ruleset 2dc57ccc-cb33-4b5c-b839-b4cd65771276）
  - 同期のメンバー名簿 `syncMembers/{メール小文字}` を追加。users/{uid} は「管理者 or 名簿で使用中のメンバー」の本人だけ
  - マンション共有 `mansions` は変更なし
- `rules-backup-2026-11-19.txt` … 変更前のルール（ruleset 949eb6bd-d534-4711-b3bd-5c1763ab30dd）
  - 戻すとき: Firebase コンソール → Firestore → ルール → 履歴 から 2026-11-02 の版を選んで公開
- `firestore-release.rules` … **本番に出す日（v660 公開時）に反映する予定**のルール。マンション共有をチームだけにする
  - 今の本番（v659、パスワード入口・匿名ログイン）は匿名でマンションを読むので、公開前に反映すると今のメンバーがマンションを使えなくなる
  - Storage（マンションの添付ファイル）のルールも同じ日にチームだけにする（公開時に今のルールを読んでから作る）
- `storage-release.rules` … 公開日に反映する Storage ルール（マンションの添付ファイルは Google ログインの人だけ。匿名は不可）
- `storage-rules-backup-2026-11-19.txt` … 変更前の Storage ルール（ruleset cc48cfdf-64d9-4c45-8f08-76c94f0e2342）
