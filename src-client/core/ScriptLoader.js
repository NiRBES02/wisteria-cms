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

  shouldLoad(newScripts, scriptType, htmlChanged) {
    const active = this.activeScripts[scriptType];
    if (htmlChanged) return true;
    if (active.size === 0) return true;
    if (newScripts.length !== active.size) return true;

    for (const script of newScripts) {
      if (!active.has(script)) return true;
    }

    return false;
  }



  resetActiveScripts() {
    this.activeScripts.navbar.clear();
    this.activeScripts.content.clear();
    this.activeScripts.footer.clear();
  }



  async load(scripts, scriptType = 'content') {
    this.remove(scriptType);

    const $area = document.createElement('div');
    $area.id = `scripts-${scriptType}`;
    $area.style.display = 'none';
    document.body.appendChild($area);

    const promises = scripts.map(src => {
      return new Promise(resolve => {
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
