import * as store from './store.js';
import Chat from './pages/rp-chat.js'

store.initialize();

new window.Vue(Chat).$mount('#app')
