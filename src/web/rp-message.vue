<template>
  <div>
    <input v-model="content">
    {{ content }}
  </div>
</template>
  
<script>
  module.exports = {
    props: ['content'],
    data: function() {
      return {
      }
    }
  }
</script>
  