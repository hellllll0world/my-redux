export default function combineReducers(reducers) {
  return (state, action) => {
    let currentState = state || {}
    let nextState = currentState

    Object.keys(reducers).forEach((key) => {
      nextState[key] = reducers[key](currentState[key], action)
    })

    return nextState
  }
}
