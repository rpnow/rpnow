import Chat from './pages/rp-chat.js'
// import Archive from './pages/rp-read-index.vue'
// import Page from './pages/rp-read-page.vue'
// import Import from './pages/import.vue'

// TODO maybe it makes sense to not use a router at all,
// and to just get all the functionality onto one page

export default new window.VueRouter({
  routes: [
    {
      path: '/',
      name: 'chat',
      component: Chat
    },
    // {
    //   path: '/import',
    //   name: 'import',
    //   component: Import
    // },
    // {
    //   path: '/pages',
    //   name: 'archive',
    //   component: Archive
    // },
    // {
    //   path: '/pages/:page',
    //   name: 'page',
    //   component: Page
    // },
  ]
})
