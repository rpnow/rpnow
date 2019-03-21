<template>
  <div id="not-found">
    <h1>Page not found: <code>{{ route }}</code></h1>

    <p>Sorry, there's no page at this address. Make sure you've spelled the URL correctly, or <a href="/">return to the dashboard.</a></p>
  </div>
</template>

<script>
  module.exports = {
    data: function() {
      return {
        route: ''
      };
    },
    mounted: function() {
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
