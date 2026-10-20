<script setup>
// Campos da loja (link da Steam, WhatsApp e endereço), usados no cadastro e no painel, onde a
// loja é criada. `form` é o objeto reativo do formulário e é preenchido aqui mesmo. O erro de um
// campo aparece logo abaixo dele (`problem.field`).
const props = defineProps({
  form: { type: Object, required: true },
  problem: { type: Object, default: null },
})

const host = useSiteUrl().replace(/^https?:\/\//, '')
const at = (field) => (props.problem?.field === field ? props.problem : null)
const invalid = (field) => (at(field) ? 'true' : undefined)
</script>

<template>
  <label class="field">
    <span class="field-label">Link do perfil Steam</span>
    <input
      v-model="form.steam"
      class="input"
      required
      inputmode="url"
      autocomplete="url"
      spellcheck="false"
      placeholder="steamcommunity.com/id/seunome"
      :aria-invalid="invalid('steam')"
      :aria-describedby="at('steam') ? 'erro-steam' : undefined"
    />
    <span class="field-hint">O inventário precisa estar público.</span>
  </label>
  <FormProblem v-if="at('steam')" id="erro-steam" :problem="problem" />

  <label class="field">
    <span class="field-label">WhatsApp para pedidos</span>
    <input
      v-model="form.whatsapp"
      class="input"
      type="tel"
      required
      inputmode="tel"
      autocomplete="tel"
      placeholder="(48) 99999-9999"
      :aria-invalid="invalid('whatsapp')"
      :aria-describedby="at('whatsapp') ? 'erro-whatsapp' : undefined"
    />
    <span class="field-hint">Os botões de pedir da loja abrem este número.</span>
  </label>
  <FormProblem v-if="at('whatsapp')" id="erro-whatsapp" :problem="problem" />

  <label class="field">
    <span class="field-label">Endereço da loja</span>
    <input
      :value="form.slug"
      class="input"
      required
      autocapitalize="none"
      autocomplete="off"
      spellcheck="false"
      placeholder="sua-loja"
      maxlength="30"
      :aria-invalid="invalid('slug')"
      :aria-describedby="at('slug') ? 'erro-slug' : 'endereco-loja'"
      @input="form.slug = cleanSlug($event.target.value)"
    />
    <span id="endereco-loja" class="field-hint slug-preview">
      Sua loja fica em {{ host }}/<strong>{{ form.slug || 'sua-loja' }}</strong>
    </span>
  </label>
  <FormProblem v-if="at('slug')" id="erro-slug" :problem="problem" />
</template>

<style scoped>
.slug-preview {
  overflow-wrap: anywhere;
}

.slug-preview strong {
  color: var(--text);
  font-weight: 600;
}
</style>
