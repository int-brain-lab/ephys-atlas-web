module.exports = {
    js2svg: {
        indent: 2, // string with spaces or number of spaces. 4 by default
        pretty: true, // boolean, false by default
    },
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    removeDoctype: false,
                    inlineStyles: false,
                    mergeStyles: true,
                },
            }
        },
        {
            name: "removeAttrs",
            params: {
                attrs: "clip-path|style"
            }
        }
    ],
};
