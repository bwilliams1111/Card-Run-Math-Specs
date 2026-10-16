// Preload: replaces globalThis.crypto.getRandomValues with a seeded xoshiro128** stream (seed = $SEED_CRYPTO) so runs of the
// patched builds reproduce. Counts calls in globalThis.__cryptoU32.
'use strict';
const seed = (+process.env.SEED_CRYPTO) >>> 0;
function splitmix32(a){return function(){a|=0;a=a+0x9e3779b9|0;let t=a^a>>>16;t=Math.imul(t,0x21f0aaad);t=t^t>>>15;t=Math.imul(t,0x735a2d97);return((t=t^t>>>15)>>>0);};}
const sm=splitmix32(seed); let s0=sm(),s1=sm(),s2=sm(),s3=sm();
const rotl=(x,k)=>(x<<k)|(x>>>(32-k));
function next(){const r=Math.imul(rotl(Math.imul(s1,5),7),9)>>>0;const t=s1<<9;s2^=s0;s3^=s1;s1^=s2;s0^=s3;s2^=t;s3=rotl(s3,11);return r;}
globalThis.__cryptoU32 = 0;
const fake = { getRandomValues(a){ for(let i=0;i<a.length;i++){ a[i]=next(); globalThis.__cryptoU32++; } return a; } };
Object.defineProperty(globalThis,'crypto',{value:fake,configurable:true,writable:true});
