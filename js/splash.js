
/*************************************************************************************************/
/* Splash                                                                                        */
/*************************************************************************************************/

class Splash {
    constructor() {
        this.progress = 0;
        this.splash = document.getElementById('splash');
        this.loading = document.getElementById('splash-loading');
    }

    start() {
        this.splash.style.display = 'block';
    }

    end() {
        this.splash.style.display = 'none';
    }

    add(x) {
        this.set(this.progress + x);
    }

    set(value) {
        // console.log("set splash to", value);
        this.progress = value;
        this.loading.innerHTML = `Loading... ${value}%`
        if (value >= 100) {
            this.end();
        }
    }
};
