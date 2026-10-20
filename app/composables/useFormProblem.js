// Erro de formulário: guarda a mensagem ({ title, body, field }) e leva o foco ao campo marcado,
// que no celular pode estar bem acima do botão. `formEl` vai no ref do <form>.
export function useFormProblem() {
  const problem = ref(null)
  const formEl = ref(null)

  async function fail(error) {
    problem.value = accountMessage(error)
    await nextTick()
    const field = formEl.value?.querySelector('[aria-invalid="true"]')
    if (field) field.focus()
    else formEl.value?.querySelector('.form-problem')?.scrollIntoView({ block: 'center' })
  }

  return { problem, formEl, fail }
}
