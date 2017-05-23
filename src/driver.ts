import 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import * as firebase from 'firebase'
import { Action, makeActionHandler } from './actions'
import { Stream } from 'xstream'

export interface ActionResponse {
  name?: string
  stream: Stream<any>
}

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  messagingSenderId: string
  projectId: string
  storageBucket: string
}

export interface FirebaseDatabaseSource {
  ref: (path: string) => FirebaseReferenceSource
}

export interface FirebaseReferenceSource {
  child: (path: string) => FirebaseReferenceSource
  value: Stream<any>
}

export interface FirebaseSource {
  database: FirebaseDatabaseSource
}

type FirebaseDriver = (action$: Stream<Action>) => FirebaseSource

export function makeFirebaseDriver (
  config: FirebaseConfig,
  appName: string
): FirebaseDriver {
  const app = firebase.initializeApp(config, appName)
  const auth = app.auth()
  const db = app.database()
  const handleAction = makeActionHandler(app)

  function firebaseDriver (action$: Stream<Action>): FirebaseSource {
    const response$: Stream<ActionResponse> = action$
      .map(action => ({ name: action.name, stream: handleAction(action) }))
    response$.addListener({
      complete: () => {},
      error: () => {},
      next: () => {}
    })

    const firebaseSource = {
      auth: {
        authState: Stream.create({
          start: listener => {
            auth.onAuthStateChanged(
              (nextOrObserver: (Function | object)) => {
                listener.next(nextOrObserver)
              },
              err => { listener.error(err) },
              () => { listener.complete() }
            )
          },
          stop: () => {}
        }),
        idToken: Stream.create({
          start: listener => {
            auth.onIdTokenChanged(
              (nextOrObserver: (Function | object)) => {
                listener.next(nextOrObserver)
              },
              err => { listener.error(err) },
              () => { listener.complete() }
            )
          },
          stop: () => {}
        }),
        providersForEmail: (email: string) => Stream.create({
          start: listener => {
            auth.fetchProvidersForEmail(email)
              .catch(err => { listener.error(err) })
              .then(providers => { listener.next(providers) })
          },
          stop: () => {}
        }),
        redirectResult: Stream.create({
          start: listener => {
            auth.getRedirectResult()
              .catch(err => { listener.error(err) })
              .then(result => { listener.next(result) })
          },
          stop: () => {}
        })
      },
      database: {
        ref: (path: string) => ({
          child: (childPath: string) => {
            const fullPath = [path, childPath].join('/').replace(/\/\//g, '')
            return firebaseSource.database.ref(fullPath)
          },
          value: Stream.create({
            start: listener => {
              db.ref(path).on('value', snapshot => {
                if (snapshot !== null) {
                  listener.next(snapshot.val())
                }
              })
            },
            stop: () => {
              db.ref(path).off('value')
            }
          })
        })
      },
      responses: (responseName: string) => (
        response$
          .filter(response => response.name === responseName)
          .map(response => response.stream)
          .flatten()
      )
    }

    return firebaseSource
  }

  return firebaseDriver
}