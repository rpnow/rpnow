/**
 * This is loaded by the express-vue module to populate the <head> tag of the
 * generated HTML documents
 * 
 * See https://github.com/express-vue/express-vue#meta
 */
module.exports = {
    metas: [
        { charset:'utf-8' },

        { name:"viewport", content:"width=device-width, initial-scale=1, maximum-scale=1" },
        { name:"apple-mobile-web-app-capable", content:"yes" },
        { name:"apple-mobile-web-app-status-bar-style", content:"default" },
        { name:"theme-color", content:"#fafafa" },
        { name:"referrer", content:"origin" },

        { rel: "icon", type: "image/png", href: "/static/favicon/favicon-16x16.png", sizes: "16x16" },
        { rel:"icon", type:"image/png", href:"/static/favicon/favicon-32x32.png", sizes:"32x32" },
        { rel:"icon", type:"image/png", href:"/static/favicon/favicon-96x96.png", sizes:"96x96" },
        { rel:"apple-touch-icon", href:"/static/favicon/favicon-128x128.png" },
        { rel:"stylesheet", href:"https://fonts.googleapis.com/css?family=Alice|Playfair+Display" },
        { rel:"stylesheet", href:"https://fonts.googleapis.com/icon?family=Material+Icons" },
    ],
    scripts: [
        // Promise polyfill for older browsers, needed for axios
        { src: "https://cdn.jsdelivr.net/npm/es6-promise@4.2.5/dist/es6-promise.auto.min.js" },
        // Axios, our http library
        { src: "https://cdn.jsdelivr.net/npm/axios@0.18.0/dist/axios.min.js" },
        // coolstory.js, which gives us fun random titles for stories
        { src: "https://cdn.jsdelivr.net/npm/coolstory.js@0.1.2/coolstory.js" },
        // jQuery is required for Spectrum, but please do not use it for other things
        { src: "https://cdn.jsdelivr.net/npm/jquery@3.3.1/dist/jquery.min.js" },
        // Spectrum is a colorpicker. It also happens to include the tinycolor library
        { src: "https://cdn.jsdelivr.net/gh/bgrins/spectrum@1.8.0/spectrum.js" },
    ],
    styles: [
        // Internal styles
        { style: "/static/rp.css" },
        // Spectrum.js styles
        { style: "https://cdn.jsdelivr.net/gh/bgrins/spectrum@1.8.0/spectrum.css" },
    ]
};
