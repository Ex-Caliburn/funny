import * as types from '../mutation-types'

export function delLayer ({ dispatch }, index) {
  dispatch(types.DEL_LAYER, index)
}

export function delScene ({ dispatch }, index) {
  dispatch(types.DEL_SCENE, index)
}

export function removeFromArr ({ dispatch }, arr, itemToRemove) {
  dispatch(types.REMOVE_FROM_ARR, arr, itemToRemove)
}

export function addToArr ({ dispatch }, arr, itemToAdd) {
  dispatch(types.ADD_TO_ARR, arr, itemToAdd)
}

export function incrementCount ({commit}, item) {
  commit(types.INCREMENT_COUNT, item)
}
