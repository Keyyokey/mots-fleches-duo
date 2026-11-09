// Faux Upstash REST (tests locaux) : POST / avec ["CMD", ...args] -> {result}
const http=require("http");const D=new Map(),T=new Map();
const now=()=>Date.now();const alive=k=>{if(T.has(k)&&T.get(k)<=now()){D.delete(k);T.delete(k)}return D.has(k)};
const glob=p=>new RegExp("^"+p.replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");
function run(c){const [cmd,...a]=c;const C=String(cmd).toUpperCase();const g=k=>alive(k)?D.get(k):undefined;
 switch(C){
 case"PING":return"PONG";
 case"GET":{const v=g(a[0]);return v&&v.t==="string"?v.v:null}
 case"SET":{D.set(a[0],{t:"string",v:String(a[1])});T.delete(a[0]);const i=a.findIndex(x=>String(x).toUpperCase()==="EX");if(i>0)T.set(a[0],now()+Number(a[i+1])*1000);const j=a.findIndex(x=>String(x).toUpperCase()==="PX");if(j>0)T.set(a[0],now()+Number(a[j+1]));return"OK"}
 case"MGET":return a.map(k=>{const v=g(k);return v&&v.t==="string"?v.v:null});
 case"EXISTS":return a.filter(k=>alive(k)).length;
 case"DEL":{let n=0;a.forEach(k=>{if(alive(k)){D.delete(k);T.delete(k);n++}});return n}
 case"TYPE":{const v=g(a[0]);return v?v.t:"none"}
 case"SCAN":{let re=null;const i=a.findIndex(x=>String(x).toUpperCase()==="MATCH");if(i>0)re=glob(a[i+1]);return["0",[...D.keys()].filter(k=>alive(k)&&(!re||re.test(k)))]}
 case"PTTL":return !alive(a[0])?-2:T.has(a[0])?T.get(a[0])-now():-1;
 case"PEXPIRE":if(!alive(a[0]))return 0;T.set(a[0],now()+Number(a[1]));return 1;
 case"RENAME":D.set(a[1],D.get(a[0]));D.delete(a[0]);return"OK";
 case"HSET":{const v=g(a[0])||{t:"hash",v:{}};let n=0;for(let i=1;i<a.length;i+=2){if(!(a[i] in v.v))n++;v.v[a[i]]=String(a[i+1])}D.set(a[0],v);return n}
 case"HMGET":{const v=g(a[0]);return a.slice(1).map(f=>v&&f in v.v?v.v[f]:null)}
 case"HDEL":{const v=g(a[0]);let n=0;if(v)a.slice(1).forEach(f=>{if(f in v.v){delete v.v[f];n++}});return n}
 case"HGETALL":{const v=g(a[0]);return v?Object.entries(v.v).flat():[]}
 case"ZADD":{const v=g(a[0])||{t:"zset",v:{}};let i=1,n=0;while(i<a.length&&/^(NX|XX|GT|LT|CH|INCR)$/i.test(a[i]))i++;for(;i<a.length;i+=2){if(!(a[i+1] in v.v))n++;v.v[a[i+1]]=Number(a[i])}D.set(a[0],v);return n}
 case"ZSCORE":{const v=g(a[0]);return v&&a[1] in v.v?String(v.v[a[1]]):null}
 case"ZRANGE":case"ZREVRANGE":{const v=g(a[0]);if(!v)return[];let L=Object.entries(v.v).sort((x,y)=>x[1]-y[1]||(x[0]<y[0]?-1:1));if(C==="ZREVRANGE")L.reverse();let s=Number(a[1]),e=Number(a[2]);if(e<0)e=L.length+e;L=L.slice(s,e+1);return a.some(x=>String(x).toUpperCase()==="WITHSCORES")?L.flatMap(([m,sc])=>[m,String(sc)]):L.map(x=>x[0])}
 case"ZREVRANK":{const v=g(a[0]);if(!v||!(a[1] in v.v))return null;const L=Object.entries(v.v).sort((x,y)=>y[1]-x[1]);return L.findIndex(x=>x[0]===a[1])}
 case"ZINCRBY":{const v=g(a[0])||{t:"zset",v:{}};v.v[a[2]]=(v.v[a[2]]||0)+Number(a[1]);D.set(a[0],v);return String(v.v[a[2]])}
 case"SADD":{const v=g(a[0])||{t:"set",v:[]};let n=0;a.slice(1).forEach(m=>{if(!v.v.includes(m)){v.v.push(m);n++}});D.set(a[0],v);return n}
 case"SMEMBERS":{const v=g(a[0]);return v?v.v:[]}
 case"RPUSH":{const v=g(a[0])||{t:"list",v:[]};v.v.push(...a.slice(1));D.set(a[0],v);return v.v.length}
 case"LRANGE":{const v=g(a[0]);return v?v.v:[]}
 case"INCR":case"INCRBY":{const v=g(a[0])||{t:"string",v:"0"};v.v=String(Number(v.v)+(C==="INCR"?1:Number(a[1])));D.set(a[0],v);return Number(v.v)}
 case"EXPIRE":if(!alive(a[0]))return 0;T.set(a[0],now()+Number(a[1])*1000);return 1;
 case"TTL":return !alive(a[0])?-2:T.has(a[0])?Math.round((T.get(a[0])-now())/1000):-1;
 default:throw new Error("commande non gérée "+C)}}
http.createServer((q,r)=>{let b="";q.on("data",d=>b+=d);q.on("end",()=>{r.setHeader("content-type","application/json");
 try{const c=JSON.parse(b);if(Array.isArray(c[0])){r.end(JSON.stringify(c.map(x=>({result:run(x)}))));return}r.end(JSON.stringify({result:run(c)}))}catch(e){r.statusCode=400;r.end(JSON.stringify({error:e.message}))}})}).listen(Number(process.env.FPORT||3999));
