export { Splash };



/*************************************************************************************************/
/* Splash                                                                                        */
/*************************************************************************************************/

class Splash {
    constructor() {
        this.progress = 0;
        this.splash = document.getElementById('splash');
        this.loading = document.querySelector('#splash-loading span.progress');
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
        this.progress = value;
        this.loading.innerHTML = value.toString();
        if (value >= 100) {
            this.end();
        }
    }
};
