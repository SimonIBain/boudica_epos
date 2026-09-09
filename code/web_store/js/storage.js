
/** This module handles teh local storage */

const Storage = () => {
  const clear = () => {}

  const getItem = key => {
    return localStorage.getItem(key);
  }

  const removeItem = key => {
    localStorage.removeItem(key);
  }

  const setItem = (key, value) => {
    localStorage.setItem(key, value);
  }

  return {
    clear,
    getItem,
    removeItem,
    setItem,
  }
}
export default Storage;