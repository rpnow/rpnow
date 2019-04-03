import Vue from 'vue'
import Router from 'vue-router'

import Home from './pages/home.vue'
import Format from './pages/format.vue'
import Import from './pages/import.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/import',
      name: 'import',
      component: Import
    },
    {
      path: '/format',
      name: 'format',
      component: Format
    },
    {
      path: '/rp/:rpCode',
      name: 'chat',
      component: () => import(/* webpackChunkName: "chat" */ './pages/rp-chat.vue')
    },
    {
      path: '/read/:readCode',
      name: 'archive',
      component: () => import(/* webpackChunkName: "archive" */ './pages/rp-read-index.vue')
    },
    {
      path: '/read/:readCode/page/:page',
      name: 'page',
      component: () => import(/* webpackChunkName: "archive" */ './pages/rp-read-page.vue')
    },
  ]
})
