# @joshforisha/cycle-firebase&ensp;[![build](https://img.shields.io/travis/joshforisha/cycle-firebase.svg?maxAge=2592000?style=flat-square)](https://travis-ci.org/joshforisha/cycle-firebase)

A [Firebase v3](https://firebase.google.com/) driver for [Cycle.js](http://cycle.js.org).

## API

* [`firebaseActions`](#firebaseActions)
* [`makeFirebaseDriver`](#makeFirebaseDriver)

### <a id="firebaseActions">firebaseActions</a>

This object contains the following action functions:

* [`createUserWithEmailAndPassword`](#firebaseActions.createUserWithEmailAndPassword)
* [`set`](#firebaseActions.set)
* [`signInWithEmailAndPassword`](#firebaseActions.signInWithEmailAndPassword)
* [`signOut`](#firebaseActions.signOut)

#### <a id="firebaseActions.createUserWithEmailAndPassword"></a> `firebaseActions.createUserWithEmailAndPassword(email, password)`

Informs the driver to call Firebase's [`auth.createUserWithEmailAndPassword()`](https://firebase.google.com/docs/reference/js/firebase.auth.Auth#createUserWithEmailAndPassword). Any errors generated by this call are emitted on the [`error$`](#error$).

```js
const sinks = {
  firebase: xs.of(firebaseActions.createUserWithEmailAndPassword('test@example.com', 'password'))
}
```

#### <a id="firebaseActions.set"></a> `firebaseActions.set(path, value)`

Informs the driver to call Firebase's [`database.ref().set()`](https://firebase.google.com/docs/database/web/save-data). Any errors generated by this call are emitted on the [`error$`](#error$).

```js
const sinks = {
  firebase: xs.of(firebaseActions.set('ref/path', 'test')
}
```

#### <a id="firebaseActions.signInWithEmailAndPassword"></a> `firebaseActions.signInWithEmailAndPassword(email, password)`

Informs the driver to call Firebase's [`auth.signInWithEmailAndPassword()`](https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signInWithEmailAndPassword). Any errors generated by this call are emitted on the [`error$`](#error$).

```js
const sinks = {
  firebase: xs.of(firebaseActions.signInWithEmailAndPassword('test@example.com', 'password'))
}
```

#### <a id="firebaseActions.signOut"></a> `firebaseActions.signOut()`

Informs the driver to call Firebase's [`auth.signOut()`](https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signOut). Any errors generated by this call are emitted on the [`error$`](#error$).

```js
const sinks = {
  firebase: xs.of(firebaseActions.signOut())
}
```

### <a id="makeFirebaseDriver"></a> `makeFirebaseDriver(options, name)`

Initializes a connection to a Firebase database by calling [`initializeApp()`](https://firebase.google.com/docs/reference/js/firebase#.initializeApp) with the same arguments, returning the effective Firebase source object, which contains the following:

* [`currentUser$`](#currentUser$)
* [`get()`](#get)
* [`error$`](#error$)

#### <a id="currentUser$"></a> `currentUser$`

A stream of the "current user" value as returned from observing Firebase's [`auth.onAuthStateChanged()`](https://firebase.google.com/docs/reference/js/firebase.auth.Auth#onAuthStateChanged).

```js
function main ({ firebase }) {
  firebase.currentUser$.addListener({
    next: currentUser => console.log('Currently logged in as:', currentUser),
    ...
  })

  ...
}
```

#### <a id="get"></a> `get(path)`

Returns a stream of the ref's _value_ at `path`, by utilizing Firebase's [`database.ref(path).on('value')`](https://firebase.google.com/docs/reference/js/firebase.database.Reference#on).

```js
function main ({ firebase }) {
  const testUser$ = firebase.get('users/test')
  testUser$.addListener({
    next: testUser => console.log('Test user value:', testUser),
    ...
  })

  ...
}
```

#### <a id="error$"></a> `error$`

A stream of errors generated by the defined [firebaseActions](#firebaseActions). Each error is a [`firebase.auth.Error](https://firebase.google.com/docs/reference/js/firebase.auth.Error).

```js
function main ({ firebase }) {
  firebase.error$.addListener({
    next: err => console.error('Firebase error:', err),
    ...
  })

  ...
}
```

