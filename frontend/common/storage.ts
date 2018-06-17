// storage.tsx - Local storage of UI state, so things
// stay consistent across uses

interface UIState {
  showHiddenProjects: boolean;
}

export let uiState: UIState = {
  showHiddenProjects: false,
};

export const fetchStoredUIState = () => {
  const state = window.localStorage.getItem('UIState');

  if (state === null) {
    window.localStorage.setItem('UIState', JSON.stringify(uiState));

    console.log(uiState);

    return uiState;
  }

  return JSON.parse(state);
};

export const storeUIState = (updates: Partial<UIState>) => {
  const state = fetchStoredUIState();

  const newState = { ...state, ...updates };

  uiState = newState;

  window.localStorage.setItem('UIState', JSON.stringify(newState));

  return newState;
};
