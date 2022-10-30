<template>
  <div id="not-found">
    <h1>Page not found: <code>{{ route }}</code></h1>

    <p>Sorry, there's no page at this address. Make sure you've spelled the URL correctly, or <router-link to="/">return to the dashboard.</router-link></p>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        route: ''
      };
    },
    mounted() {
      this.route = location.pathname;
    }
  };
</script>

<style>
  #not-found {
    display: flex;
    flex-direction: column;
    height: 100%;
    align-items: center center;
    justify-content: center;
    margin: auto;
    max-width: 400px;
    padding: 10px;
  }
</style>
