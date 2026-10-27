import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDraft, materialize, writeJson } from './content-store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const draft=await materialize(root,await loadDraft(root));
const {buildSharePages}=await import('./build-share-pages.mjs');
const result=await buildSharePages({root});
await writeJson(path.join(root,'public/content/release.json'),{revision:draft.revision,items:draft.items.map(({id,href})=>({id,href})),newsIds:result.ids});
console.log(`[content] ${result.count}개 뉴스 공유 페이지를 만들었습니다.`);
