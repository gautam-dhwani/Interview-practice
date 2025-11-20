# DSA Problems – 25 Must-Know Questions (JavaScript)

Purpose: Fast revision with canonical solutions and brief explanations. Use with `DSA_Cheat_Sheet.md` for patterns/templates.

---

## 1) Two Sum (Hash Map)
- **Idea**: For each `x`, check if `target - x` seen before.
- **Time**: O(n), **Space**: O(n)
```javascript
function twoSum(nums, target) {
  const m = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (m.has(need)) return [m.get(need), i];
    m.set(nums[i], i);
  }
  return [];
}
```

## 2) Best Time to Buy/Sell Stock
- **Idea**: Track min so far, compute max profit.
- **Time**: O(n)
```javascript
function maxProfit(prices) {
  let minP = Infinity, ans = 0;
  for (const p of prices) {
    minP = Math.min(minP, p);
    ans = Math.max(ans, p - minP);
  }
  return ans;
}
```

## 3) Valid Anagram
- **Idea**: Count chars.
```javascript
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const cnt = new Map();
  for (const c of s) cnt.set(c, (cnt.get(c)||0)+1);
  for (const c of t) {
    if (!cnt.has(c)) return false;
    cnt.set(c, cnt.get(c)-1);
    if (cnt.get(c) === 0) cnt.delete(c);
  }
  return cnt.size === 0;
}
```

## 4) Valid Parentheses (Stack)
```javascript
function isValid(s) {
  const st = [], pair = {')':'(',']':'[','}':'{'};
  for (const c of s) {
    if (c in pair) {
      if (!st.length || st.pop() !== pair[c]) return false;
    } else st.push(c);
  }
  return st.length === 0;
}
```

## 5) Merge Two Sorted Lists
```javascript
function mergeTwoLists(l1, l2) {
  const dummy = {val:0,next:null};
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val < l2.val) { cur.next = l1; l1 = l1.next; }
    else { cur.next = l2; l2 = l2.next; }
    cur = cur.next;
  }
  cur.next = l1 || l2;
  return dummy.next;
}
```

## 6) Reverse Linked List
```javascript
function reverseList(head) {
  let prev = null, cur = head;
  while (cur) {
    const nxt = cur.next;
    cur.next = prev;
    prev = cur; cur = nxt;
  }
  return prev;
}
```

## 7) Linked List Cycle (Floyd)
```javascript
function hasCycle(head) {
  let s = head, f = head;
  while (f && f.next) { s = s.next; f = f.next.next; if (s === f) return true; }
  return false;
}
```

## 8) Middle of Linked List
```javascript
function middleNode(head) {
  let s = head, f = head;
  while (f && f.next) { s = s.next; f = f.next.next; }
  return s;
}
```

## 9) Min Stack (Two Stacks)
```javascript
function createMinStack() {
  const st = [], mn = [];
  return {
    push(x){ st.push(x); mn.push(mn.length?Math.min(mn[mn.length-1],x):x); },
    pop(){ mn.pop(); return st.pop(); },
    top(){ return st[st.length-1]; },
    getMin(){ return mn[mn.length-1]; }
  };
}
```

## 10) Binary Search
```javascript
function binarySearch(nums, target) {
  let l=0, r=nums.length-1;
  while (l <= r) {
    const m = (l+r)>>1;
    if (nums[m] === target) return m;
    if (nums[m] < target) l = m+1; else r = m-1;
  }
  return -1;
}
```

## 11) Search in Rotated Sorted Array
```javascript
function searchRotated(a, t) {
  let l=0,r=a.length-1;
  while(l<=r){
    const m=(l+r)>>1;
    if(a[m]===t) return m;
    if(a[l]<=a[m]){
      if(a[l]<=t&&t<a[m]) r=m-1; else l=m+1;
    } else {
      if(a[m]<t&&t<=a[r]) l=m+1; else r=m-1;
    }
  }
  return -1;
}
```

## 12) Find Min in Rotated Sorted Array
```javascript
function findMin(a){
  let l=0,r=a.length-1,ans=a[0];
  while(l<=r){
    const m=(l+r)>>1;
    ans=Math.min(ans,a[m]);
    if(a[m]>=a[l]){ ans=Math.min(ans,a[l]); l=m+1; }
    else r=m-1;
  }
  return ans;
}
```

## 13) 3Sum (Sort + Two Pointers)
```javascript
function threeSum(nums){
  nums.sort((x,y)=>x-y); const res=[];
  for(let i=0;i<nums.length-2;i++){
    if(i&&nums[i]===nums[i-1]) continue;
    let l=i+1,r=nums.length-1;
    while(l<r){
      const s=nums[i]+nums[l]+nums[r];
      if(s===0){ res.push([nums[i],nums[l],nums[r]]);
        while(l<r&&nums[l]===nums[l+1]) l++;
        while(l<r&&nums[r]===nums[r-1]) r--; l++; r--; }
      else if(s<0) l++; else r--;
    }
  }
  return res;
}
```

## 14) Container With Most Water (Two Pointers)
```javascript
function maxArea(h){
  let l=0,r=h.length-1,ans=0;
  while(l<r){ ans=Math.max(ans,(r-l)*Math.min(h[l],h[r])); if(h[l]<h[r]) l++; else r--; }
  return ans;
}
```

## 15) Product of Array Except Self
```javascript
function productExceptSelf(a){
  const n=a.length,res=Array(n).fill(1);
  let pref=1; for(let i=0;i<n;i++){ res[i]=pref; pref*=a[i]; }
  let suf=1; for(let i=n-1;i>=0;i--){ res[i]*=suf; suf*=a[i]; }
  return res;
}
```

## 16) Maximum Subarray (Kadane)
```javascript
function maxSubArray(a){
  let cur=a[0],ans=a[0];
  for(let i=1;i<a.length;i++){ cur=Math.max(a[i],cur+a[i]); ans=Math.max(ans,cur); }
  return ans;
}
```

## 17) Merge Intervals
```javascript
function mergeIntervals(ints){
  ints.sort((a,b)=>a[0]-b[0]); const res=[];
  for(const it of ints){
    if(!res.length||res[res.length-1][1]<it[0]) res.push(it);
    else res[res.length-1][1]=Math.max(res[res.length-1][1],it[1]);
  }
  return res;
}
```

## 18) Insert Interval
```javascript
function insertInterval(ints, ni){
  const res=[]; let i=0;
  while(i<ints.length&&ints[i][1]<ni[0]) res.push(ints[i++]);
  while(i<ints.length&&ints[i][0]<=ni[1]){ ni=[Math.min(ni[0],ints[i][0]), Math.max(ni[1],ints[i][1])]; i++; }
  res.push(ni);
  while(i<ints.length) res.push(ints[i++]);
  return res;
}
```

## 19) Non-overlapping Intervals (Greedy)
```javascript
function eraseOverlapIntervals(ints){
  ints.sort((a,b)=>a[1]-b[1]);
  let end=-Infinity,keep=0;
  for(const [s,e] of ints){ if(s>=end){ keep++; end=e; } }
  return ints.length-keep;
}
```

## 20) Binary Tree Level Order (BFS)
```javascript
function levelOrder(root){
  if(!root) return []; const q=[root], res=[];
  while(q.length){
    const sz=q.length, cur=[];
    for(let i=0;i<sz;i++){
      const n=q.shift(); cur.push(n.val);
      if(n.left) q.push(n.left); if(n.right) q.push(n.right);
    }
    res.push(cur);
  }
  return res;
}
```

## 21) Validate BST
```javascript
function isValidBST(root){
  function dfs(n,lo=-Infinity,hi=Infinity){
    if(!n) return true; if(n.val<=lo||n.val>=hi) return false;
    return dfs(n.left,lo,n.val)&&dfs(n.right,n.val,hi);
  }
  return dfs(root);
}
```

## 22) Kth Smallest in BST (Inorder)
```javascript
function kthSmallest(root,k){
  const st=[]; let cur=root;
  while(true){
    while(cur){ st.push(cur); cur=cur.left; }
    cur=st.pop(); if(--k===0) return cur.val; cur=cur.right;
  }
}
```

## 23) Lowest Common Ancestor (BST)
```javascript
function lowestCommonAncestor(root,p,q){
  let n=root; const a=p.val,b=q.val;
  while(n){ if(a<n.val&&b<n.val) n=n.left; else if(a>n.val&&b>n.val) n=n.right; else return n; }
}
```

## 24) Number of Islands (DFS)
```javascript
function numIslands(g){
  if(!g.length) return 0; const R=g.length,C=g[0].length; let ans=0;
  const dfs=(r,c)=>{ if(r<0||c<0||r>=R||c>=C||g[r][c]!=='1') return; g[r][c]='0'; dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1); };
  for(let r=0;r<R;r++) for(let c=0;c<C;c++) if(g[r][c]==='1'){ ans++; dfs(r,c); }
  return ans;
}
```

## 25) Course Schedule (Topo Sort)
```javascript
function canFinish(n, pre){
  const g=[...Array(n)].map(()=>[]), indeg=new Array(n).fill(0);
  for(const [v,u] of pre){ g[u].push(v); indeg[v]++; }
  const q=[]; for(let i=0;i<n;i++) if(!indeg[i]) q.push(i);
  let seen=0;
  while(q.length){
    const u=q.shift(); seen++;
    for(const v of g[u]) if(--indeg[v]===0) q.push(v);
  }
  return seen===n;
}
```

---

Tips:
- Arrays/strings → two pointers, sliding window, prefix sums.
- Sorted → two pointers or binary search.
- Tree → DFS/BFS; BST → inorder.
- Graph → BFS/DFS; DAG → topo sort.
- DP when optimal substructure/overlapping subproblems; Greedy when local choice works.
