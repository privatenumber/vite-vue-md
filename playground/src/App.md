# Hello world

```
Code block
```

```vue
<template>
    <div>Vue code block {{ now }}</div>
</template>
```

## Demos
```vue demo
<script setup>
const now = new Date()
</script>

<template>
    <div>Vue code block {{ now }}</div>
</template>

<style scoped>
div {
    color: red;
}
</style>
```

### Demo with multiple dependencies
```vue demo
<script setup>
import Button from 'doc:Button.vue'
import Box from './Box.vue'
</script>

<template>
    <Button>
        Hello world
    </Button>
    <Box />
</template>
```

```vue demo=Button.vue
<template>
    <button>
        <slot />
    </button>
</template>
```
