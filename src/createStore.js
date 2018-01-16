import $$observable from 'symbol-observable'

function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

export default function createStore(reducer, initialState, enhancer) {
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
    enhancer = initialState
    initialState = undefined
  }

  let currentReducer = reducer
  let currentState = initialState || currentReducer(undefined, {})
  let listeners = {}
  let isDispatching = false

  if (enhancer !== undefined) {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    return enhancer(createStore)(currentReducer, initialState)
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
        'If you would like to be notified after the store has been updated, subscribe from a ' +
        'component and invoke store.getState() in the callback to access the latest state. ' +
        'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
      )
    }
    let key = Date.now() * Math.random()
    listeners[key] = listener
    return function subscribe() {
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
          'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
        )
      }
      delete listeners[key]
    }
  }

  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
        'The reducer has already received the state as an argument. ' +
        'Pass it down from the top reducer instead of reading it from the store.'
      )
    }
    return currentState
  }

  return {
    subscribe,
    dispatch: (action) => {
      if (!isPlainObject(action))
        throw new Error(
          'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
        )

      if (typeof action.type === 'undefined') {
        throw new Error(
          'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
        )
      }

      if (isDispatching) {
        throw new Error('Reducers may not dispatch actions.')
      }

      try {
        isDispatching = true
        currentState = currentReducer(currentState, action)
      } finally {
        isDispatching = false
      }

      function dispatching(fn) {
        return () => {
          fn()
        }
      }

      let fns = Object.keys(listeners).map((key) => {
        return dispatching(listeners[key])
      })

      fns.forEach((fn) => fn())
    },
    getState,
    replaceReducer: (nextReducer) => {
      if (typeof nextReducer !== 'function') {
        throw new Error('Expected the nextReducer to be a function.')
      }
      currentReducer = nextReducer
    },
    [$$observable]: function observable() {
      const outerSubscribe = subscribe
      return {
        subscribe(observer) {
          if (typeof observer !== 'object') {
            throw new TypeError('Expected the observer to be an object.')
          }

          function observeState() {
            if (observer.next) {
              observer.next(getState())
            }
          }

          observeState()
          const unsubscribe = outerSubscribe(observeState)
          return {unsubscribe}
        },

        [$$observable]() {
          return this
        }
      }
    }
  }
}
