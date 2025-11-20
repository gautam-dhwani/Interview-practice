# DSA Cheat Sheet (Patterns, Templates, Complexity)

Use these templates to recall approaches fast.

---

## Sliding Window
- **Use**: Longest substring, subarray sum constraints, variable-size windows.
```javascript
// Longest substring without repeating
function lengthOfLongestSubstring(s){
  const m=new Map(); let l=0,ans=0;
  for(let r=0;r<s.length;r++){
    if(m.has(s[r]) && m.get(s[r])>=l) l=m.get(s[r])+1;
    m.set(s[r], r);
    ans=Math.max(ans, r-l+1);
  }
  return ans;
}
```

## Binary Search (Index)
```javascript
function bs(a,t){
  let l=0,r=a.length-1;
  while(l<=r){
    const m=(l+r)>>1;
    if(a[m]===t) return m;
    if(a[m]<t) l=m+1; else r=m-1;
  }
  return -1;
}
```

## Binary Search on Answer
- **Use**: Min capacity, min days, split arrays, kth smallest pair distance.
```javascript
function feasible(x){/* check if answer<=x works */}
function bsoa(){
  let l=0,r=1e9,ans=r;
  while(l<=r){
    const m=(l+r)>>1;
    if(feasible(m)){ ans=m; r=m-1; } else l=m+1;
  }
  return ans;
}
```

## Two Pointers (Sorted)
```javascript
function twoSumSorted(a,t){
  let l=0,r=a.length-1;
  while(l<r){
    const s=a[l]+a[r];
    if(s===t) return [l,r];
    if(s<t) l++; else r--;
  }
  return [-1,-1];
}
```

## Prefix Sum + Hash Map
- **Use**: Subarray sum equals k, count subarrays, divisible by k.
```javascript
function subarraySum(a,k){
  const m=new Map([[0,1]]); let sum=0,ans=0;
  for(const x of a){
    sum+=x; ans+=m.get(sum-k)||0; m.set(sum,(m.get(sum)||0)+1);
  }
  return ans;
}
```

## Monotonic Deque (Sliding Window Max)
```javascript
function maxSlidingWindow(a,k){
  const dq=[], res=[];
  for(let i=0;i<a.length;i++){
    while(dq.length&&dq[0]<=i-k) dq.shift();
    while(dq.length&&a[dq[dq.length-1]]<=a[i]) dq.pop();
    dq.push(i);
    if(i>=k-1) res.push(a[dq[0]]);
  }
  return res;
}
```

## Monotonic Stack (Next Greater)
```javascript
function nextGreater(a){
  const st=[], res=Array(a.length).fill(-1);
  for(let i=0;i<a.length;i++){
    while(st.length && a[st[st.length-1]]<a[i]) res[st.pop()] = a[i];
    st.push(i);
  }
  return res;
}
```

## Graph BFS/DFS
```javascript
function bfs(g,s){
  const q=[s], seen=new Set([s]);
  while(q.length){
    const u=q.shift();
    for(const v of g[u]||[]){ if(!seen.has(v)){ seen.add(v); q.push(v); } }
  }
}

function dfs(g,u,seen=new Set()){
  if(seen.has(u)) return; seen.add(u);
  for(const v of g[u]||[]) dfs(g,v,seen);
}
```

## Topological Sort (Kahn’s)
```javascript
function topo(n,edges){
  const g=[...Array(n)].map(()=>[]), indeg=Array(n).fill(0);
  for(const [v,u] of edges){ g[u].push(v); indeg[v]++; }
  const q=[], res=[]; for(let i=0;i<n;i++) if(!indeg[i]) q.push(i);
  while(q.length){
    const u=q.shift(); res.push(u);
    for(const v of g[u]) if(--indeg[v]===0) q.push(v);
  }
  return res.length===n?res:[];
}
```

## Union-Find (Disjoint Set)
```javascript
function createUF(n){
  const p=[...Array(n).keys()], r=Array(n).fill(0);
  const find=x=>p[x]===x?x:(p[x]=find(p[x]));
  const unite=(a,b)=>{ a=find(a); b=find(b); if(a===b) return false; if(r[a]<r[b]) [a,b]=[b,a]; p[b]=a; if(r[a]===r[b]) r[a]++; return true; };
  return {find,unite};
}
```

## DP (1D)
- **House Robber**
```javascript
function rob(a){ let incl=0, excl=0; for(const x of a){ const ni=excl+x; excl=Math.max(excl,incl); incl=ni; } return Math.max(incl,excl); }
```

## LIS O(n log n) (Patience)
```javascript
function lengthOfLIS(a){
  const d=[];
  for(const x of a){
    let l=0,r=d.length;
    while(l<r){ const m=(l+r)>>1; if(d[m]<x) l=m+1; else r=m; }
    d[l]=x;
  }
  return d.length;
}
```

## Complexity Quick Ref
- Arrays/Strings: scan O(n), sort O(n log n)
- HashMap/Set: avg O(1) ops
- Heap: push/pop O(log n)
- Binary Search: O(log n)
- Graph BFS/DFS: O(V+E)
- Topo Sort: O(V+E)
- Union-Find: Amortized ~O(α(n))
- Typical DP: O(n) to O(n*m)
