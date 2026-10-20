// A loja de exemplo mudou de /loja/demo para /demo. Links antigos continuam funcionando, com a
// cor e o item (?cor=, ?i=) junto.
export default defineEventHandler((event) => {
  const [path, query] = event.path.split('?')
  if (path.replace(/\/+$/, '') === '/loja/demo') return sendRedirect(event, `/demo${query ? `?${query}` : ''}`, 301)
})
