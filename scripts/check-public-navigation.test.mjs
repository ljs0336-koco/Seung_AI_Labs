import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {isOwnerDestination,ownerLinks,checkPublicNavigation} from './check-public-navigation.mjs';

test('blocks base entrances and legacy aliases across normal, JSX and encoded links',()=>{
  for(const value of ['../#/base','../../#/admin','/#/base/','./privacy-guidelines.html','/base','#/%62ase'])assert.equal(isOwnerDestination(value),true,value);
  assert.equal(ownerLinks('<nav><Link to="/base">기지</Link><Link to={BASE_PATH}>다른 입구</Link><a href="../#/admin">옛 입구</a></nav>').length,3);
});
test('keeps public returns, briefing archives and teaching destinations available',()=>{
  for(const value of ['../#/','../briefing/archive/','./apps/terrarium/index.html','https://padlet.com/jaeseungtek/ai-8js4uzp6xqxjztbf'])assert.equal(isOwnerDestination(value),false,value);
  assert.deepEqual(ownerLinks('<a href="../#/">통합 포털</a><Link to="/playground">놀이터</Link>'),[]);
});
test('all current public pages and components omit base entrance links',async()=>{
  assert.ok(await checkPublicNavigation(fileURLToPath(new URL('..',import.meta.url)))>50);
});
