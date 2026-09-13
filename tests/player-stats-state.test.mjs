import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, ref } from 'vue';
import usePlayerStats, { playerStatsError } from '../app/composables/usePlayerStats.ts';
const response={seasonId:'season',fetchedAt:new Date(0).toISOString()};
function setup() {
  const requests=[];const scope=effectScope();const target=ref({platform:'steam',nickname:'Alice'});
  const state=scope.run(()=>usePlayerStats(target,(value,signal)=>new Promise((resolve,reject)=>requests.push({value,signal,resolve,reject}))));
  return {state,target,scope,requests};
}
test('stats loading coalesces repeated clicks and distinguishes empty success',async()=>{
  const {state,scope,requests}=setup();
  const promise=state.load();await state.load();assert.equal(requests.length,1);
  requests[0].resolve(response);await promise;
  assert.equal(state.hasLoaded.value,true);assert.equal(state.errorMessage.value,'');scope.stop();
});
test('failure is not reported as no records and retry can recover',async()=>{
  const {state,scope,requests}=setup();let promise=state.load();requests[0].reject({statusCode:429});await promise;
  assert.equal(state.hasLoaded.value,false);assert.match(state.errorMessage.value,/요청이 많/);
  promise=state.load();requests[1].resolve(response);await promise;
  assert.equal(state.hasLoaded.value,true);assert.equal(state.errorMessage.value,'');scope.stop();
});
test('target changes abort old fetches and ignore their late result',async()=>{
  const {state,target,scope,requests}=setup();const first=state.load();target.value={platform:'kakao',nickname:'Bob'};
  assert.equal(requests[0].signal.aborted,true);const second=state.load();
  requests[1].resolve({...response,banType:'Innocent'});await second;
  requests[0].resolve({...response,banType:'Old'});await first;
  assert.equal(state.stats.value.banType,'Innocent');scope.stop();
});
test('closing or disposing cancels work and invalid responses show an error',async()=>{
  const {state,scope,requests}=setup();let promise=state.load();state.reset();requests[0].reject(new Error('aborted'));await promise;
  assert.equal(state.errorMessage.value,'');
  promise=state.load();requests[1].resolve(null);await promise;
  assert.equal(state.hasLoaded.value,false);assert.match(state.errorMessage.value,/불러오지 못/);
  promise=state.load();scope.stop();requests[2].resolve(response);await promise;
  assert.equal(state.stats.value,null);await state.load();assert.equal(requests.length,3);
});
test('client error messages never expose raw upstream error details',()=>{
  for(const statusCode of [400,404,429,502,503,504])assert.doesNotMatch(playerStatsError({statusCode,message:'secret'}),/secret/);
});
