const DB_NAME="GK_Gym_Payment_System",DB_VERSION=2;
const UPI_VPA="8767239654-4@ibl";
const UPI_PAYEE_NAME="GAJANAN NAMDEV KHASAWAT";
const STORES={members:"members",payments:"payments",membershipPlans:"membershipPlans",invoices:"invoices",settings:"settings",auditLogs:"auditLogs",users:"users"};
let db;

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);
req.onupgradeneeded=e=>{const d=e.target.result;
 if(!d.objectStoreNames.contains("members")){const m=d.createObjectStore("members",{keyPath:"id",autoIncrement:true});m.createIndex("memberId","memberId",{unique:true});m.createIndex("expiryDate","expiryDate");}
 if(!d.objectStoreNames.contains("payments")){const p=d.createObjectStore("payments",{keyPath:"id",autoIncrement:true});p.createIndex("memberId","memberId");p.createIndex("paymentDate","paymentDate");p.createIndex("paymentStatus","paymentStatus");p.createIndex("paymentMethod","paymentMethod");}
 if(!d.objectStoreNames.contains("membershipPlans"))d.createObjectStore("membershipPlans",{keyPath:"id",autoIncrement:true});
 if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id",autoIncrement:true});
 if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"});
 if(!d.objectStoreNames.contains("auditLogs"))d.createObjectStore("auditLogs",{keyPath:"id",autoIncrement:true});
 if(!d.objectStoreNames.contains("users")){const u=d.createObjectStore("users",{keyPath:"id",autoIncrement:true});u.createIndex("username","username",{unique:true});u.createIndex("status","status");}
};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(req.error)});}

function tx(store,mode="readonly"){return db.transaction(store,mode).objectStore(store)}
function all(store){return new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function get(store,key){return new Promise((res,rej)=>{const r=tx(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(store,obj){return new Promise((res,rej)=>{const r=tx(store,"readwrite").put(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function add(store,obj){return new Promise((res,rej)=>{const r=tx(store,"readwrite").add(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function del(store,key){return new Promise((res,rej)=>{const r=tx(store,"readwrite").delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function clearStore(store){return new Promise((res,rej)=>{const r=tx(store,"readwrite").clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function audit(action,details="",actor="system"){await add("auditLogs",{action,details,actor,at:new Date().toISOString()})}

async function seed(){
 let gym=await get("settings","gym");if(!gym)await put("settings",{key:"gym",gymName:"GK Gym",gymPhone:"",gymAddress:"",currency:"₹"});
 let admin=await get("settings","admin");if(!admin)await put("settings",{key:"admin",username:"admin",password:"admin123"});
 if(!(await all("membershipPlans")).length){await add("membershipPlans",{name:"Monthly",duration:30,amount:1000});await add("membershipPlans",{name:"Quarterly",duration:90,amount:2500});await add("membershipPlans",{name:"Half Yearly",duration:180,amount:4500});await add("membershipPlans",{name:"Yearly",duration:365,amount:8000});}
}

function dateOnly(v){return new Date(v+"T00:00:00")}
function todayISO(){return new Date().toISOString().slice(0,10)}
function money(n,c="₹"){return `${c}${Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function calcStatus(exp){const days=Math.ceil((dateOnly(exp)-dateOnly(todayISO()))/86400000);return days<0?"Expired":days<=7?"Expiring Soon":"Active"}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function csvDownload(filename,rows){const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function backupData(){const data={version:2,exportedAt:new Date().toISOString()};for(const s of Object.values(STORES))data[s]=await all(s);return data}
async function restoreData(data){for(const s of Object.values(STORES)){if(Array.isArray(data[s])){await clearStore(s);for(const item of data[s])await put(s,item)}}}