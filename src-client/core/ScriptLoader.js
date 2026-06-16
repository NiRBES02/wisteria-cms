// TODO: СМ. Main.js

class ScriptLoader {
  constructor() {
    this.loadedScripts = new Set();
    this.activeScripts = {
      navbar: new Set(),
      content: new Set(),
      footer: new Set()
    };
  }

  shouldLoad(newScripts, scriptType, currentUrl) {
    const active = this.activeScripts[scriptType];
    if (active.size === 0) return true;
    if (currentUrl && currentUrl !== window.location.href) return true;
    if (newScripts.length !== active.size) return true;

    for (const script of newScripts) {
      if (!active.has(script)) return true;
    }
    return false;
  }


  async load(scripts, scriptType = 'content') {
    this.remove(scriptType);

    const $area = document.createElement('div');
    $area.id = `scripts-${scriptType}`;
    $area.style.display = 'none';
    document.body.appendChild($area);

    const promises = scripts.map(src => {
      return new Promise(resolve => {
        if (this.loadedScripts.has(src) && this.activeScripts[scriptType].has(src)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        const cacheVersion = Date.now();
        script.src = src.includes('?') ? `${src}&v=${cacheVersion}` : `${src}?v=${cacheVersion}`;
        script.async = false;

        script.onload = () => {
          this.loadedScripts.add(src);
          this.activeScripts[scriptType].add(src);
          console.log(`%c[ScriptLoader] %cLoaded: %c${src}`, 'color: green; font-weight: bold;', 'color: sky;', 'color: sky; font-style: italic;');
          resolve();
        };

        script.onerror = () => {
          console.error(`%c[ScriptLoader] %cFailed: %c${src}`, 'color: green; font-weight: bold;', 'color: red;', 'color: sky; font-style: italic;');
          resolve();
        };

        $area.appendChild(script);
      });
    });

    await Promise.all(promises);
  }

  remove(scriptType) {
    const oldArea = document.getElementById(`scripts-${scriptType}`);
    if (oldArea) oldArea.remove();
    this.activeScripts[scriptType].clear();
  }
}

export default new ScriptLoader();
