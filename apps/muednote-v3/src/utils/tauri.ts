// Tauri API wrapper for Web compatibility
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const tauriListen = async (event: string, handler: (event: any) => void) => {
  if (isTauri()) {
    const { listen } = await import('@tauri-apps/api/event');
    return listen(event, handler);
  }
  // Return a dummy unlisten function for web
  return Promise.resolve(() => {});
};

export const tauriInvoke = async (cmd: string, args?: any) => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
  }
  // Return a dummy response for web
  console.warn(`Tauri invoke "${cmd}" called in web context`);
  return Promise.resolve(null);
};