<script setup>
// Campo de senha com botão de mostrar, para conferir o que foi digitado no celular.
// Os atributos (autocomplete, aria-invalid...) vão para o <input>.
defineOptions({ inheritAttrs: false })
const value = defineModel({ type: String, default: '' })
const visible = ref(false)
</script>

<template>
  <div class="password">
    <input v-model="value" v-bind="$attrs" class="input" :type="visible ? 'text' : 'password'" />
    <button
      class="password-toggle"
      type="button"
      :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
      @click="visible = !visible"
    >
      {{ visible ? 'Ocultar' : 'Mostrar' }}
    </button>
  </div>
</template>

<style scoped>
.password {
  position: relative;
}

.password .input {
  padding-right: 5.5rem;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.125rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.75rem;
  border: 0;
  border-radius: var(--radius-s);
  background: transparent;
  color: var(--muted);
  font-size: var(--step--1);
  font-weight: 560;
  cursor: pointer;
  transform: translateY(-50%);
}

.password-toggle:hover {
  color: var(--text);
}
</style>
