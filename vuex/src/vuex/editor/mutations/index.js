import * as types from '../mutation-types'

const mutations = {
  // increment (state, item) {
  //   state.count += item.num
  // },
  [types.INCREMENT_COUNT] (state, item) {
    state.count += item.num
  },
  [types.CHANGE_LAYER_ZINDEX] (state, dir, index) {
  },
  [types.DEL_LAYER] (state, index) {
  },
  [types.REMOVE_FROM_ARR] (state, arr, itemToRemove) {
  },
  [types.ADD_TO_ARR] (state, arr, itemToAdd) {
  },
  [types.DEL_SCENE] (state, index) {
  }
}

export default mutations
