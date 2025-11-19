'use strict';

/**
 * DSA Practice in JavaScript (no shortcut built-ins unless necessary)
 * ---------------------------------------------------------------
 * Includes:
 * - Distinct elements of an array (O(n) using hash map)
 * - Two Sum (O(n) using hash map)
 * - Maximum subarray sum (Kadane's algorithm, O(n))
 * - Clock angle between hour and minute hands
 * - Sum of two integers without using + or - (bitwise)
 *
 * Run: node dsa.js
 */

// -------------------------------------------------------------
// Distinct elements
// -------------------------------------------------------------
function distinct(arr) {
  const seen = Object.create(null);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    const key = typeof v + '|' + String(v);
    if (seen[key] === undefined) {
      seen[key] = 1;
      out.push(v);
    }
  }
  return out;
}

// -------------------------------------------------------------
// Two Sum: return indices of a pair that sums to target, or null
// -------------------------------------------------------------
function twoSum(arr, target) {
  const map = Object.create(null); // value -> index
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    const need = target - x;
    if (map[need] !== undefined) return [map[need], i];
    map[x] = i;
  }
  return null;
}

// -------------------------------------------------------------
// Kadane's Algorithm: maximum subarray sum
// -------------------------------------------------------------
function kadane(arr) {
  if (arr.length === 0) return 0; // define empty as 0
  let maxSoFar = arr[0];
  let curr = arr[0];
  for (let i = 1; i < arr.length; i++) {
    // either extend current subarray or start new from arr[i]
    curr = arr[i] > (curr + arr[i]) ? arr[i] : (curr + arr[i]);
    if (curr > maxSoFar) maxSoFar = curr;
  }
  return maxSoFar;
}

// -------------------------------------------------------------
// Clock angle between hour and minute hands
// - Hour hand moves 0.5 degrees per minute (30 deg per hour)
// - Minute hand moves 6 degrees per minute
// Return the smaller angle (0..180)
// -------------------------------------------------------------
function clockAngle(hour, minute) {
  hour = hour % 12;
  const hourAngle = 30 * hour + 0.5 * minute;
  const minuteAngle = 6 * minute;
  let angle = Math.abs(hourAngle - minuteAngle);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// -------------------------------------------------------------
// Sum of two integers without using + or -
// Use bitwise XOR (sum without carry) and AND+shift (carry)
// Works for 32-bit signed ranges reliably in JS
// -------------------------------------------------------------
function addWithoutPlus(a, b) {
  a |= 0; b |= 0; // force 32-bit
  while (b !== 0) {
    const carry = (a & b) << 1;
    a = a ^ b;
    b = carry | 0; // keep 32-bit
  }
  return a;
}

// -------------------------------------------------------------
// 6. Reverse a string (iterative)
// -------------------------------------------------------------
function reverseString(str) {
  let result = '';
  for (let i = str.length - 1; i >= 0; i--) {
    result += str[i];
  }
  return result;
}

// -------------------------------------------------------------
// 7. Check if string is palindrome
// -------------------------------------------------------------
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++; right--;
  }
  return true;
}

// -------------------------------------------------------------
// 8. Find first non-repeating character
// -------------------------------------------------------------
function firstNonRepeating(str) {
  const count = Object.create(null);
  for (let i = 0; i < str.length; i++) {
    count[str[i]] = (count[str[i]] || 0) + 1;
  }
  for (let i = 0; i < str.length; i++) {
    if (count[str[i]] === 1) return str[i];
  }
  return null;
}

// -------------------------------------------------------------
// 9. Binary Search (iterative)
// -------------------------------------------------------------
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// -------------------------------------------------------------
// 10. Merge two sorted arrays
// -------------------------------------------------------------
function mergeSorted(arr1, arr2) {
  const result = [];
  let i = 0, j = 0;
  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i++]);
    } else {
      result.push(arr2[j++]);
    }
  }
  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);
  return result;
}

// -------------------------------------------------------------
// 11. Find missing number in array 1 to n
// -------------------------------------------------------------
function findMissing(arr, n) {
  const expectedSum = (n * (n + 1)) / 2;
  const actualSum = arr.reduce((sum, num) => sum + num, 0);
  return expectedSum - actualSum;
}

// -------------------------------------------------------------
// 12. Rotate array to the right by k steps
// -------------------------------------------------------------
function rotateArray(arr, k) {
  const n = arr.length;
  k = k % n; // handle k > n
  if (k === 0) return arr;
  
  // Reverse entire array, then reverse first k, then reverse rest
  const reverse = (start, end) => {
    while (start < end) {
      [arr[start], arr[end]] = [arr[end], arr[start]];
      start++; end--;
    }
  };
  
  reverse(0, n - 1);
  reverse(0, k - 1);
  reverse(k, n - 1);
  return arr;
}

// -------------------------------------------------------------
// 13. Valid parentheses checker
// -------------------------------------------------------------
function isValidParentheses(s) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };
  
  for (let char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (char === ')' || char === '}' || char === ']') {
      if (stack.length === 0 || stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }
  return stack.length === 0;
}

// -------------------------------------------------------------
// 14. Longest common prefix
// -------------------------------------------------------------
function longestCommonPrefix(strs) {
  if (strs.length === 0) return '';
  let prefix = strs[0];
  
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

// -------------------------------------------------------------
// 15. Remove duplicates from sorted array (in-place)
// -------------------------------------------------------------
function removeDuplicates(arr) {
  if (arr.length <= 1) return arr.length;
  
  let writeIndex = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] !== arr[i - 1]) {
      arr[writeIndex] = arr[i];
      writeIndex++;
    }
  }
  return writeIndex; // new length
}

// -------------------------------------------------------------
// 16. Move zeros to end
// -------------------------------------------------------------
function moveZeros(arr) {
  let writeIndex = 0;
  
  // Move all non-zero elements to front
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      arr[writeIndex] = arr[i];
      writeIndex++;
    }
  }
  
  // Fill remaining with zeros
  while (writeIndex < arr.length) {
    arr[writeIndex] = 0;
    writeIndex++;
  }
  return arr;
}

// -------------------------------------------------------------
// 17. Find intersection of two arrays
// -------------------------------------------------------------
function intersection(arr1, arr2) {
  const set1 = new Set(arr1);
  const result = new Set();
  
  for (let num of arr2) {
    if (set1.has(num)) {
      result.add(num);
    }
  }
  return Array.from(result);
}

// -------------------------------------------------------------
// 18. Single number (XOR approach)
// Every number appears twice except one
// -------------------------------------------------------------
function singleNumber(arr) {
  let result = 0;
  for (let num of arr) {
    result ^= num; // XOR cancels out pairs
  }
  return result;
}

// -------------------------------------------------------------
// 19. Happy number checker
// A happy number is replaced by sum of squares of digits until it becomes 1
// -------------------------------------------------------------
function isHappy(n) {
  const seen = new Set();
  
  const getSumOfSquares = (num) => {
    let sum = 0;
    while (num > 0) {
      const digit = num % 10;
      sum += digit * digit;
      num = Math.floor(num / 10);
    }
    return sum;
  };
  
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = getSumOfSquares(n);
  }
  
  return n === 1;
}

// -------------------------------------------------------------
// 20. Climbing stairs (Fibonacci variant)
// How many ways to climb n stairs (1 or 2 steps at a time)
// -------------------------------------------------------------
function climbStairs(n) {
  if (n <= 2) return n;
  
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}

// -------------------------------------------------------------
// 21. Best time to buy and sell stock
// -------------------------------------------------------------
function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  
  for (let price of prices) {
    if (price < minPrice) {
      minPrice = price;
    } else if (price - minPrice > maxProfit) {
      maxProfit = price - minPrice;
    }
  }
  return maxProfit;
}

// -------------------------------------------------------------
// 22. Majority element (Boyer-Moore Voting)
// Element that appears more than n/2 times
// -------------------------------------------------------------
function majorityElement(arr) {
  let candidate = null;
  let count = 0;
  
  // Find candidate
  for (let num of arr) {
    if (count === 0) {
      candidate = num;
    }
    count += (num === candidate) ? 1 : -1;
  }
  
  return candidate;
}

// -------------------------------------------------------------
// 23. Contains duplicate
// -------------------------------------------------------------
function containsDuplicate(arr) {
  const seen = new Set();
  for (let num of arr) {
    if (seen.has(num)) return true;
    seen.add(num);
  }
  return false;
}

// -------------------------------------------------------------
// 24. Product of array except self
// -------------------------------------------------------------
function productExceptSelf(arr) {
  const n = arr.length;
  const result = new Array(n);
  
  // Left pass
  result[0] = 1;
  for (let i = 1; i < n; i++) {
    result[i] = result[i - 1] * arr[i - 1];
  }
  
  // Right pass
  let rightProduct = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= rightProduct;
    rightProduct *= arr[i];
  }
  
  return result;
}

// -------------------------------------------------------------
// 25. Valid anagram checker
// -------------------------------------------------------------
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  
  const count = Object.create(null);
  
  for (let char of s) {
    count[char] = (count[char] || 0) + 1;
  }
  
  for (let char of t) {
    if (!count[char]) return false;
    count[char]--;
  }
  
  return true;
}

// -------------------------------------------------------------
// 26. Longest Substring Without Repeating Characters
// Input: "abcabcbb" → Output: 3 (substring "abc")
// Input: "bbbbb" → Output: 1 (substring "b")
// -------------------------------------------------------------
function lengthOfLongestSubstring(s) {
  const seen = new Set();
  let left = 0;
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    while (seen.has(s[right])) {
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);
    maxLength = Math.max(maxLength, right - left + 1);
  }
  
  return maxLength;
}

// -------------------------------------------------------------
// 27. Valid Palindrome II (can remove at most one character)
// Input: "aba" → Output: true (already palindrome)
// Input: "abca" → Output: true (remove 'c' to get "aba")
// -------------------------------------------------------------
function validPalindrome(s) {
  const isPalindrome = (str, left, right) => {
    while (left < right) {
      if (str[left] !== str[right]) return false;
      left++;
      right--;
    }
    return true;
  };
  
  let left = 0, right = s.length - 1;
  
  while (left < right) {
    if (s[left] !== s[right]) {
      // Try removing left character or right character
      return isPalindrome(s, left + 1, right) || isPalindrome(s, left, right - 1);
    }
    left++;
    right--;
  }
  
  return true;
}

// -------------------------------------------------------------
// 28. Group Anagrams
// Input: ["eat","tea","tan","ate","nat","bat"] → Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
// Input: [""] → Output: [[""]]
// -------------------------------------------------------------
function groupAnagrams(strs) {
  const groups = Object.create(null);
  
  for (let str of strs) {
    // Sort characters to create key
    const key = str.split('').sort().join('');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(str);
  }
  
  return Object.values(groups);
}

// -------------------------------------------------------------
// 29. Merge Intervals
// Input: [[1,3],[2,6],[8,10],[15,18]] → Output: [[1,6],[8,10],[15,18]]
// Input: [[1,4],[4,5]] → Output: [[1,5]]
// -------------------------------------------------------------
function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals;
  
  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);
  
  const merged = [intervals[0]];
  
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = merged[merged.length - 1];
    
    if (current[0] <= lastMerged[1]) {
      // Overlapping intervals, merge them
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      // Non-overlapping interval
      merged.push(current);
    }
  }
  
  return merged;
}

// -------------------------------------------------------------
// 30. Three Sum (find triplets that sum to zero)
// Input: [-1,0,1,2,-1,-4] → Output: [[-1,-1,2],[-1,0,1]]
// Input: [0,1,1] → Output: []
// -------------------------------------------------------------
function threeSum(nums) {
  const result = [];
  nums.sort((a, b) => a - b);
  
  for (let i = 0; i < nums.length - 2; i++) {
    // Skip duplicates for first number
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    let left = i + 1;
    let right = nums.length - 1;
    
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        
        // Skip duplicates
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }
  
  return result;
}

// -------------------------------------------------------------
// 31. Container With Most Water
// Input: [1,8,6,2,5,4,8,3,7] → Output: 49
// Input: [1,1] → Output: 1
// -------------------------------------------------------------
function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;
  
  while (left < right) {
    const width = right - left;
    const currentHeight = Math.min(height[left], height[right]);
    const area = width * currentHeight;
    
    maxWater = Math.max(maxWater, area);
    
    // Move pointer with smaller height
    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }
  
  return maxWater;
}

// -------------------------------------------------------------
// 32. Minimum Window Substring
// Input: s = "ADOBECODEBANC", t = "ABC" → Output: "BANC"
// Input: s = "a", t = "a" → Output: "a"
// -------------------------------------------------------------
function minWindow(s, t) {
  if (s.length < t.length) return "";
  
  const targetCount = Object.create(null);
  for (let char of t) {
    targetCount[char] = (targetCount[char] || 0) + 1;
  }
  
  let left = 0;
  let minLen = Infinity;
  let minStart = 0;
  let matched = 0;
  const windowCount = Object.create(null);
  
  for (let right = 0; right < s.length; right++) {
    const rightChar = s[right];
    windowCount[rightChar] = (windowCount[rightChar] || 0) + 1;
    
    if (targetCount[rightChar] && windowCount[rightChar] === targetCount[rightChar]) {
      matched++;
    }
    
    while (matched === Object.keys(targetCount).length) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }
      
      const leftChar = s[left];
      windowCount[leftChar]--;
      if (targetCount[leftChar] && windowCount[leftChar] < targetCount[leftChar]) {
        matched--;
      }
      left++;
    }
  }
  
  return minLen === Infinity ? "" : s.substring(minStart, minStart + minLen);
}

// -------------------------------------------------------------
// 33. Subarray Sum Equals K
// Input: nums = [1,1,1], k = 2 → Output: 2
// Input: nums = [1,2,3], k = 3 → Output: 2
// -------------------------------------------------------------
function subarraySum(nums, k) {
  const prefixSumCount = new Map();
  prefixSumCount.set(0, 1); // Handle subarrays starting from index 0
  
  let count = 0;
  let prefixSum = 0;
  
  for (let num of nums) {
    prefixSum += num;
    
    // Check if (prefixSum - k) exists
    if (prefixSumCount.has(prefixSum - k)) {
      count += prefixSumCount.get(prefixSum - k);
    }
    
    // Update prefix sum count
    prefixSumCount.set(prefixSum, (prefixSumCount.get(prefixSum) || 0) + 1);
  }
  
  return count;
}

// -------------------------------------------------------------
// 34. Sliding Window Maximum
// Input: nums = [1,3,-1,-3,5,3,6,7], k = 3 → Output: [3,3,5,5,6,7]
// Input: nums = [1], k = 1 → Output: [1]
// -------------------------------------------------------------
function maxSlidingWindow(nums, k) {
  const result = [];
  const deque = []; // Store indices
  
  for (let i = 0; i < nums.length; i++) {
    // Remove indices outside current window
    while (deque.length && deque[0] <= i - k) {
      deque.shift();
    }
    
    // Remove indices with smaller values than current
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }
    
    deque.push(i);
    
    // Add maximum to result when window is complete
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }
  
  return result;
}

// -------------------------------------------------------------
// 35. Trapping Rain Water
// Input: [0,1,0,2,1,0,1,3,2,1,2,1] → Output: 6
// Input: [4,2,0,3,2,5] → Output: 9
// -------------------------------------------------------------
function trap(height) {
  if (height.length <= 2) return 0;
  
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }
  
  return water;
}

// -------------------------------------------------------------
// Demo runner
// -------------------------------------------------------------
function demo() {
  console.log('\n--- DSA Demo ---');

  // Original 5 problems
  const arr = [1, 2, 2, 3, 4, 4, 5, 1];
  console.log('distinct([1,2,2,3,4,4,5,1]) =>', distinct(arr));

  const arr2 = [2, 7, 11, 15];
  console.log('twoSum([2,7,11,15], 9) =>', twoSum(arr2, 9));

  const arr3 = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  console.log('kadane([-2,1,-3,4,-1,2,1,-5,4]) =>', kadane(arr3)); // 6

  console.log('clockAngle(3, 30) =>', clockAngle(3, 30)); // 75
  console.log('clockAngle(12, 0) =>', clockAngle(12, 0)); // 0

  console.log('addWithoutPlus(5, 7) =>', addWithoutPlus(5, 7)); // 12
  console.log('addWithoutPlus(-4, 9) =>', addWithoutPlus(-4, 9)); // 5

  console.log('\n--- Additional 20 DSA Problems ---');
  
  // String problems
  console.log('reverseString("hello") =>', reverseString('hello'));
  console.log('isPalindrome("A man a plan a canal Panama") =>', isPalindrome('A man a plan a canal Panama'));
  console.log('firstNonRepeating("leetcode") =>', firstNonRepeating('leetcode'));
  console.log('isAnagram("listen", "silent") =>', isAnagram('listen', 'silent'));
  
  // Array problems
  console.log('binarySearch([1,3,5,7,9], 5) =>', binarySearch([1,3,5,7,9], 5));
  console.log('mergeSorted([1,3,5], [2,4,6]) =>', mergeSorted([1,3,5], [2,4,6]));
  console.log('findMissing([1,2,4,5], 5) =>', findMissing([1,2,4,5], 5));
  console.log('rotateArray([1,2,3,4,5], 2) =>', rotateArray([1,2,3,4,5], 2));
  console.log('moveZeros([0,1,0,3,12]) =>', moveZeros([0,1,0,3,12]));
  console.log('intersection([1,2,2,1], [2,2]) =>', intersection([1,2,2,1], [2,2]));
  console.log('singleNumber([2,2,1]) =>', singleNumber([2,2,1]));
  console.log('majorityElement([3,2,3]) =>', majorityElement([3,2,3]));
  console.log('containsDuplicate([1,2,3,1]) =>', containsDuplicate([1,2,3,1]));
  console.log('productExceptSelf([1,2,3,4]) =>', productExceptSelf([1,2,3,4]));
  
  // Stack/String problems
  console.log('isValidParentheses("()[]{}") =>', isValidParentheses('()[]{}')); 
  console.log('longestCommonPrefix(["flower","flow","flight"]) =>', longestCommonPrefix(['flower','flow','flight']));
  
  // Math problems
  console.log('isHappy(19) =>', isHappy(19));
  console.log('climbStairs(5) =>', climbStairs(5));
  
  // Stock problem
  console.log('maxProfit([7,1,5,3,6,4]) =>', maxProfit([7,1,5,3,6,4]));
  
  // Array manipulation
  const dupArray = [1,1,2,2,2,3];
  console.log('removeDuplicates([1,1,2,2,2,3]) new length =>', removeDuplicates(dupArray));
  
  console.log('\n--- Additional 10 Advanced DSA Problems ---');
  
  // Advanced string problems
  console.log('lengthOfLongestSubstring("abcabcbb") =>', lengthOfLongestSubstring("abcabcbb"));
  console.log('validPalindrome("abca") =>', validPalindrome("abca"));
  console.log('groupAnagrams(["eat","tea","tan","ate","nat","bat"]) =>', groupAnagrams(["eat","tea","tan","ate","nat","bat"]));
  console.log('minWindow("ADOBECODEBANC", "ABC") =>', minWindow("ADOBECODEBANC", "ABC"));
  
  // Advanced array problems
  console.log('mergeIntervals([[1,3],[2,6],[8,10],[15,18]]) =>', mergeIntervals([[1,3],[2,6],[8,10],[15,18]]));
  console.log('threeSum([-1,0,1,2,-1,-4]) =>', threeSum([-1,0,1,2,-1,-4]));
  console.log('maxArea([1,8,6,2,5,4,8,3,7]) =>', maxArea([1,8,6,2,5,4,8,3,7]));
  console.log('subarraySum([1,1,1], 2) =>', subarraySum([1,1,1], 2));
  console.log('maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3) =>', maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3));
  console.log('trap([0,1,0,2,1,0,1,3,2,1,2,1]) =>', trap([0,1,0,2,1,0,1,3,2,1,2,1]));
}

if (require.main === module) {
  demo();
}

module.exports = {
  // Original 5
  distinct,
  twoSum,
  kadane,
  clockAngle,
  addWithoutPlus,
  // Additional 20
  reverseString,
  isPalindrome,
  firstNonRepeating,
  binarySearch,
  mergeSorted,
  findMissing,
  rotateArray,
  isValidParentheses,
  longestCommonPrefix,
  removeDuplicates,
  moveZeros,
  intersection,
  singleNumber,
  isHappy,
  climbStairs,
  maxProfit,
  majorityElement,
  containsDuplicate,
  productExceptSelf,
  isAnagram,
  // Additional 10 Advanced
  lengthOfLongestSubstring,
  validPalindrome,
  groupAnagrams,
  mergeIntervals,
  threeSum,
  maxArea,
  minWindow,
  subarraySum,
  maxSlidingWindow,
  trap,
};
