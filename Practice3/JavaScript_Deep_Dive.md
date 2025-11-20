# JavaScript Deep Dive

## 1. Closures

### Explanation
A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. The inner function "closes over" the variables from the outer scope.

### Key Concepts
- **Lexical Scoping**: Functions are executed using the scope chain that was in effect when they were defined
- **Memory**: Closed-over variables are kept in memory
- **Privacy**: Used to create private variables

### Real-Time Example
**Shopping Cart**: When you add items to a cart, the cart remembers its items even after the initial function returns. The cart's internal state is private.

### Code Block
```javascript
// Basic Closure
function createCounter() {
  let count = 0; // Private variable
  
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getCount());   // 2
// count is NOT accessible directly - it's private!

// Real Interview Example: Function Factory
function createMultiplier(multiplier) {
  return function(number) {
    return number * multiplier;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15
```

---

## 2. Prototypes & Prototype Chain

### Explanation
Every JavaScript object has an internal link to another object called its prototype. When you try to access a property on an object, JavaScript first looks at the object itself, then walks up the prototype chain until it finds the property or reaches `null`.

### Key Concepts
- **`__proto__`**: Internal link to prototype (don't use directly)
- **`prototype`**: Property on constructor functions
- **Inheritance**: Objects inherit from other objects
- **Chain**: Object → Constructor.prototype → Object.prototype → null

### Real-Time Example
**Employee Hierarchy**: All employees inherit common methods (getName, getRole) from Employee.prototype, just like all employees in a company share common HR policies.

### Code Block
```javascript
// Constructor Function
function Person(name, age) {
  this.name = name;
  this.age = age;
}

// Adding method to prototype (shared across all instances)
Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

Person.prototype.species = 'Homo Sapiens';

const john = new Person('John', 30);
const jane = new Person('Jane', 25);

console.log(john.greet()); // "Hi, I'm John"
console.log(jane.species); // "Homo Sapiens"

// Prototype Chain
console.log(john.__proto__ === Person.prototype); // true
console.log(Person.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__); // null

// Inheritance with Prototypes
function Employee(name, age, role) {
  Person.call(this, name, age); // Call parent constructor
  this.role = role;
}

// Set up inheritance
Employee.prototype = Object.create(Person.prototype);
Employee.prototype.constructor = Employee;

Employee.prototype.work = function() {
  return `${this.name} is working as ${this.role}`;
};

const dev = new Employee('Alice', 28, 'Developer');
console.log(dev.greet());  // "Hi, I'm Alice" (inherited)
console.log(dev.work());   // "Alice is working as Developer"
```

---

## 3. Event Loop

### Explanation
JavaScript is single-threaded but can handle asynchronous operations through the event loop. The event loop constantly checks if the call stack is empty and moves tasks from the task queue to the call stack.

### Key Concepts
- **Call Stack**: Executes synchronous code (LIFO)
- **Web APIs**: Browser APIs (setTimeout, fetch, DOM events)
- **Microtask Queue**: Promises, queueMicrotask (higher priority)
- **Macrotask Queue**: setTimeout, setInterval, I/O
- **Execution Order**: Call Stack → Microtasks → Macrotasks

### Real-Time Example
**Restaurant Kitchen**: Chef (call stack) cooks orders one at a time. Urgent tickets (microtasks/promises) are handled before regular tickets (macrotasks/setTimeout).

### Code Block
```javascript
console.log('1: Sync start');

setTimeout(() => {
  console.log('2: Macrotask - setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('3: Microtask - Promise 1');
}).then(() => {
  console.log('4: Microtask - Promise 2');
});

console.log('5: Sync end');

// Output Order:
// 1: Sync start
// 5: Sync end
// 3: Microtask - Promise 1
// 4: Microtask - Promise 2
// 2: Macrotask - setTimeout

// Complex Example
console.log('Start');

setTimeout(() => console.log('Timeout 1'), 0);

Promise.resolve()
  .then(() => console.log('Promise 1'))
  .then(() => console.log('Promise 2'));

setTimeout(() => console.log('Timeout 2'), 0);

Promise.resolve().then(() => {
  console.log('Promise 3');
  setTimeout(() => console.log('Timeout inside Promise'), 0);
});

console.log('End');

// Output:
// Start
// End
// Promise 1
// Promise 3
// Promise 2
// Timeout 1
// Timeout 2
// Timeout inside Promise
```

---

## 4. Async/Await

### Explanation
`async/await` is syntactic sugar built on top of Promises that makes asynchronous code look and behave like synchronous code. An `async` function always returns a Promise, and `await` pauses execution until the Promise resolves.

### Key Concepts
- **async**: Makes function return Promise automatically
- **await**: Pauses execution, waits for Promise to resolve
- **Error Handling**: Use try/catch blocks
- **Sequential vs Parallel**: await in sequence is slower

### Real-Time Example
**API Calls**: Fetching user data, then their posts, then comments - each depends on the previous result. Like filling a form where the next field depends on the previous one.

### Code Block
```javascript
// Basic async/await
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Sequential (slow - 3 seconds total)
async function getDataSequential() {
  const user = await fetchUser();      // 1s
  const posts = await fetchPosts();    // 1s
  const comments = await fetchComments(); // 1s
  return { user, posts, comments };
}

// Parallel (fast - 1 second total)
async function getDataParallel() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);
  return { user, posts, comments };
}

// Real Interview Example: API with Retry Logic
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Async/await is syntactic sugar for:
function fetchUserOldWay(userId) {
  return fetch(`/api/users/${userId}`)
    .then(response => response.json())
    .then(user => user)
    .catch(error => {
      console.error('Error:', error);
      throw error;
    });
}
```

---

## 5. this Binding

### Explanation
The value of `this` is determined by HOW a function is called, not where it's defined. There are 4 binding rules: default, implicit, explicit, and new binding.

### Key Concepts
- **Default**: `this` = global object (or undefined in strict mode)
- **Implicit**: `this` = object before the dot
- **Explicit**: `call()`, `apply()`, `bind()` set `this` explicitly
- **new**: `this` = new object created
- **Arrow Functions**: Inherit `this` from parent scope (lexical)

### Real-Time Example
**Button Click Handler**: When a button is clicked, `this` usually refers to the button element. But in React class components, you need to bind methods so `this` refers to the component instance.

### Code Block
```javascript
// 1. Default Binding
function showThis() {
  console.log(this); // global object (window in browser) or undefined in strict mode
}
showThis();

// 2. Implicit Binding
const user = {
  name: 'Alice',
  greet: function() {
    console.log(`Hi, I'm ${this.name}`);
  }
};
user.greet(); // this = user object

const greetFn = user.greet;
greetFn(); // this = global (lost context!)

// 3. Explicit Binding
function introduce(greeting, punctuation) {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const person = { name: 'Bob' };

introduce.call(person, 'Hello', '!');   // Hello, I'm Bob!
introduce.apply(person, ['Hi', '.']);   // Hi, I'm Bob.

const boundIntroduce = introduce.bind(person, 'Hey');
boundIntroduce('!!!'); // Hey, I'm Bob!!!

// 4. new Binding
function Person(name) {
  this.name = name;
  this.greet = function() {
    console.log(`I'm ${this.name}`);
  };
}

const john = new Person('John');
john.greet(); // this = john object

// 5. Arrow Functions (Lexical this)
const obj = {
  name: 'React Component',
  regularFn: function() {
    setTimeout(function() {
      console.log(this.name); // undefined (this = global)
    }, 100);
  },
  arrowFn: function() {
    setTimeout(() => {
      console.log(this.name); // "React Component" (inherits this from parent)
    }, 100);
  }
};

obj.arrowFn(); // Works!

// Real Interview Example: Fix this issue
class Counter {
  constructor() {
    this.count = 0;
  }
  
  // Problem: loses 'this' context
  increment() {
    this.count++;
  }
  
  // Solution 1: Arrow function
  incrementArrow = () => {
    this.count++;
  }
  
  // Solution 2: Bind in constructor
  constructor() {
    this.count = 0;
    this.increment = this.increment.bind(this);
  }
}

const counter = new Counter();
const incrementFn = counter.increment;
incrementFn(); // Error without binding
```

---

## 6. Modules (ES6)

### Explanation
Modules allow you to split code into separate files and import/export functionality between them. Each module has its own scope, preventing global namespace pollution.

### Key Concepts
- **Named Exports**: Multiple exports per file `export const x = 5`
- **Default Exports**: One main export per file `export default MyClass`
- **Import**: `import { x } from './module'`
- **Module Scope**: Variables are private by default

### Real-Time Example
**Microservices**: Just like backend services are split into separate APIs, frontend code is split into modules (auth module, user module, payment module).

### Code Block
```javascript
// --- utils.js ---
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;

export function multiply(a, b) {
  return a * b;
}

const SECRET_KEY = 'private'; // Not exported, private to module

export default function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

// --- main.js ---
// Named imports
import { add, subtract, multiply } from './utils.js';

// Default import (can rename)
import divide from './utils.js';

// Import everything
import * as MathUtils from './utils.js';

console.log(add(5, 3));          // 8
console.log(MathUtils.add(5, 3)); // 8
console.log(divide(10, 2));      // 5

// --- userService.js ---
class UserService {
  constructor() {
    this.users = [];
  }
  
  addUser(user) {
    this.users.push(user);
  }
  
  getUsers() {
    return this.users;
  }
}

export default new UserService(); // Singleton pattern

// --- app.js ---
import userService from './userService.js';

userService.addUser({ name: 'Alice' });
console.log(userService.getUsers());

// Dynamic Imports (lazy loading)
async function loadModule() {
  const module = await import('./heavyModule.js');
  module.doSomething();
}

// CommonJS (Node.js) vs ES6 Modules
// CommonJS:
// const express = require('express');
// module.exports = myFunction;

// ES6:
// import express from 'express';
// export default myFunction;
```

---

## 7. Classes (ES6)

### Explanation
Classes are syntactic sugar over JavaScript's prototype-based inheritance. They provide a cleaner syntax for creating objects and handling inheritance.

### Key Concepts
- **Constructor**: Initialize instance properties
- **Methods**: Functions defined on the class
- **Inheritance**: `extends` keyword
- **super**: Call parent class constructor/methods
- **Static**: Class-level methods/properties

### Real-Time Example
**User Management System**: Base User class with common properties, then extend to Admin, Customer, Guest with specific behaviors.

### Code Block
```javascript
// Basic Class
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }
  
  // Instance method
  greet() {
    return `Hello, I'm ${this.name}`;
  }
  
  // Getter
  get displayName() {
    return this.name.toUpperCase();
  }
  
  // Setter
  set displayName(value) {
    this.name = value.trim();
  }
  
  // Static method (called on class, not instance)
  static compareUsers(user1, user2) {
    return user1.createdAt - user2.createdAt;
  }
}

const user = new User('Alice', 'alice@email.com');
console.log(user.greet());        // Hello, I'm Alice
console.log(user.displayName);    // ALICE
console.log(User.compareUsers(user1, user2));

// Inheritance
class Admin extends User {
  constructor(name, email, permissions) {
    super(name, email); // Call parent constructor
    this.permissions = permissions;
    this.role = 'admin';
  }
  
  // Override method
  greet() {
    return `${super.greet()}. I'm an admin!`;
  }
  
  // New method
  grantPermission(userId, permission) {
    console.log(`Granting ${permission} to user ${userId}`);
  }
}

const admin = new Admin('Bob', 'bob@email.com', ['read', 'write', 'delete']);
console.log(admin.greet());  // Hello, I'm Bob. I'm an admin!
admin.grantPermission(123, 'write');

// Private Fields (ES2022)
class BankAccount {
  #balance = 0; // Private field
  
  constructor(initialBalance) {
    this.#balance = initialBalance;
  }
  
  deposit(amount) {
    if (amount > 0) {
      this.#balance += amount;
    }
  }
  
  getBalance() {
    return this.#balance;
  }
  
  // Private method
  #calculateInterest() {
    return this.#balance * 0.05;
  }
}

const account = new BankAccount(1000);
account.deposit(500);
console.log(account.getBalance()); // 1500
// console.log(account.#balance);  // SyntaxError: Private field

// Real Interview Example: Observable Pattern
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
  
  off(event, listenerToRemove) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(
        listener => listener !== listenerToRemove
      );
    }
  }
}

const emitter = new EventEmitter();
const callback = (data) => console.log('Received:', data);

emitter.on('message', callback);
emitter.emit('message', 'Hello!'); // Received: Hello!
emitter.off('message', callback);
```

---

## Bonus: var vs let vs const

### Explanation
- **var**: Function-scoped, hoisted, can redeclare
- **let**: Block-scoped, hoisted (TDZ), cannot redeclare
- **const**: Block-scoped, hoisted (TDZ), cannot redeclare or reassign

### Code Block
```javascript
// var - Function scoped
function testVar() {
  var x = 1;
  if (true) {
    var x = 2; // Same variable
    console.log(x); // 2
  }
  console.log(x); // 2
}

// let - Block scoped
function testLet() {
  let x = 1;
  if (true) {
    let x = 2; // Different variable
    console.log(x); // 2
  }
  console.log(x); // 1
}

// Hoisting
console.log(a); // undefined (hoisted but not initialized)
var a = 5;

console.log(b); // ReferenceError: Cannot access before initialization (TDZ)
let b = 5;

// const
const arr = [1, 2, 3];
arr.push(4);     // OK (mutating is allowed)
arr = [5, 6];    // Error (reassignment not allowed)
```

---

## 8. Generators and Iterators

### Explanation
Generators are functions that can pause and resume execution. They produce a sequence of values over time rather than all at once. Useful for handling infinite sequences or lazy evaluation.

### Key Concepts
- **Generator Function**: Defined with `function*` syntax
- **yield**: Pauses execution and returns a value
- **Iterator Protocol**: Objects with `next()` method
- **Lazy Evaluation**: Values computed only when needed

### Real-Time Example
**Pagination**: Loading pages one at a time instead of loading all data at once. Generator yields one page, waits for user action, then yields next page.

### Code Block
```javascript
// Basic Generator
function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }

// Infinite Sequence
function* idGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const ids = idGenerator();
console.log(ids.next().value); // 1
console.log(ids.next().value); // 2
// Can generate IDs forever without storing all in memory!

// Real Interview Example: Paginated Data Fetcher
function* fetchPages(url, pageSize) {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const data = yield fetch(`${url}?page=${page}&size=${pageSize}`);
    hasMore = data.length === pageSize;
    page++;
  }
}

// Usage
const pageFetcher = fetchPages('/api/users', 20);
const page1 = await pageFetcher.next().value;
const page2 = await pageFetcher.next().value;
```

**Why Use Generators:**
- Memory efficient (lazy evaluation)
- Handle infinite sequences
- Implement custom iteration logic
- Pause/resume async operations

---

## 9. Symbols and Well-Known Symbols

### Explanation
Symbols are unique, immutable primitive values used as object property keys. They prevent name collisions and enable meta-programming.

### Key Concepts
- **Unique**: Every Symbol is unique, even with same description
- **Hidden**: Not enumerable in for...in loops
- **Well-Known Symbols**: Built-in symbols for customizing behavior

### Real-Time Example
**Private Properties**: Use symbols to create properties that won't conflict with other code or show up in object listings.

### Code Block
```javascript
// Basic Symbol
const sym1 = Symbol('description');
const sym2 = Symbol('description');
console.log(sym1 === sym2); // false - each is unique

// Symbol as Object Key
const PASSWORD = Symbol('password');
const user = {
  username: 'john',
  [PASSWORD]: 'secret123'  // Hidden from normal access
};

console.log(user.username);    // 'john'
console.log(user[PASSWORD]);   // 'secret123'
console.log(Object.keys(user)); // ['username'] - Symbol not listed!

// Well-Known Symbol: Symbol.iterator
const range = {
  from: 1,
  to: 5,
  
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    
    return {
      next() {
        if (current <= last) {
          return { value: current++, done: false };
        }
        return { done: true };
      }
    };
  }
};

// Now object is iterable
for (const num of range) {
  console.log(num); // 1, 2, 3, 4, 5
}

// Symbol.toStringTag - Custom class name
class MyClass {
  get [Symbol.toStringTag]() {
    return 'MyCustomClass';
  }
}

const instance = new MyClass();
console.log(instance.toString()); // [object MyCustomClass]
```

**Common Well-Known Symbols:**
- `Symbol.iterator` - Make object iterable
- `Symbol.toStringTag` - Customize toString()
- `Symbol.hasInstance` - Customize instanceof
- `Symbol.toPrimitive` - Customize type conversion

---

## 10. WeakMap and WeakSet

### Explanation
WeakMap and WeakSet are collections that hold "weak" references to objects. If no other references exist, the object can be garbage collected.

### Key Concepts
- **Weak References**: Don't prevent garbage collection
- **Keys Must Be Objects**: Can't use primitives
- **No Iteration**: Can't list keys/values
- **Automatic Cleanup**: Removed when object is GC'd

### Real-Time Example
**Caching DOM Elements**: Store data about DOM nodes. When node is removed from DOM, cache automatically cleans up.

### Code Block
```javascript
// WeakMap Example
const cache = new WeakMap();

function processElement(element) {
  if (cache.has(element)) {
    return cache.get(element);
  }
  
  const result = expensiveComputation(element);
  cache.set(element, result);
  return result;
}

let div = document.createElement('div');
processElement(div); // Cached

div = null; // Cache entry automatically removed by GC!

// Real Interview Example: Private Data
const privateData = new WeakMap();

class User {
  constructor(name, password) {
    this.name = name;
    // Store password privately
    privateData.set(this, { password });
  }
  
  authenticate(password) {
    return privateData.get(this).password === password;
  }
}

const user = new User('john', 'secret');
console.log(user.name);             // 'john'
console.log(user.password);         // undefined - not accessible!
console.log(user.authenticate('secret')); // true

// WeakSet Example: Track Processed Items
const processed = new WeakSet();

function processOnce(obj) {
  if (processed.has(obj)) {
    console.log('Already processed');
    return;
  }
  
  // Process object
  console.log('Processing...');
  processed.add(obj);
}

let item = { id: 1 };
processOnce(item); // 'Processing...'
processOnce(item); // 'Already processed'
```

**When to Use:**
- WeakMap: Attach metadata to objects without preventing GC
- WeakSet: Track objects without keeping them alive
- Both: Memory-sensitive applications

---

## 11. Proxy and Reflect

### Explanation
Proxy creates a wrapper around an object that intercepts operations. Reflect provides methods for intercepted operations. Together they enable meta-programming.

### Key Concepts
- **Proxy Traps**: Intercept get, set, delete, etc.
- **Reflect**: Performs default operations
- **Validation**: Add validation logic to object operations
- **Logging**: Track property access

### Real-Time Example
**Form Validation**: Automatically validate when form fields are set. Track which fields were accessed.

### Code Block
```javascript
// Basic Proxy
const handler = {
  get(target, property) {
    console.log(`Getting ${property}`);
    return target[property];
  },
  
  set(target, property, value) {
    console.log(`Setting ${property} to ${value}`);
    target[property] = value;
    return true;
  }
};

const obj = { name: 'John' };
const proxy = new Proxy(obj, handler);

proxy.name;        // Logs: Getting name
proxy.age = 30;    // Logs: Setting age to 30

// Real Interview Example: Validation Proxy
function createValidatedUser(userData) {
  return new Proxy(userData, {
    set(target, property, value) {
      // Validate email
      if (property === 'email' && !value.includes('@')) {
        throw new Error('Invalid email');
      }
      
      // Validate age
      if (property === 'age' && (value < 0 || value > 150)) {
        throw new Error('Invalid age');
      }
      
      target[property] = value;
      return true;
    }
  });
}

const user = createValidatedUser({});
user.name = 'John';           // OK
user.email = 'john@test.com'; // OK
user.email = 'invalid';       // Error: Invalid email
user.age = 200;               // Error: Invalid age

// Negative Array Indexing
function createArray(arr) {
  return new Proxy(arr, {
    get(target, property) {
      const index = Number(property);
      if (index < 0) {
        // Python-style negative indexing
        return target[target.length + index];
      }
      return Reflect.get(target, property);
    }
  });
}

const arr = createArray([1, 2, 3, 4, 5]);
console.log(arr[-1]); // 5 (last element)
console.log(arr[-2]); // 4 (second last)

// Observable Object (React-like)
function observable(obj, callback) {
  return new Proxy(obj, {
    set(target, property, value) {
      const oldValue = target[property];
      target[property] = value;
      callback(property, oldValue, value);
      return true;
    }
  });
}

const state = observable({ count: 0 }, (prop, oldVal, newVal) => {
  console.log(`${prop} changed from ${oldVal} to ${newVal}`);
});

state.count = 5;  // Logs: count changed from 0 to 5
```

**Common Proxy Traps:**
- `get` - Property access
- `set` - Property assignment
- `deleteProperty` - delete operator
- `has` - in operator
- `apply` - Function call
- `construct` - new operator

---

## 12. Memory Management and Garbage Collection

### Explanation
JavaScript automatically manages memory through garbage collection. Understanding this helps avoid memory leaks and optimize performance.

### Key Concepts
- **Garbage Collection**: Automatic memory management
- **Reachability**: Objects kept if reachable from root
- **Mark-and-Sweep**: GC algorithm used by V8
- **Memory Leaks**: References preventing GC

### Real-Time Example
**SPA Memory Leaks**: Single Page Apps can leak memory if event listeners aren't removed or closures keep references to large objects.

### Common Memory Leaks

```javascript
// 1. Global Variables
function leak() {
  accidentalGlobal = 'This is global!'; // No var/let/const
  // Stays in memory forever!
}

// 2. Event Listeners Not Removed
function setupButton() {
  const button = document.getElementById('btn');
  button.addEventListener('click', function() {
    console.log('Clicked');
  });
  // If button removed from DOM but listener not removed,
  // button stays in memory!
}

// Fix: Remove listener
function setupButtonFixed() {
  const button = document.getElementById('btn');
  const handler = () => console.log('Clicked');
  button.addEventListener('click', handler);
  
  // Cleanup function
  return () => button.removeEventListener('click', handler);
}

// 3. Closures Keeping Large Objects
function createHandler() {
  const largeData = new Array(1000000).fill('data');
  
  return function() {
    console.log('Handler called');
    // Even though largeData not used, it's kept in closure!
  };
}

// Fix: Don't capture unnecessary variables
function createHandlerFixed() {
  const largeData = new Array(1000000).fill('data');
  const needed = largeData[0]; // Extract only what's needed
  
  return function() {
    console.log('Handler called', needed);
    // Now largeData can be GC'd
  };
}

// 4. Timers Not Cleared
function startTimer() {
  const data = { large: new Array(1000000) };
  
  setInterval(() => {
    console.log(data.large.length);
  }, 1000);
  // Interval keeps running and data in memory forever!
}

// Fix: Clear interval
function startTimerFixed() {
  const data = { large: new Array(1000000) };
  
  const intervalId = setInterval(() => {
    console.log(data.large.length);
  }, 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
```

**Best Practices:**
- Set variables to `null` when done
- Remove event listeners in cleanup
- Clear intervals/timeouts
- Use WeakMap/WeakSet for caches
- Monitor memory in DevTools

---

## Interview Tips

1. **Always explain with real-world examples** (shopping cart, restaurant, etc.)
2. **Draw diagrams** for event loop and prototype chain
3. **Mention memory implications** of closures
4. **Compare old vs new** (callbacks vs promises vs async/await)
5. **Discuss trade-offs** (sequential vs parallel async operations)
6. **Generators**: Explain lazy evaluation benefits
7. **Symbols**: Show use case for private properties
8. **Proxy**: Demonstrate validation or logging use case
9. **Memory**: Identify common leak patterns
10. **Performance**: Discuss when to optimize vs premature optimization
