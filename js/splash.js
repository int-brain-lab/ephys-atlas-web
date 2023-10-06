export { Splash };



/*************************************************************************************************/
/* Splash                                                                                        */
/*************************************************************************************************/

class Splash {
    constructor(description) {
        this.progress = 0;
        this.total = 0;
        this.splash = document.getElementById('splash');
        this.loading = document.querySelector('#splash-loading span.progress');
        this.elDescription = document.getElementById('splash-description');
        this.description = description;
    }

    addTotal(total) {
        this.total += total;
    }

    setTotal(total) {
        this.total = total;
    }

    setLoading(is_loading) {
        this.splash.style.display = is_loading ? 'block' : 'none';
    }

    setDescription(description) {
        this.description = description;
    }

    start() {
        this.set(0);
    }

    end() {
        console.assert(this.total > 0);
        this.set(this.total);
    }

    add(x) {
        this.set(this.progress + x);
    }

    set(value) {
        if (!this.total) {
            console.error("you need to call addTotal() at least once");
            return;
        }

        // Set the progress value.
        this.progress = value;

        // Update the splash loading percentage.
        this.elDescription.innerHTML = this.description;
        this.loading.innerHTML = (100 * value / this.total).toFixed(1);

        // Display or hide the loading splash.
        this.setLoading(value < this.total);
    }
};
