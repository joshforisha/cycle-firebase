import 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import * as firebase from 'firebase';
import { Action, makeActionHandler } from './actions';
import { Listener, MemoryStream, Stream } from 'xstream';

export interface ActionResponse {
  name?: string;
  stream: Stream<any>;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
}

interface ReferenceSource {
  child: (path: string) => ReferenceSource;
  events: EventLookup;
  value: MemoryStream<any>;
}

export interface FirebaseSource {
  auth: {
    authState: MemoryStream<firebase.User | null>;
    currentUser: MemoryStream<firebase.User | null>;
    idToken: MemoryStream<firebase.User | null>;
    providersForEmail: (email: string) => MemoryStream<string[]>;
    redirectResult: MemoryStream<firebase.auth.UserCredential>;
  };
  database: {
    ref: (path: string) => ReferenceSource;
    refFromURL: (url: string) => ReferenceSource;
  };
  responses: (name: string) => Stream<any>;
}

type EventLookup = (eventType: string) => MemoryStream<any>;

type FirebaseDriver = (action$: Stream<Action>) => FirebaseSource;

export function makeFirebaseDriver(
  config: FirebaseConfig,
  appName: string
): FirebaseDriver {
  const app = firebase.initializeApp(config, appName);
  const auth = app.auth();
  const db = app.database();
  const handleAction = makeActionHandler(app);

  function firebaseDriver(action$: Stream<Action>): FirebaseSource {
    const response$: Stream<ActionResponse> = action$.map(action => ({
      name: action.name,
      stream: handleAction(action)
    }));

    response$.addListener({});

    const firebaseSource = {
      auth: {
        authState: Stream.createWithMemory({
          start: (listener: Listener<firebase.User | null>) => {
            auth.onAuthStateChanged(
              (user: firebase.User) => {
                listener.next(user);
              },
              err => {
                listener.error(err);
              },
              () => {
                listener.complete();
              }
            );
          },
          stop: () => null
        }),

        currentUser: Stream.createWithMemory({
          start: (listener: Listener<firebase.User | null>) => {
            let currentUser: firebase.User | null = null;
            auth.onIdTokenChanged(
              (_user: firebase.User) => {
                if (auth.currentUser !== currentUser) {
                  currentUser = auth.currentUser;
                  listener.next(currentUser);
                }
              },
              err => {
                listener.error(err);
              },
              () => {
                listener.complete();
              }
            );
          },
          stop: () => null
        }),

        idToken: Stream.createWithMemory({
          start: (listener: Listener<firebase.User | null>) => {
            auth.onIdTokenChanged(
              (user: firebase.User) => {
                listener.next(user);
              },
              err => {
                listener.error(err);
              },
              () => {
                listener.complete();
              }
            );
          },
          stop: () => null
        }),

        providersForEmail: (email: string) =>
          Stream.createWithMemory({
            start: (listener: Listener<string[]>) => {
              auth
                .fetchProvidersForEmail(email)
                .catch(err => {
                  listener.error(err);
                })
                .then(providers => {
                  listener.next(providers);
                });
            },
            stop: () => null
          }),

        redirectResult: Stream.createWithMemory({
          start: (listener: Listener<firebase.auth.UserCredential>) => {
            auth
              .getRedirectResult()
              .catch(err => {
                listener.error(err);
              })
              .then(result => {
                listener.next(result);
              });
          },
          stop: () => null
        })
      },

      database: {
        ref: (path: string) => sourceReference(db.ref(path)),

        refFromURL: (url: string) => sourceReference(db.refFromURL(url))
      },

      responses: (responseName: string) =>
        response$
          .filter(response => response.name === responseName)
          .map(response => response.stream)
          .flatten()
    };

    return firebaseSource;
  }

  return firebaseDriver;
}

function makeReferenceEventsCallback(
  listener: Listener<any>
): (snapshot: firebase.database.DataSnapshot) => void {
  return (snapshot: firebase.database.DataSnapshot) => {
    if (snapshot !== null) {
      listener.next(snapshot.val());
    }
  };
}

function refEvents(ref: firebase.database.Reference): EventLookup {
  return (eventType: string) => {
    let callback: (
      a: firebase.database.DataSnapshot | null,
      b?: string | undefined
    ) => any;

    return Stream.createWithMemory({
      start: listener => {
        callback = makeReferenceEventsCallback(listener);
        ref.on(eventType, callback);
      },

      stop: () => {
        ref.off(eventType, callback);
      }
    });
  };
}

function sourceReference(dbRef: firebase.database.Reference): ReferenceSource {
  const events: EventLookup = refEvents(dbRef);

  return {
    child: (path: string) => sourceReference(dbRef.child(path)),
    events: events,
    value: events('value')
  };
}
